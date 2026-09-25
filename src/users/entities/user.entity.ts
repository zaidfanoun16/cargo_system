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

  // Email verification status.
  @Column({ default: false })
  isEmailVerified: boolean;

  // SHA-256 hash of the 6-digit code sent to verify the user's email.
  @Column({ type: 'text', nullable: true })
  emailVerificationToken: string | null;

  // Wrong verification code attempts since the last code was sent.
  @Column({ default: 0 })
  emailVerificationAttempts: number;

  // Expiration time for the email verification token.
  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiresAt: Date | null;

  // Store only the hashed password, never the plain password.
  @Column()
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

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