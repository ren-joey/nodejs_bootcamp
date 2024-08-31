import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

@Entity()
@Unique(['email'])
export class User {
@PrimaryGeneratedColumn()
    id!: number;

@Column()
    name!: string;

@Column()
    email!: string;

@Column()
    password!: string;

@Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
})
    role!: UserRole;
}
