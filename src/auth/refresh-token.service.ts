import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entity/user.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
    constructor(
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    // Tạo refresh token
    async createRefreshToken(
        userId: number, 
        deviceInfo?: string, 
        ipAddress?: string
    ): Promise<RefreshToken> {
        // Xóa các refresh token cũ của user trên cùng device (nếu có)
        if (deviceInfo) {
            await this.revokeTokensByDevice(userId, deviceInfo);
        }

        // Tạo token string
        const tokenString = this.generateRefreshTokenString();
        
        // Tính thời gian hết hạn (30 ngày)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const refreshToken = this.refreshTokenRepository.create({
            token: tokenString,
            userId,
            expiresAt,
            deviceInfo: deviceInfo || 'Unknown Device',
            ipAddress: ipAddress || 'Unknown IP',
            isRevoked: false,
        });

        return this.refreshTokenRepository.save(refreshToken);
    }

    // Validate và lấy thông tin từ refresh token
    async validateRefreshToken(tokenString: string): Promise<RefreshToken> {
        const refreshToken = await this.refreshTokenRepository.findOne({
            where: { token: tokenString },
            relations: ['user', 'user.role'],
        });

        if (!refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (refreshToken.isRevoked) {
            throw new UnauthorizedException('Refresh token has been revoked');
        }

        if (refreshToken.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token has expired');
        }

        // Cập nhật last used
        refreshToken.lastUsedAt = new Date();
        await this.refreshTokenRepository.save(refreshToken);

        return refreshToken;
    }

    // Tạo access token mới từ refresh token
    async refreshAccessToken(refreshTokenString: string): Promise<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    }> {
        const refreshToken = await this.validateRefreshToken(refreshTokenString);
        const user = refreshToken.user;

        // Tạo access token mới
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role?.name,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '30m', // Access token ngắn hạn
        });

        // Tạo refresh token mới (rotation)
        const newRefreshToken = await this.createRefreshToken(
            user.id,
            refreshToken.deviceInfo,
            refreshToken.ipAddress
        );

        // Revoke refresh token cũ
        await this.revokeToken(refreshToken.id);

        return {
            access_token: accessToken,
            refresh_token: newRefreshToken.token,
            token_type: 'Bearer',
            expires_in: 1800, // 30 minutes in seconds
        };
    }

    // Revoke một refresh token
    async revokeToken(tokenId: number): Promise<void> {
        await this.refreshTokenRepository.update(tokenId, {
            isRevoked: true,
        });
    }

    // Revoke refresh token bằng token string
    async revokeTokenByString(tokenString: string): Promise<void> {
        const refreshToken = await this.refreshTokenRepository.findOne({
            where: { token: tokenString },
        });

        if (refreshToken) {
            await this.revokeToken(refreshToken.id);
        }
    }

    // Revoke tất cả refresh tokens của user
    async revokeAllUserTokens(userId: number): Promise<void> {
        await this.refreshTokenRepository.update(
            { userId, isRevoked: false },
            { isRevoked: true }
        );
    }

    // Revoke tokens theo device
    async revokeTokensByDevice(userId: number, deviceInfo: string): Promise<void> {
        await this.refreshTokenRepository.update(
            { userId, deviceInfo, isRevoked: false },
            { isRevoked: true }
        );
    }

    // Cleanup expired tokens
    async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
        const result = await this.refreshTokenRepository.delete({
            expiresAt: LessThan(new Date()),
        });

        return { deletedCount: result.affected || 0 };
    }

    // Lấy danh sách active tokens của user
    async getUserActiveTokens(userId: number): Promise<RefreshToken[]> {
        return this.refreshTokenRepository.find({
            where: {
                userId,
                isRevoked: false,
                expiresAt: MoreThan(new Date()), // Chưa hết hạn
            },
            order: { createdAt: 'DESC' },
        });
    }

    // Generate random refresh token string
    private generateRefreshTokenString(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    // Get device info from request
    getDeviceInfo(userAgent?: string): string {
        if (!userAgent) return 'Unknown Device';
        
        // Simple device detection
        if (userAgent.includes('Mobile')) return 'Mobile Device';
        if (userAgent.includes('Tablet')) return 'Tablet';
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Mac')) return 'Mac';
        if (userAgent.includes('Linux')) return 'Linux PC';
        
        return 'Unknown Device';
    }
}
