import bcrypt from 'bcryptjs';
import type { FastifyError } from 'fastify';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppConfig } from '../config/AppConfig';
import { UserRepository } from '../repositories/UserRepository';
import type { JwtUserPayload, UserRecord } from '../types/domain';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

export class AuthService {
  public constructor(
    private readonly config: AppConfig,
    private readonly users: UserRepository,
  ) {}

  public signToken(user: UserRecord): string {
    const options: SignOptions = {
      expiresIn: this.config.jwtExpiresIn as SignOptions['expiresIn'],
    };

    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      this.config.jwtSecret,
      options,
    );
  }

  public verifyToken(token: string): JwtUserPayload {
    return jwt.verify(token, this.config.jwtSecret) as JwtUserPayload;
  }

  public async register(emailInput: string, passwordInput: string, nameInput: string): Promise<{ token: string; user: UserRecord }> {
    const email = String(emailInput || '').trim().toLowerCase();
    const password = String(passwordInput || '').trim();
    const name = String(nameInput || '').trim();

    if (!email || !password || !name) {
      throw createHttpError(400, 'กรุณากรอกอีเมล รหัสผ่าน และชื่อ');
    }

    if (password.length < 8) {
      throw createHttpError(400, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    }

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw createHttpError(409, 'อีเมลนี้ถูกใช้งานแล้ว');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create(email, passwordHash, name);

    return {
      token: this.signToken(user),
      user,
    };
  }

  public async login(emailInput: string, passwordInput: string): Promise<{ token: string; user: UserRecord }> {
    const email = String(emailInput || '').trim().toLowerCase();
    const password = String(passwordInput || '').trim();

    if (!email || !password) {
      throw createHttpError(400, 'กรุณากรอกอีเมลและรหัสผ่าน');
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw createHttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw createHttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    return {
      token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  public async getCurrentUser(userId: string): Promise<UserRecord> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw createHttpError(404, 'ไม่พบผู้ใช้งาน');
    }

    return user;
  }
}
