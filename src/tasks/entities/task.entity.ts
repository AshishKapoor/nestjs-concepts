import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// An "entity" is the shape of your domain object. Now that we have a real
// database, these TypeORM decorators ALSO describe the table: each one is read
// at startup to map a class property to a column. The same class is both your
// TypeScript type and your schema definition.
export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

// @Entity('tasks') => this class is backed by a table named "tasks".
@Entity('tasks')
export class Task {
  // Auto-incrementing integer primary key (Postgres SERIAL / IDENTITY).
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // nullable:true => the column can be NULL, matching the optional `?` type.
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Store the enum as a real Postgres ENUM type. `default` is applied by the DB
  // when the column is omitted on INSERT.
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status: TaskStatus;

  // @CreateDateColumn is set automatically by TypeORM on insert — we never
  // assign it ourselves.
  @CreateDateColumn()
  createdAt: Date;
}
