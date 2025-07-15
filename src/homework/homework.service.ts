import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Homework } from './entities/homework.entity';
import { Repository, In, Between } from 'typeorm';
import { createdHomeworksRequest } from './dto/request/homework-request.dto';
import { HomeworkAssignment, HomeworkStatus } from './entities/homework-assigment.entity';
import { User } from 'src/users/entity/user.entity';
import { FirebaseService } from 'src/notifications/notification.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class HomeworkService {
    constructor(
        @InjectRepository(Homework) private homeworkRepo: Repository<Homework>,
        @InjectRepository(HomeworkAssignment) private assignmentRepo: Repository<HomeworkAssignment>,
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly notificationService: FirebaseService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async notifyGroup(studentIds: number[], title: string, content: string) {
        console.log('🔔 NotifyGroup called with:', {
            studentIds,
            studentCount: studentIds?.length || 0,
            title,
            content: content.substring(0, 50) + '...'
        });

        if (!studentIds || studentIds.length === 0) {
            console.warn('⚠️ No students to notify');
            return { success: false, message: 'No students provided' };
        }

        try {
            console.log('📱 Fetching students with device tokens...');
            
            // Tìm danh sách sinh viên dựa trên ID
            const students = await this.userRepository.find({
                where: { id: In(studentIds) },
                relations: ['deviceTokens'],
            });

            console.log('👥 Students found:', students.map(s => ({
                id: s.id,
                name: s.name,
                email: s.email,
                deviceTokenCount: s.deviceTokens?.length || 0
            })));

            // Lấy tất cả deviceTokens của các sinh viên
            const deviceTokens = students
                .map(student => student.deviceTokens || [])
                .flat()
                .map(tokenEntity => tokenEntity.token)
                .filter(token => token && token.trim() !== '');

            console.log('🎯 Device tokens extracted:', {
                totalTokens: deviceTokens.length,
                tokenPreviews: deviceTokens.map(token => token.substring(0, 20) + '...')
            });

            if (deviceTokens.length === 0) {
                console.warn('⚠️ No device tokens found for students');
                console.log('💡 Students need to register device tokens using POST /device-token/register');
                return { 
                    success: false, 
                    message: 'No device tokens found',
                    studentsFound: students.length,
                    studentsRequested: studentIds.length
                };
            }

            console.log(`📤 Sending notification to ${students.length} students with ${deviceTokens.length} tokens`);

            const response = await this.notificationService.sendNotificationToToken(deviceTokens, title, content);
            
            console.log('✅ Firebase notification response:', {
                successCount: response?.successCount || 0,
                failureCount: response?.failureCount || 0,
                responseCount: response?.responses?.length || 0
            });

            return {
                success: true,
                response,
                studentsNotified: students.length,
                tokensUsed: deviceTokens.length
            };

        } catch (error) {
            console.error('❌ Error sending notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createHomework(dto: createdHomeworksRequest, file: Express.Multer.File | null, teacherId: number) {
        console.log('Received DTO:', JSON.stringify(dto));
        console.log('Student IDs:', dto.studentIds);
        console.log('Due Date:', dto.dueDate);

        // Ensure dueDate is valid
        let dueDate: Date;
        try {
            // Parse the ISO date string
            dueDate = new Date(dto.dueDate);
            
            // Validate the date
            if (isNaN(dueDate.getTime())) {
                throw new Error('Invalid date value');
            }
            
            console.log('Parsed due date:', dueDate);
        } catch (error) {
            console.error('Error parsing due date:', error, dto.dueDate);
            throw new Error(`Invalid due date format: ${dto.dueDate}. Please provide a valid ISO date string.`);
        }

        // Validate studentIds
        if (!dto.studentIds || !Array.isArray(dto.studentIds) || dto.studentIds.length === 0) {
            throw new Error('At least one student must be assigned to the homework');
        }

        // Ensure all studentIds are numbers
        const studentIds = dto.studentIds.map(id =>
            typeof id === 'string' ? parseInt(id) : id
        ).filter(id => !isNaN(id));

        if (studentIds.length === 0) {
            throw new Error('No valid student IDs provided');
        }

        // Verify students exist
        const students = await this.userRepository.find({
            where: { id: In(studentIds) }
        });

        if (students.length !== studentIds.length) {
            throw new Error('Some students not found');
        }

        // Upload file to Cloudinary if provided
        let fileUrl: string | null = null;
        if (file) {
            try {
                console.log('Uploading file to Cloudinary:', {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                });
                
                const uploadResult = await this.cloudinaryService.uploadFile(
                    file,
                    'homeworks'
                );
                fileUrl = uploadResult.fileUrl;
                
                console.log('File uploaded successfully:', {
                    fileUrl: uploadResult.fileUrl,
                    filePath: uploadResult.filePath,
                    fileSize: uploadResult.fileSize
                });
            } catch (error) {
                console.error('Failed to upload homework file:', error);
                console.error('File details:', {
                    filename: file?.originalname,
                    mimetype: file?.mimetype,
                    size: file?.size
                });
                throw new Error(`Failed to upload homework file to cloud storage: ${error.message}`);
            }
        }
        // Tạo homework
        const homework = this.homeworkRepo.create({
            title: dto.title,
            description: dto.description,
            dueDate: dueDate, // Sử dụng dueDate đã được xác thực
            fileUrl: fileUrl || undefined,
            createdBy: { id: teacherId } as User,
        });

        // Lưu homework
        const savedHomework = await this.homeworkRepo.save(homework);

        // Tạo các assignment cho từng sinh viên
        const assignments = studentIds.map((studentId) =>
            this.assignmentRepo.create({
                homework: savedHomework,
                student: { id: studentId } as User,
                status: HomeworkStatus.PENDING,
            }),
        );

        // Lưu assignments
        await this.assignmentRepo.save(assignments);

        // Gửi thông báo cho sinh viên sau khi đã tạo assignments
        if (studentIds && studentIds.length > 0) {
            console.log('🔔 Starting notification process...');
            try {
                const notificationResult = await this.notifyGroup(
                    studentIds,
                    `New Homework Assigned: ${homework.title}`,
                    `Teacher has assigned a homework for you: ${homework.description.substring(0, 50)}...`
                );
                
                console.log('📱 Notification result:', notificationResult);
                
                if (notificationResult?.success) {
                    console.log(`✅ Notification sent successfully to ${studentIds.length} students`);
                } else {
                    console.warn('⚠️ Notification failed or partially failed:', notificationResult?.message);
                }
            } catch (error) {
                console.error('❌ Failed to send notifications:', error);
                // Don't throw - homework creation should succeed even if notification fails
            }
        } else {
            console.warn('⚠️ No students to notify');
        }

        return savedHomework;
    }

    async getHomeworkByStudentId(studentId: number) {
        return this.assignmentRepo.find({
            where: { student: { id: studentId } },
            relations: ['homework', 'homework.createdBy'],
        });
    }

    async getHomeworkByTeacherId(teacherId: number) {
        try {
            const homeworks = await this.homeworkRepo.find({
                where: { createdBy: { id: teacherId } },
                relations: ['createdBy'],
                order: { createdAt: 'DESC' },
            });
            return homeworks || [];
        } catch (error) {
            console.error('Error finding homeworks by teacher ID:', error);
            return [];
        }
    }

    async deleteHomework(homeworkId: number, teacherId: number) {
        try {
            // First verify the homework belongs to this teacher
            const homework = await this.homeworkRepo.findOne({
                where: { id: homeworkId, createdBy: { id: teacherId } },
            });

            if (!homework) {
                throw new Error('Homework not found or unauthorized');
            }

            // Delete related assignments first
            await this.assignmentRepo.delete({ homework: { id: homeworkId } });

            // Then delete the homework
            await this.homeworkRepo.delete(homeworkId);

            return { message: 'Homework deleted successfully' };
        } catch (error) {
            console.error('Error deleting homework:', error);
            throw error;
        }
    }

    async getHomeworkAssignmentById(assignmentId: number, studentId: number) {
        const assignment = await this.assignmentRepo.findOne({
            where: {
                id: assignmentId,
                student: { id: studentId }
            },
            relations: ['homework', 'homework.createdBy', 'student'],
        });

        if (!assignment) {
            throw new Error('Homework assignment not found');
        }

        return assignment;
    }

    async getHomeworkWithAssignments(homeworkId: number, teacherId: number) {
        const homework = await this.homeworkRepo.findOne({
            where: {
                id: homeworkId,
                createdBy: { id: teacherId }
            },
            relations: ['createdBy', 'assignments', 'assignments.student'],
        });

        if (!homework) {
            throw new Error('Homework not found');
        }

        return homework;
    }

    async submitHomework(assignmentId: number, studentId: number, submissionData: any, file?: Express.Multer.File) {
        const assignment = await this.assignmentRepo.findOne({
            where: { id: assignmentId, student: { id: studentId } },
            relations: ['homework', 'student'],
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.status === HomeworkStatus.SUBMITTED) {
            throw new Error('Assignment already submitted');
        }

        const homework = assignment.homework;
        if (new Date() > homework.dueDate) {
            throw new Error('Assignment deadline has passed');
        }

        // Handle file upload if provided
        let submitFileUrl: string | null = null;
        if (file) {
            try {
                console.log('Uploading submission file to Cloudinary:', {
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                });
                
                // Upload file directly to Cloudinary
                const uploadResult = await this.cloudinaryService.uploadFile(
                    file,
                    'submissions'
                );
                submitFileUrl = uploadResult.fileUrl;
                
                console.log('Submission file uploaded successfully:', {
                    fileUrl: uploadResult.fileUrl,
                    filePath: uploadResult.filePath
                });
            } catch (error) {
                console.error('Failed to upload submission file:', error);
                console.error('File details:', {
                    filename: file?.originalname,
                    mimetype: file?.mimetype,
                    size: file?.size
                });
                throw new Error(`Failed to upload submission file to cloud storage: ${error.message}`);
            }
        }

        // Update assignment with submission
        assignment.status = HomeworkStatus.SUBMITTED;
        assignment.submittedAt = new Date();
        assignment.submissionText = submissionData.submissionText;
        if (submitFileUrl) {
            assignment.submitFileUrl = submitFileUrl;
        }

        await this.assignmentRepo.save(assignment);

        return {
            message: 'Homework submitted successfully',
            assignment,
        };
    }

    async gradeHomework(assignmentId: number, teacherId: number, gradeData: { grade: string; feedback?: string }) {
        const assignment = await this.assignmentRepo.findOne({
            where: { id: assignmentId },
            relations: ['homework', 'homework.createdBy', 'student'],
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.homework.createdBy.id !== teacherId) {
            throw new Error('You do not have permission to grade this assignment');
        }

        assignment.grade = gradeData.grade;
        if (gradeData.feedback) {
            assignment.feedback = gradeData.feedback;
        }
        assignment.gradedAt = new Date();
        assignment.status = HomeworkStatus.GRADED;

        await this.assignmentRepo.save(assignment);

        return {
            message: 'Assignment graded successfully',
            assignment,
        };
    }
}
