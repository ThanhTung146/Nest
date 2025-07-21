import { DeviceToken } from 'src/device-token/entities/device-token.entity';
import { Group } from 'src/groups/entities/group.entity';
import { Homework } from 'src/homework/entities/homework.entity';
import { Lesson } from 'src/lessons/entities/lesson.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { NotificationRecipient } from 'src/notifications/entities/notification-recipient.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, ManyToMany } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @ManyToOne(() => Role, (role) => role.users, { eager: false, nullable: false }) 
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @OneToMany(() => Group, (group) => group.teacher)
    teachingGroups: Group[];

    @ManyToMany(() => Group, (group) => group.students)
    groups: Group[];

    @OneToMany(() => Lesson, (lesson) => lesson.creator, { eager: false }) 
    createdLessons: Lesson[];

    @OneToMany(() => DeviceToken, (dt) => dt.user)
    deviceTokens: DeviceToken[];

    @OneToMany(() => Homework, (homework) => homework.createdBy)
    createdHomeworks: Homework[];

    @OneToMany(() => NotificationRecipient, (recipient) => recipient.user)
    notificationRecipients: NotificationRecipient[];

    @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
    refreshTokens: RefreshToken[];
}
