import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token to get new access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @IsString()
    @IsNotEmpty()
    refresh_token: string;
}

export class TokenResponseDto {
    @ApiProperty({
        description: 'New access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    access_token: string;

    @ApiProperty({
        description: 'New refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    refresh_token: string;

    @ApiProperty({
        description: 'Token type',
        example: 'Bearer'
    })
    token_type: string;

    @ApiProperty({
        description: 'Access token expiration time in seconds',
        example: 1800
    })
    expires_in: number;
}

export class LogoutDto {
    @ApiProperty({
        description: 'Refresh token to revoke',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @IsString()
    @IsNotEmpty()
    refresh_token: string;
}
