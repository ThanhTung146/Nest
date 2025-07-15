import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { HomeworkAssignment } from './homework-assigment.entity';

@Entity()
export class Homework {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    fileUrl: string;

    @Column()
    dueDate: Date;

    @ManyToOne(() => User, (user) => user.createdHomeworks)
    createdBy: User;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => HomeworkAssignment, (assignment) => assignment.homework)
    assignments: HomeworkAssignment[];
}
