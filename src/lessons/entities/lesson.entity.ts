import { Group } from "src/groups/entities/group.entity";
import { User } from "src/users/entity/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Lesson {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    content: string;

    @Column({ nullable: true })
    videoUrl: string;

    @Column({ nullable: true })
    videoPath: string;

    @Column({ nullable: true })
    videoSize: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Group, (group) => group.lessons)
    group: Group | null;

    @ManyToOne(() => User, (user) => user.id)
    creator: User | null;
}