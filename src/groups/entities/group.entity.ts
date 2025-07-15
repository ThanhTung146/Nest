import { Lesson } from "src/lessons/entities/lesson.entity";
import { User } from "src/users/entity/user.entity";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Group {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(() => User, user => user.groups)
    @JoinTable()
    students: User[];

    @ManyToOne(() => User, user => user.teachingGroups)
    teacher: User;

    @OneToMany(() => Lesson, (lesson) => lesson.group)
    lessons: Lesson[];
}