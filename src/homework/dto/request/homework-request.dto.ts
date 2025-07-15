import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsArray, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class createdHomeworksRequest {
    @ApiProperty({
        description: 'Homework title',
        example: 'Math Assignment Chapter 5'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Homework description',
        example: 'Complete exercises 1-20 from chapter 5'
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Due date for homework submission',
        example: '2025-07-15T23:59:59.000Z'
    })
    @Transform(({ value }) => {
        // Ensure we have a valid ISO date string
        if (typeof value === 'string') {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toISOString();
                }
            } catch (e) {
                // Return original value and let validation handle it
            }
        }
        return value;
    })
    @IsDateString()
    dueDate: string; // Changed from Date to string

    @ApiProperty({
        description: 'Array of student IDs to assign homework to',
        example: [1, 2, 3, 4],
        type: [Number]
    })
    @Transform(({ value }) => {
        console.log('Transform studentIds received value:', value, 'type:', typeof value);
        
        // If it's already an array of numbers, return as is
        if (Array.isArray(value) && value.every(v => typeof v === 'number')) {
            return value;
        }
        
        // If it's an array of strings, convert to numbers
        if (Array.isArray(value)) {
            return value.map(v => {
                const num = parseInt(String(v));
                if (isNaN(num)) {
                    throw new Error(`Invalid student ID: ${v}`);
                }
                return num;
            });
        }
        
        // Handle case where value comes as string from form-data
        if (typeof value === 'string') {
            try {
                // First try to parse as JSON (for JSON string like "[1,2,3]")
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map(v => {
                        const num = parseInt(String(v));
                        if (isNaN(num)) {
                            throw new Error(`Invalid student ID: ${v}`);
                        }
                        return num;
                    });
                }
            } catch (e) {
                // If not JSON, split by comma (for string like "1,2,3")
                if (value.includes(',')) {
                    return value.split(',').map(id => {
                        const num = parseInt(id.trim());
                        if (isNaN(num)) {
                            throw new Error(`Invalid student ID: ${id}`);
                        }
                        return num;
                    });
                } else {
                    // Single value
                    const num = parseInt(value.trim());
                    if (isNaN(num)) {
                        throw new Error(`Invalid student ID: ${value}`);
                    }
                    return [num];
                }
            }
        }
        
        return value;
    })
    @IsArray()
    @IsNumber({}, { each: true })
    studentIds: number[];
}