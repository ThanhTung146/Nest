import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import * as bcrypt from 'bcrypt';
import { RolesService } from 'src/roles/roles.service';
import { LoginDto, RegisterDto } from './dto/request/auth-request.dto';
import { RoleEnum } from '@common/enums/role.enum'

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly roleService: RolesService,
        private readonly jwtService: JwtService,
        private readonly refreshTokenService: RefreshTokenService,
    ) { }

    async register(registerDto: RegisterDto, roles?: string) {
        if (!registerDto.email || !registerDto.password) {
            throw new Error('Email and password are required');
        }

        const existingUser = await this.usersService.findByEmail(registerDto.email);

        if (existingUser) {
            throw new Error('User already exists');
        }
        if (!roles) {
            roles = RoleEnum.STUDENT; // Default role is 'student'
        }
        // Tìm role 
        const role = await this.roleService.findByName(roles);

        if (!role) {
            throw new Error('Role not found');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const newUser = await this.usersService.create({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            role: role,
        });

        // Trả về user info (không trả password)
        const { password, ...userWithoutPassword } = newUser;
        return {
            message: 'User registered successfully',
            user: userWithoutPassword
        };
    }

    async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role?.name
        };

        // Tạo access token (ngắn hạn)
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '30m', // 30 phút
        });

        // Tạo refresh token (dài hạn)
        const refreshToken = await this.refreshTokenService.createRefreshToken(
            user.id,
            deviceInfo,
            ipAddress
        );

        const { password, ...userWithoutPassword } = user;

        return {
            access_token: accessToken,
            refresh_token: refreshToken.token,
            token_type: 'Bearer',
            expires_in: 1800, // 30 minutes in seconds
            user: userWithoutPassword
        };
    }

    async validateUser(userId: number) {
        return this.usersService.findOne(userId);
    }

    // Refresh access token
    async refreshToken(refreshTokenString: string) {
        return this.refreshTokenService.refreshAccessToken(refreshTokenString);
    }

    // Logout (revoke refresh token)
    async logout(refreshTokenString: string): Promise<{ message: string }> {
        await this.refreshTokenService.revokeTokenByString(refreshTokenString);
        return { message: 'Logged out successfully' };
    }

    // Logout from all devices
    async logoutAll(userId: number): Promise<{ message: string }> {
        await this.refreshTokenService.revokeAllUserTokens(userId);
        return { message: 'Logged out from all devices successfully' };
    }

    // Get user's active sessions
    async getActiveSessions(userId: number) {
        const tokens = await this.refreshTokenService.getUserActiveTokens(userId);
        return tokens.map(token => ({
            id: token.id,
            deviceInfo: token.deviceInfo,
            ipAddress: token.ipAddress,
            createdAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
        }));
    }

    // Revoke specific session
    async revokeSession(tokenId: number): Promise<{ message: string }> {
        await this.refreshTokenService.revokeToken(tokenId);
        return { message: 'Session revoked successfully' };
    }
}