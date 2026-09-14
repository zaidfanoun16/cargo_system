import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  // Primary key generated automatically by PostgreSQL.
  @PrimaryGeneratedColumn()
  id: number;

  // User's full name.
  @Column({ length: 100 })
  fullName: string;

  // Email is unique because it will be used for login.
  @Column({ unique: true, length: 150 })
  email: string;

  // Store only the hashed password, never the plain password.
  @Column()
  passwordHash: string;

  // Role will be used later for authorization.
  @Column({ default: 'USER' })
  role: string;

  // Automatically stores when the user was created.
  @CreateDateColumn()
  createdAt: Date;

  // Automatically updates when the user is modified.
  @UpdateDateColumn()
  updatedAt: Date;
}