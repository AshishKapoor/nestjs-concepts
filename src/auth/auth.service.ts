import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';

// Never ship the password hash to clients.
type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Dev convenience: seed one ADMIN so the @Roles(ADMIN) endpoint is reachable
  // out of the box. Controlled by ADMIN_EMAIL/ADMIN_PASSWORD; skipped if the
  // account already exists. A real app would NOT seed admins like this.
  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    const exists = await this.users.findOne({ where: { email } });
    if (!exists) {
      await this.users.save(
        this.users.create({
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: UserRole.ADMIN,
        }),
      );
    }
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException('Email already registered');
    }
    // bcrypt salts + hashes; 10 rounds is a sane default cost.
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({ email: dto.email, passwordHash }),
    );
    return this.toSafe(user);
  }

  // Returns the signed token. Throws 401 on bad credentials — and deliberately
  // gives the SAME message whether the email or the password was wrong, so an
  // attacker can't probe which emails exist.
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // The payload becomes the JWT claims. `sub` (subject) is the conventional
    // home for the user id. Keep it small — it travels on every request.
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  private toSafe(user: User): SafeUser {
    const safe: Partial<User> = { ...user };
    delete safe.passwordHash;
    return safe as SafeUser;
  }
}
