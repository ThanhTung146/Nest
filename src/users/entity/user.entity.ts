import { DeviceToken } from 'src/device-token/entities/device-token.entity';
import { Group } from 'src/groups/entities/group.entity';
import { Homework } from 'src/homework/entities/homework.entity';
import { Lesson } from 'src/lessons/entities/lesson.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, ManyToMany } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column() // ❌ THIẾU COLUMN NAME
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @ManyToOne(() => Role, (role) => role.users, { eager: false, nullable: false }) // ❌ SỬA eager: false
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @OneToMany(() => Group, (group) => group.teacher)
    teachingGroups: Group[];

    @ManyToMany(() => Group, (group) => group.students)
    groups: Group[];

    @OneToMany(() => Lesson, (lesson) => lesson.creator, { eager: false }) // ❌ SỬA eager: false
    createdLessons: Lesson[];

    @OneToMany(() => DeviceToken, (dt) => dt.user)
    deviceTokens: DeviceToken[];

    @OneToMany(() => Homework, (homework) => homework.createdBy)
    createdHomeworks: Homework[];

}
