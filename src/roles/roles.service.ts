import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entity/roles.entity';

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) {}

    async findOne(id: number): Promise<Role | null> {
        return this.roleRepository.findOne({ where: { id } });
    }

    async findByName(name: string): Promise<Role | null> {
        return this.roleRepository.findOne({ where: { name } });
    }

    async create(name: string): Promise<Role>;
    async create(roleData: Partial<Role>): Promise<Role>;
    async create(nameOrRoleData: string | Partial<Role>): Promise<Role> {
        if (typeof nameOrRoleData === 'string') {
            const role = this.roleRepository.create({ name: nameOrRoleData });
            return this.roleRepository.save(role);
        } else {
            const role = this.roleRepository.create(nameOrRoleData);
            return this.roleRepository.save(role);
        }
    }

    async update(id: number, roleData: Partial<Role>): Promise<Role | null> {
        await this.roleRepository.update(id, roleData);
        return this.findOne(id);
    }

    async delete(id: number): Promise<void> {
        await this.roleRepository.delete(id);
    }

    async findAll(): Promise<Role[]> {
        return this.roleRepository.find();
    }

    // Seed initial roles
    async seedRoles(): Promise<void> {
        const existingRoles = await this.findAll();
        
        if (existingRoles.length === 0) {
            await this.create('teacher');
            await this.create('student');
            console.log('Default roles created');
        }
    }
}