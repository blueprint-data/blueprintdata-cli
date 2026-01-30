import bcrypt from 'bcrypt';
import { type AuthConfig, defaultAuthConfig } from './types.js';

export class PasswordHasher {
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...defaultAuthConfig, ...config };
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
