import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { Repository, In } from 'typeorm';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group) private readonly groupRepository: Repository<Group>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) { }

    async createGroup(name: string, teacherId: number, studentsId: number[]) {
        const teacher = await this.userRepository.findOne({ where: { id: teacherId } });
        if (!teacher) {
            throw new Error('Teacher not found');
        }

        const students = await this.userRepository.find({
            where: { id: In(studentsId) }
        });

        const group = this.groupRepository.create({
            name,
            teacher,
            students,
        });

        return this.groupRepository.save(group);
    }

    async findAllGroups() {
        return this.groupRepository.find({ relations: ['teacher', 'students'] });
    }

    async findGroupByteacherId(teacherId: number) {
        try {
            const groups = await this.groupRepository.find({
                where: { teacher: { id: teacherId } },
                relations: ['teacher', 'students', 'lessons', 'lessons.creator'],
            });
            return groups || [];
        } catch (error) {
            console.error('Error finding groups by teacher ID:', error);
            return [];
        }
    }

    async findGroupByStudentId(studentId: number) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: studentId },
                relations: ['groups'],
            });
            
            if (!user?.groups || user.groups.length === 0) {
                return [];
            }
            
            const groupIds = user.groups.map(group => group.id);
            const groups = await this.groupRepository.find({
                where: { id: In(groupIds) },
                relations: ['teacher', 'students', 'lessons', 'lessons.creator'],
            });
            
            return groups || [];
        } catch (error) {
            console.error('Error finding groups by student ID:', error);
            return [];
        }
    }

    async findGroupById(groupId: number) {
        try {
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['teacher', 'students', 'lessons'],
            });
            
            if (!group) {
                throw new Error('Group not found');
            }
            
            return group;
        } catch (error) {
            console.error('Error finding group by ID:', error);
            throw error;
        }
    }
}
