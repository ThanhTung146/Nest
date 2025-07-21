import { Body, Controller, Post, Request, UseGuards, Get, Param, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/request/auth-request.dto';
import { RefreshTokenDto, LogoutDto } from './dto/request/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            type: 'object',
            properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                token_type: { type: 'string' },
                expires_in: { type: 'number' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                name: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() loginDto: LoginDto,
        @Headers('user-agent') userAgent?: string,
        @Request() req?: any
    ) {
        const ipAddress = req?.ip || req?.connection?.remoteAddress;
        const deviceInfo = userAgent ? this.getDeviceInfo(userAgent) : 'Unknown Device';
        
        return this.authService.login(loginDto, deviceInfo, ipAddress);
    }

    @Post('register')
    @ApiOperation({ summary: 'User registration' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async register(@Body() registerDto: RegisterDto) {
        const role = 'student'; // Default role is 'student'
        return this.authService.register(registerDto, role);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            type: 'object',
            properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
                token_type: { type: 'string' },
                expires_in: { type: 'number' },
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refresh_token);
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout (revoke refresh token)' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Body() logoutDto: LogoutDto) {
        return this.authService.logout(logoutDto.refresh_token);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from all devices' })
    @ApiResponse({ status: 200, description: 'Logged out from all devices successfully' })
    async logoutAll(@Request() req) {
        return this.authService.logoutAll(req.user.userId);
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get active sessions' })
    @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully' })
    async getActiveSessions(@Request() req) {
        return this.authService.getActiveSessions(req.user.userId);
    }

    @Post('sessions/:tokenId/revoke')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke specific session' })
    @ApiResponse({ status: 200, description: 'Session revoked successfully' })
    async revokeSession(@Param('tokenId') tokenId: number) {
        return this.authService.revokeSession(tokenId);
    }

    // Helper method for device detection
    private getDeviceInfo(userAgent: string): string {
        if (!userAgent) return 'Unknown Device';
        
        if (userAgent.includes('Mobile')) return 'Mobile Device';
        if (userAgent.includes('Tablet')) return 'Tablet';
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Mac')) return 'Mac';
        if (userAgent.includes('Linux')) return 'Linux PC';
        
        return 'Unknown Device';
    }
}