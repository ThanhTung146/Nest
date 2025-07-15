import { Body, Controller, Get, Post, Req, UseGuards, Param } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/roles/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber } from 'class-validator';

class CreateGroupDto {
    @ApiProperty({
        description: 'Group name',
        example: 'Lớp Toán 12A1'
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Array of student IDs',
        example: [2, 3, 4],
        type: [Number]
    })
    @IsArray()
    @IsNumber({}, { each: true })
    studentsId: number[];
}

@ApiTags('Groups')
@Controller('groups')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new group (Teacher only)' })
    @ApiResponse({ status: 201, description: 'Group created successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - Teacher role required' })
    @Roles('teacher')
    createGroup(@Body() createGroupDto: CreateGroupDto, @Req() req) {
        const teacherId = req.user?.id;
        return this.groupsService.createGroup(
            createGroupDto.name,
            teacherId,
            createGroupDto.studentsId
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get all groups' })
    @ApiResponse({ status: 200, description: 'List of all groups' })
    findAllGroups() {
        return this.groupsService.findAllGroups();
    }

    @Post('teacher')
    @ApiOperation({ summary: 'Get groups by teacher ID' })
    @ApiResponse({ status: 200, description: 'List of groups for the teacher' })
    async findGroupByTeacherId(@Body() body: { teacherId?: number }, @Req() req) {
        try {
            const teacherId = body.teacherId || req.user?.id;
            if (!teacherId) {
                return { error: 'Teacher ID is required' };
            }
            const groups = await this.groupsService.findGroupByteacherId(teacherId);
            return groups || [];
        } catch (error) {
            console.error('Error finding groups by teacher ID:', error);
            return [];
        }
    }

    @Post('student')
    @ApiOperation({ summary: 'Get group by student ID' })
    @ApiResponse({ status: 200, description: 'Group for the student' })
    async findGroupByStudentId(@Body() body: { studentId?: number }, @Req() req) {
        try {
            const studentId = body.studentId || req.user?.id;
            if (!studentId) {
                return { error: 'Student ID is required' };
            }
            const groups = await this.groupsService.findGroupByStudentId(studentId);
            return groups || [];
        } catch (error) {
            console.error('Error finding groups by student ID:', error);
            return [];
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get group by ID with detailed information' })
    @ApiResponse({ status: 200, description: 'Group details with lessons' })
    async findGroupById(@Param('id') id: string) {
        try {
            const groupId = parseInt(id);
            if (isNaN(groupId)) {
                return { error: 'Invalid group ID' };
            }
            const group = await this.groupsService.findGroupById(groupId);
            return group;
        } catch (error) {
            console.error('Error finding group by ID:', error);
            return { error: 'Group not found' };
        }
    }
}