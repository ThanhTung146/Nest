import { EntityRepository, Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';

@EntityRepository(DeviceToken)
export class DeviceTokenRepository extends Repository<DeviceToken> {

    // Hàm sử dụng QueryBuilder để lấy token của một số người dùng
    async getTokensByUserIds(userIds: number[]): Promise<string[]> {
        const tokens = await this.createQueryBuilder('dt') // 'dt' là alias cho DeviceToken
            .leftJoin('dt.user', 'user')  // Kết nối với bảng User qua quan hệ
            .where('user.id IN (:...userIds)', { userIds })  // Lọc theo userIds
            .getMany();

        return tokens.map((dt) => dt.token);  // Trả về mảng các token
    }
}
