import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { Group } from 'src/groups/entities/group.entity';
import { CreateLessonRequest } from './dto/request/lesson-request.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/entities/notification.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class LessonsService {
    constructor(
        @InjectRepository(Lesson) private lessonRepository: Repository<Lesson>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Group) private groupRepository: Repository<Group>,
        private readonly notifyService: NotificationsService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async createLesson(lessonData: CreateLessonRequest, teacherId: number) {
        const group = await this.groupRepository.findOne({ where: { id: lessonData.groupId } });
        const teacher = await this.userRepository.findOne({ where: { id: teacherId } });

        const lesson = this.lessonRepository.create({
            name: lessonData.name,
            content: lessonData.content,
            group: group,
            creator: teacher,
        });

        const savedLesson = await this.lessonRepository.save(lesson);

        if (lesson.group) {
            await this.notifyGroup(
                lesson.group.id,
                `New Lesson Added: ${lesson.name}`,
                `Teacher has created a lesson for ${lesson.group.name}`
            );
        }
        return savedLesson;
    }
    async uploadVideo(lessonId: number, file: Express.Multer.File, teacherId: number) {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['group', 'creator', 'group.students'],
        });

        if (!lesson) {
            throw new Error('Lesson not found');
        }

        if (lesson.creator && lesson.creator.id !== teacherId) {
            throw new Error('You do not have permission to upload video for this lesson');
        }

        // Delete old video if exists
        if (lesson.videoPath) {
            await this.cloudinaryService.deleteVideo(lesson.videoPath);
        }

        // Upload video to S3
        const videoData = await this.cloudinaryService.uploadVideo(file);

        // Update lesson with video details
        lesson.videoUrl = videoData.videoUrl;
        lesson.videoSize = videoData.videoSize;
        lesson.videoPath = videoData.videoPath;

        const updatedLesson = await this.lessonRepository.save(lesson);

        if (lesson.group) {
            await this.notifyGroup(
                lesson.group.id,
                `New Video Added: ${lesson.name}`,
                `Teacher has uploaded a video for ${lesson.name}`
            );
        }

        return updatedLesson;
    }

    async removeVideo(lessonId: number, teacherId: number) {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['creator'],
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        if (!lesson.creator || lesson.creator.id !== teacherId) {
            throw new Error('You can only remove video from your own lessons');
        }

        if (!lesson.videoUrl) {
            throw new Error('No video to remove');
        }

        // Remove video from cloudinary if exists
        if (lesson.videoUrl && this.cloudinaryService) {
            try {
                // Extract public_id from cloudinary URL to delete
                const urlParts = lesson.videoUrl.split('/');
                const fileWithExtension = urlParts[urlParts.length - 1];
                const publicId = fileWithExtension.split('.')[0];
                await this.cloudinaryService.deleteVideo(publicId);
            } catch (error) {
                console.error('Error deleting video from cloudinary:', error);
            }
        }

        // Clear video fields
        delete lesson.videoUrl;
        delete lesson.videoSize;

        const updatedLesson = await this.lessonRepository.save(lesson);

        return {
            message: 'Video removed successfully',
            lesson: updatedLesson
        };
    }

    async notifyGroup(groupId: number, title: string, content: string) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['students']
        })

        if (!group) {
            throw new Error('Group not found');
        }

        if (!group.students || group.students.length === 0) {
            return { success: false, message: 'No students in group' };
        }

        const studentIds = group.students.map(student => student.id);

        try {
            // Use NotificationsService to create and send notifications
            // This will BOTH save to database AND send FCM
            const results = await this.notifyService.createAndSendToMultiple(
                studentIds,
                {
                    type: NotificationType.LESSON_CREATED,
                    title,
                    body: content,
                    data: {
                        type: 'lesson',
                        groupId,
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
            console.error('Error in lesson notifyGroup:', error);
            throw error;
        }
    }

    async getLessonWithVideo(lessonId: number, userId: number) {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['group', 'group.students', 'creator'],
        });

        if (!lesson) {
            throw new Error('Lesson not found');
        }

        const isCreator = lesson.creator && lesson.creator.id === userId;
        const isStudent = lesson.group && lesson.group.students.some(student => student.id === userId);

        if (!isCreator && !isStudent) {
            throw new Error('You do not have permission to access this lesson');
        }

        return lesson;
    }

    async getAllLessonsByTeacher(teacherId: number, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [lessons, total] = await this.lessonRepository.findAndCount({
            where: { creator: { id: teacherId } },
            relations: ['group', 'creator'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data: lessons,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        };
    }

    async getLessonById(id: number, userId: number) {
        const lesson = await this.lessonRepository.findOne({
            where: { id },
            relations: ['group', 'creator'],
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        return lesson;
    }

    async deleteLesson(lessonId: number, teacherId: number) {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['creator'],
        });

        if (!lesson) {
            throw new Error('Lesson not found');
        }

        if (!lesson.creator || lesson.creator.id !== teacherId) {
            throw new Error('You do not have permission to delete this lesson');
        }

        // Delete video from cloud storage if exists
        if (lesson.videoPath) {
            await this.cloudinaryService.deleteVideo(lesson.videoPath);
        }

        await this.lessonRepository.remove(lesson);
        return { message: 'Lesson deleted successfully' };
    }

    async findAllLessons() {
        return this.lessonRepository.find({
            relations: ['group', 'creator'],
            select: ['id', 'name', 'content', 'videoSize', 'createdAt']
        });
    }

    async getRecentLessonsByTeacher(teacherId: number, limit: number = 5) {
        const lessons = await this.lessonRepository.find({
            where: { creator: { id: teacherId } },
            relations: ['group', 'creator'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return lessons;
    }
}
