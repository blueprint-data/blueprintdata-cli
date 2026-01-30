import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { users, type Database } from '@blueprintdata/database';
import { PasswordHasher } from './PasswordHasher.js';
import { TokenManager } from './TokenManager.js';
import {
  type AuthCredentials,
  type AuthResult,
  type AuthConfig,
  defaultAuthConfig,
  type TokenPayload,
} from './types.js';

export class AuthService {
  private db: Database;
  private passwordHasher: PasswordHasher;
  private tokenManager: TokenManager;

  constructor(db: Database, config: Partial<AuthConfig> = {}) {
    this.db = db;
    const mergedConfig = { ...defaultAuthConfig, ...config };
    this.passwordHasher = new PasswordHasher(mergedConfig);
    this.tokenManager = new TokenManager(mergedConfig);
  }

  async register(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.username, credentials.username),
      });

      if (existingUser) {
        return {
          success: false,
          error: 'Username already exists',
        };
      }

      // Hash password
      const passwordHash = await this.passwordHasher.hash(credentials.password);

      // Create user
      const userId = uuidv4();
      await this.db.insert(users).values({
        id: userId,
        username: credentials.username,
        passwordHash,
      });

      // Generate token
      const { token, expiresAt } = this.tokenManager.generate(userId, credentials.username);

      return {
        success: true,
        token,
        userId,
        expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Find user
      const user = await this.db.query.users.findFirst({
        where: eq(users.username, credentials.username),
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Verify password
      const isValid = await this.passwordHasher.verify(credentials.password, user.passwordHash);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Generate token
      const { token, expiresAt } = this.tokenManager.generate(user.id, user.username);

      return {
        success: true,
        token,
        userId: user.id,
        expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  validateToken(token: string): TokenPayload | null {
    return this.tokenManager.validate(token);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Find user
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify old password
      const isValid = await this.passwordHasher.verify(oldPassword, user.passwordHash);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid current password',
        };
      }

      // Hash new password
      const newPasswordHash = await this.passwordHasher.hash(newPassword);

      // Update user
      await this.db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, userId));

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      };
    }
  }

  async getUserById(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async userExists(): Promise<boolean> {
    const user = await this.db.query.users.findFirst();
    return !!user;
  }
}
