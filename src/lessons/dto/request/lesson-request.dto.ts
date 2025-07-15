import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateLessonRequest {
    @ApiProperty({
        description: 'Name of the lesson',
        example: 'Bài 1: Đạo hàm cơ bản'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Content of the lesson',
        required: false,
        example: 'Nội dung chi tiết về đạo hàm và các ứng dụng'
    })
    @IsString()
    @IsOptional()
    content: string;

    @ApiProperty({
        description: 'ID of the group',
        example: 1
    })
    @IsNumber()
    @IsNotEmpty()
    groupId: number;
}

export class UpdateLessonVideoRequest {
    @ApiProperty({
        description: 'Video URL from cloud storage',
        example: 'https://res.cloudinary.com/demo/video/upload/sample.mp4'
    })
    videoUrl: string;

    @ApiProperty({
        description: 'Video path',
        example: 'lessons/videos/sample'
    })
    videoPath: string;

    @ApiProperty({
        description: 'Video size in bytes',
        required: false,
        example: 5242880
    })
    videoSize?: number;
}