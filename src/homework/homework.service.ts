import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Homework } from './entities/homework.entity';
import { Repository, In, Between } from 'typeorm';
import { createdHomeworksRequest } from './dto/request/homework-request.dto';
import { HomeworkAssignment, HomeworkStatus } from './entities/homework-assigment.entity';
import { User } from 'src/users/entity/user.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/entities/notification.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class HomeworkService {
    constructor(
        @InjectRepository(Homework) private homeworkRepo: Repository<Homework>,
        @InjectRepository(HomeworkAssignment) private assignmentRepo: Repository<HomeworkAssignment>,
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly notificationService: NotificationsService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async notifyGroup(studentIds: number[], title: string, content: string) {
        if (!studentIds || studentIds.length === 0) {
            console.warn('⚠️ No students to notify');
            return { success: false, message: 'No students provided' };
        }

        try {
            // Use NotificationsService to create and send notifications
            const results = await this.notificationService.createAndSendToMultiple(
                studentIds,
                {
                    type: NotificationType.HOMEWORK_ASSIGNED,
                    title,
                    body: content,
                    data: {
                        type: 'homework',
                        timestamp: new Date().toISOString()
                    }
                }
            );

            return {
                success: true,
                notificationsCreated: results.recipients.length,
                results: results.recipients
            };

        } catch (error) {
            console.error('Error in notifyGroup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createHomework(dto: createdHomeworksRequest, file: Express.Multer.File | null, teacherId: number) {
        // Ensure dueDate is valid
        let dueDate: Date;
        try {
            // Parse the ISO date string
            dueDate = new Date(dto.dueDate);

            // Validate the date
            if (isNaN(dueDate.getTime())) {
                throw new Error('Invalid date value');
            }
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
                const uploadResult = await this.cloudinaryService.uploadFile(
                    file,
                    'homeworks'
                );
                fileUrl = uploadResult.fileUrl;

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
        // Create homework
        const homework = this.homeworkRepo.create({
            title: dto.title,
            description: dto.description,
            dueDate: dueDate,
            fileUrl: fileUrl || undefined,
            createdBy: { id: teacherId } as User,
        });

        // Save homework
        const savedHomework = await this.homeworkRepo.save(homework);

        // Create assignments for each student
        const assignments = studentIds.map((studentId) =>
            this.assignmentRepo.create({
                homework: savedHomework,
                student: { id: studentId } as User,
                status: HomeworkStatus.PENDING,
            }),
        );

        // Save assignments
        await this.assignmentRepo.save(assignments);

        // Send notifications to students
        if (studentIds && studentIds.length > 0) {
            try {
                const notificationResult = await this.notifyGroup(
                    studentIds,
                    `New Homework Assigned: ${homework.title}`,
                    `Teacher has assigned a homework for you: ${homework.description.substring(0, 50)}...`
                );

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
                // Upload file directly to Cloudinary
                const uploadResult = await this.cloudinaryService.uploadFile(
                    file,
                    'submissions'
                );
                submitFileUrl = uploadResult.fileUrl;

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

    async reviewHomework(
        assignmentId: number, 
        teacherId: number, 
        reviewData: { 
            grade?: string; 
            feedback: string; 
            status: 'graded' | 'pending' 
        }
    ) {
        const assignment = await this.assignmentRepo.findOne({
            where: { id: assignmentId },
            relations: ['homework', 'homework.createdBy', 'student'],
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.homework.createdBy.id !== teacherId) {
            throw new Error('You do not have permission to review this assignment');
        }

        // Update assignment based on review decision
        assignment.feedback = reviewData.feedback;
        
        if (reviewData.status === 'graded') {
            // Approved - set grade and mark as graded
            if (reviewData.grade) {
                assignment.grade = reviewData.grade;
            }
            assignment.status = HomeworkStatus.GRADED;
            assignment.gradedAt = new Date();
            
            // Send notification to student
            try {
                await this.notificationService.createAndSend({
                    userId: assignment.student.id,
                    type: NotificationType.HOMEWORK_GRADED,
                    title: 'Homework Graded ✅',
                    body: `Your submission for "${assignment.homework.title}" has been graded: ${reviewData.grade}`,
                    data: {
                        type: 'homework',
                        homeworkId: assignment.homework.id.toString(),
                        assignmentId: assignment.id.toString(),
                        grade: reviewData.grade,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (notificationError) {
                console.error('Failed to send grade notification:', notificationError);
                // Continue with the process even if notification fails
            }
        } else {
            // Needs revision - set back to pending
            assignment.grade = null as any;
            assignment.status = HomeworkStatus.PENDING;
            assignment.gradedAt = null as any;
            
            // Send notification to student  
            try {
                await this.notificationService.createAndSend({
                    userId: assignment.student.id,
                    type: NotificationType.HOMEWORK_ASSIGNED, // Using assigned type for revision requests
                    title: 'Homework Needs Revision 🔄',
                    body: `Your submission for "${assignment.homework.title}" needs revision. Please check the feedback and resubmit.`,
                    data: {
                        type: 'homework',
                        homeworkId: assignment.homework.id.toString(),
                        assignmentId: assignment.id.toString(),
                        action: 'revision_required',
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (notificationError) {
                console.error('Failed to send revision notification:', notificationError);
                // Continue with the process even if notification fails
            }
        }

        await this.assignmentRepo.save(assignment);

        return {
            message: `Assignment ${reviewData.status === 'graded' ? 'approved and graded' : 'marked for revision'} successfully`,
            assignment: {
                id: assignment.id,
                status: assignment.status,
                grade: assignment.grade,
                feedback: assignment.feedback,
                gradedAt: assignment.gradedAt,
                student: {
                    id: assignment.student.id,
                    name: assignment.student.name,
                    email: assignment.student.email
                }
            }
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
