import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { Homework } from './homework.entity';
import { User } from 'src/users/entity/user.entity';

export enum HomeworkStatus {
    PENDING = 'pending',
    SUBMITTED = 'submitted',
    GRADED = 'graded',
    LATE = 'late',
}

@Entity()
export class HomeworkAssignment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Homework, (homework) => homework.assignments)
    homework: Homework;

    @ManyToOne(() => User)
    student: User;

    @Column({ type: 'enum', enum: HomeworkStatus, default: HomeworkStatus.PENDING })
    status: HomeworkStatus;

    @Column({ nullable: true })
    submitFileUrl: string;

    @Column({ type: 'timestamp', nullable: true })
    submittedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    gradedAt: Date;

    @Column({ nullable: true })
    grade: string;

    @Column({ type: 'text', nullable: true })
    submissionText: string;

    @Column({ nullable: true })
    feedback: string;
}
