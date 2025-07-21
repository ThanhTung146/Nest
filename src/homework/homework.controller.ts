import {
    Controller,
    Post,
    Get,
    Put,
    UseInterceptors,
    UploadedFile,
    Body,
    Request,
    UseGuards,
    Delete,
    Param,
    ParseIntPipe,
    Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createdHomeworksRequest } from './dto/request/homework-request.dto';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { extname } from 'path';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';

@ApiTags('Homeworks')
@Controller('homeworks')
@ApiBearerAuth('JWT-auth')
export class HomeworkController {
    constructor(private readonly homeworksService: HomeworkService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    @ApiOperation({ summary: 'Create a new homework assignment' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Homework data with optional file',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Math Assignment 1' },
                description: { type: 'string', example: 'Complete exercises 1-10' },
                dueDate: { type: 'string', format: 'date-time' },
                studentIds: {
                    type: 'array',
                    items: { type: 'number' },
                    example: [1, 2, 3]
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional homework file'
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Homework created successfully' })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                // Allow documents and images
                if (file.mimetype.match(/\/(pdf|doc|docx|jpg|jpeg|png|txt)$/)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only document files are allowed!'), false);
                }
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    )
    async createHomework(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: createdHomeworksRequest,
        @Request() req,
    ) {
        // Validate studentIds
        if (!body.studentIds || !Array.isArray(body.studentIds) || body.studentIds.length === 0) {
            throw new Error('studentIds must be a non-empty array of numbers');
        }

        // Ensure all studentIds are numbers
        const invalidIds = body.studentIds.filter(id => typeof id !== 'number' || isNaN(id));
        if (invalidIds.length > 0) {
            throw new Error(`Invalid student IDs: ${invalidIds.join(', ')}. All student IDs must be valid numbers.`);
        }

        // Manually parse dueDate to ensure it's a valid date
        try {
            const date = new Date(body.dueDate);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }
        } catch (error) {
            throw new Error(`Invalid due date format: ${body.dueDate}. Please provide a valid date.`);
        }

        const teacherId = req.user.id;
        return this.homeworksService.createHomework(body, file, teacherId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('student')
    @ApiOperation({ summary: 'Get all homework assignments for current student' })
    @ApiResponse({
        status: 200,
        description: 'List of homework assignments for the student',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    status: { type: 'string', enum: ['PENDING', 'SUBMITTED', 'GRADED'] },
                    homework: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            title: { type: 'string' },
                            description: { type: 'string' },
                            dueDate: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    })
    async getHomeworkByStudentId(@Request() req) {
        const studentId = req.user.id;
        return this.homeworksService.getHomeworkByStudentId(studentId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('teacher')
    @ApiOperation({ summary: 'Get all homework assignments created by current teacher' })
    @ApiResponse({
        status: 200,
        description: 'List of homework assignments created by the teacher'
    })
    async getHomeworkByTeacherId(@Request() req) {
        const teacherId = req.user.id;
        return this.homeworksService.getHomeworkByTeacherId(teacherId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a homework assignment' })
    @ApiParam({ name: 'id', description: 'Homework ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Homework deleted successfully' })
    @ApiResponse({ status: 404, description: 'Homework not found or unauthorized' })
    async deleteHomework(@Request() req, @Param('id') id: string) {
        const teacherId = req.user.id;
        const homeworkId = parseInt(id);
        return this.homeworksService.deleteHomework(homeworkId, teacherId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('assignment/:id')
    @ApiOperation({ summary: 'Get homework assignment by ID (Student only)' })
    @ApiParam({ name: 'id', description: 'Assignment ID' })
    @ApiResponse({
        status: 200,
        description: 'Assignment retrieved successfully',
    })
    async getHomeworkAssignmentById(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const studentId = req.user.id;
        return this.homeworksService.getHomeworkAssignmentById(id, studentId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get homework with assignments (Teacher only)' })
    @ApiParam({ name: 'id', description: 'Homework ID' })
    @ApiResponse({
        status: 200,
        description: 'Homework retrieved successfully',
    })
    async getHomeworkWithAssignments(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const teacherId = req.user.id;
        return this.homeworksService.getHomeworkWithAssignments(id, teacherId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assignment/:id/submit')
    @ApiOperation({ summary: 'Submit homework assignment (Student only)' })
    @ApiParam({ name: 'id', description: 'Assignment ID' })
    @ApiResponse({
        status: 200,
        description: 'Assignment submitted successfully',
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                // Allow documents and images
                if (file.mimetype.match(/\/(pdf|doc|docx|jpg|jpeg|png|txt)$/)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only document files are allowed!'), false);
                }
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    )
    async submitHomework(
        @Param('id', ParseIntPipe) id: number,
        @Body() submissionData: any,
        @Request() req,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const studentId = req.user.id;
        return this.homeworksService.submitHomework(id, studentId, submissionData, file);
    }

    @UseGuards(JwtAuthGuard)
    @Post('submit/:id')
    @ApiOperation({ summary: 'Submit homework assignment (Student only) - Alternative endpoint' })
    @ApiParam({ name: 'id', description: 'Assignment ID' })
    @ApiResponse({
        status: 200,
        description: 'Assignment submitted successfully',
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                // Allow documents and images
                if (file.mimetype.match(/\/(pdf|doc|docx|jpg|jpeg|png|txt)$/)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only document files are allowed!'), false);
                }
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    )
    async submitHomeworkAlt(
        @Param('id', ParseIntPipe) id: number,
        @Body() submissionData: any,
        @Request() req,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const studentId = req.user.id;
        return this.homeworksService.submitHomework(id, studentId, submissionData, file);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assignment/:id/grade')
    @ApiOperation({ summary: 'Grade homework assignment (Teacher only)' })
    @ApiParam({ name: 'id', description: 'Assignment ID' })
    @ApiResponse({
        status: 200,
        description: 'Assignment graded successfully',
    })
    async gradeHomework(
        @Param('id', ParseIntPipe) id: number,
        @Body() gradeData: { grade: string; feedback?: string },
        @Request() req
    ) {
        const teacherId = req.user.id;
        return this.homeworksService.gradeHomework(id, teacherId, gradeData);
    }

    @UseGuards(JwtAuthGuard)
    @Put('assignment/:id/review')
    @ApiOperation({ summary: 'Review and grade homework assignment (Teacher only)' })
    @ApiParam({ name: 'id', description: 'Assignment ID' })
    @ApiResponse({
        status: 200,
        description: 'Assignment reviewed successfully',
    })
    async reviewHomework(
        @Param('id', ParseIntPipe) id: number,
        @Body() reviewData: { 
            grade?: string; 
            feedback: string; 
            status: 'graded' | 'pending' 
        },
        @Request() req
    ) {
        const teacherId = req.user.id;
        return this.homeworksService.reviewHomework(id, teacherId, reviewData);
    }
}