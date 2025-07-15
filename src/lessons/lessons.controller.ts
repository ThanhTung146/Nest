import {
    Body,
    Controller,
    Param,
    Post,
    Get,
    Delete,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/roles/decorator/roles.decorator';
import { LessonsService } from './lessons.service';
import { CreateLessonRequest } from './dto/request/lesson-request.dto';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';

@ApiTags('Lessons')
@Controller('lessons')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class LessonsController {
    constructor(
        private readonly lessonsService: LessonsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new lesson (Teacher only)' })
    @ApiResponse({
        status: 201,
        description: 'Lesson created successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                content: { type: 'string' },
                videoUrl: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Teacher role required' })
    @Roles('teacher')
    createLesson(@Body() lessonRequest: CreateLessonRequest, @Req() req) {
        const teacherId = req.user?.id;
        return this.lessonsService.createLesson(lessonRequest, teacherId);
    }

    @Post(':id/upload-video')
    @ApiOperation({ summary: 'Upload video for a lesson (Teacher only)' })
    @ApiConsumes('multipart/form-data')
    @ApiParam({ name: 'id', description: 'Lesson ID', type: 'number' })
    @ApiBody({
        description: 'Video file to upload',
        schema: {
            type: 'object',
            properties: {
                video: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file (MP4, AVI, MOV, etc.)'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Video uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                videoUrl: { type: 'string' },
                videoPath: { type: 'string' },
                videoDuration: { type: 'number' },
                videoSize: { type: 'number' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad request - Invalid file format' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    @UseInterceptors(FileInterceptor('video', {
        fileFilter: (req, file, cb) => {
            if (file.mimetype.match(/\/(mp4|avi|mov|wmv|flv|webm|mkv)$/)) {
                cb(null, true);
            } else {
                cb(new Error('Only video files are allowed!'), false);
            }
        },
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB limit
        },
    }))
    @Roles('teacher')
    async uploadVideo(
        @Param('id', ParseIntPipe) lessonId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req
    ) {
        if (!file) {
            throw new Error('Video file is required');
        }

        const teacherId = req.user?.id;
        return this.lessonsService.uploadVideo(lessonId, file, teacherId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get lesson details with video access' })
    @ApiParam({ name: 'id', description: 'Lesson ID', type: 'number' })
    @ApiResponse({
        status: 200,
        description: 'Lesson details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                content: { type: 'string' },
                videoUrl: { type: 'string' },
                videoDuration: { type: 'number' },
                creator: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Access denied to this lesson' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async getLesson(@Param('id', ParseIntPipe) lessonId: number, @Req() req) {
        const userId = req.user?.id;
        return this.lessonsService.getLessonWithVideo(lessonId, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all lessons by teacher' })
    @ApiResponse({
        status: 200,
        description: 'Lessons retrieved successfully',
    })
    async getAllLessonsByTeacher(@Req() req, @Query('page') page = 1, @Query('limit') limit = 10) {
        const teacherId = req.user.id;
        return this.lessonsService.getAllLessonsByTeacher(teacherId, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get lesson by ID' })
    @ApiParam({ name: 'id', description: 'Lesson ID' })
    @ApiResponse({
        status: 200,
        description: 'Lesson retrieved successfully',
    })
    async getLessonById(@Param('id', ParseIntPipe) id: number, @Req() req) {
        const userId = req.user.id;
        return this.lessonsService.getLessonById(id, userId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete lesson by ID (Teacher only)' })
    @ApiParam({ name: 'id', description: 'Lesson ID' })
    @ApiResponse({
        status: 200,
        description: 'Lesson deleted successfully',
    })
    async deleteLesson(@Param('id', ParseIntPipe) id: number, @Req() req) {
        const teacherId = req.user.id;
        return this.lessonsService.deleteLesson(id, teacherId);
    }

    @Post('teacher-recent')
    @ApiOperation({ summary: 'Get recent lessons created by teacher' })
    @ApiResponse({
        status: 200,
        description: 'Recent lessons retrieved successfully',
    })
    async getRecentLessonsByTeacher(@Req() req) {
        const teacherId = req.user.id;
        return this.lessonsService.getRecentLessonsByTeacher(teacherId, 5);
    }
}