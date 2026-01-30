import jwt from 'jsonwebtoken';
import { type TokenPayload, type AuthConfig, defaultAuthConfig } from './types.js';

export class TokenManager {
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...defaultAuthConfig, ...config };
  }

  generate(userId: string, username: string): { token: string; expiresAt: Date } {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      username,
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });

    // Calculate expiration date
    const expiresInMs = this.parseExpiresIn(this.config.jwtExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    return { token, expiresAt };
  }

  validate(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.config.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || multipliers.d);
  }
}
