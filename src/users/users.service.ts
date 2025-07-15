import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { Role } from 'src/roles/entity/roles.entity';

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: Role;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(userData: CreateUserData): Promise<User> {
        const user = this.userRepository.create(userData);
        return this.userRepository.save(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email },
            relations: ['role']
        });
    }

    async findOne(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
            relations: ['role']
        });
    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find({ relations: ['role'] });
    }

    async update(id: number, userData: Partial<User>): Promise<User | null> {
        await this.userRepository.update(id, userData);
        return this.findOne(id);
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }
}