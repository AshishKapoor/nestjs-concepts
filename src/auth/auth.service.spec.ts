import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';

// In-memory fake Repository<User> — same approach as tasks.service.spec.ts.
// We use the REAL bcrypt + the real service logic; only the DB and JwtService
// are stand-ins, so register/login hashing + comparison is genuinely exercised.
function createUserRepoMock(): Partial<Repository<User>> {
  const rows: User[] = [];
  let nextId = 1;
  return {
    findOne: jest.fn((opts: { where: { email?: string } }) =>
      Promise.resolve(rows.find((u) => u.email === opts.where.email) ?? null),
    ),
    create: jest.fn(
      (dto: Partial<User>) => ({ role: UserRole.USER, ...dto }) as User,
    ),
    save: jest.fn((u: User) => {
      if (!u.id) {
        u.id = nextId++;
        u.createdAt = new Date();
        rows.push(u);
      }
      return Promise.resolve(u);
    }),
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: createUserRepoMock() },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(() => Promise.resolve('signed-token')),
          },
        },
        // get() returns undefined => onModuleInit's admin seed is skipped.
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();
    service = mod.get(AuthService);
  });

  it('registers a user with default role USER and hides the hash', async () => {
    const user = await service.register({
      email: 'a@b.com',
      password: 'password123',
    });
    expect(user.role).toBe(UserRole.USER);
    expect((user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    await expect(
      service.register({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with the correct password and returns a token', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    const res = await service.login({
      email: 'a@b.com',
      password: 'password123',
    });
    expect(res.accessToken).toBe('signed-token');
  });

  it('rejects a wrong password with 401', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    await expect(
      service.login({ email: 'a@b.com', password: 'nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
