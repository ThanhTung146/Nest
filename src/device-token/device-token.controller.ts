import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DeviceTokenService } from './device-token.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Device Tokens')
@Controller('device-token')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
    constructor(private readonly deviceTokenService: DeviceTokenService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register device token for push notifications' })
    async registerDeviceToken(@Body() body: { token: string }, @Req() req: any) {
        const userId = req.user?.id || req.user?.sub;

        try {
            const result = await this.deviceTokenService.register(userId, body.token);
            return result;
        } catch (error) {
            console.error('❌ DeviceToken registration failed:', error);
            throw error;
        }
    }

    @Get('user/:userId')
    async getUserTokens(@Param('userId') userId: number) {
        const tokens = await this.deviceTokenService.getTokensByUserIds([userId]);
        return tokens;
    }
}
