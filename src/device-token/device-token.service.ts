import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class DeviceTokenService {
    constructor(
        @InjectRepository(DeviceToken)
        private deviceTokenRepository: Repository<DeviceToken>,
        private readonly userService: UsersService,
    ) { }

    async register(userId: number, token: string): Promise<DeviceToken> {
        const user = await this.userService.findOne(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if this exact token already exists for this user
        let deviceToken = await this.deviceTokenRepository.findOne({
            where: { user: { id: userId }, token }
        });

        if (deviceToken) {
            return deviceToken;
        }

        // Remove any existing tokens for this user to keep only one active token
        const existingTokens = await this.deviceTokenRepository.find({
            where: { user: { id: userId } }
        });

        if (existingTokens.length > 0) {
            await this.deviceTokenRepository.remove(existingTokens);
        }

        // Create new token
        deviceToken = this.deviceTokenRepository.create({ user, token });
        const savedToken = await this.deviceTokenRepository.save(deviceToken);

        return savedToken;
    }

    async getTokensByUserIds(userIds: number[]): Promise<string[]> {
        const tokens = await this.deviceTokenRepository.find({
            where: { user: { id: In(userIds) } },
            relations: ['user']
        });

        return tokens.map(token => token.token);
    }

    async getUserTokens(userId: number): Promise<string[]> {
        const tokens = await this.deviceTokenRepository.find({
            where: { user: { id: userId } },
            relations: ['user']
        });

        return tokens.map(token => token.token);
    }
}
