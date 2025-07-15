import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class DeviceTokenService {
    constructor(
        @InjectRepository(DeviceToken) 
        private deviceTokenRepository: Repository<DeviceToken>, // ❌ SỬA thành Repository<DeviceToken>
        private readonly userService: UsersService,
    ) {}

    async register(userId: number, token: string): Promise<DeviceToken> {
        const user = await this.userService.findOne(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let deviceToken = await this.deviceTokenRepository.findOne({ 
            where: { user: { id: userId }, token } 
        });
        
        if (deviceToken) {
            return deviceToken;
        }

        deviceToken = this.deviceTokenRepository.create({ user, token });
        return this.deviceTokenRepository.save(deviceToken);
    }

    async getTokensByUserIds(userIds: number[]): Promise<string[]> {
        const tokens = await this.deviceTokenRepository.find({
            where: { user: { id: In(userIds) } },
            relations: ['user']
        });
        
        return tokens.map(token => token.token);
    }
}
