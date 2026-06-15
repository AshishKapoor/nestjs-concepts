import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Roles a user can hold. Kept tiny on purpose — real apps often model
// permissions separately, but a role enum is the classic starting point.
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// The User table. Note we store a password *hash*, never the plaintext.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // unique:true => Postgres enforces "one account per email" at the DB level.
  @Column({ unique: true })
  email: string;

  // The bcrypt hash. We never select it into responses (see AuthService.toSafe).
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
