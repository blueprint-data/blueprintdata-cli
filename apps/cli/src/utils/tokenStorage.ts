import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface StoredToken {
  token: string;
  userId: string;
  username: string;
  expiresAt: string;
}

const AUTH_DIR = join(homedir(), '.blueprintdata');
const AUTH_FILE = join(AUTH_DIR, 'auth.json');

export class TokenStorage {
  static save(tokenData: StoredToken): void {
    // Ensure directory exists
    if (!existsSync(AUTH_DIR)) {
      const { mkdirSync } = require('fs');
      mkdirSync(AUTH_DIR, { recursive: true });
    }

    // Write file with restricted permissions (owner read/write only)
    writeFileSync(AUTH_FILE, JSON.stringify(tokenData, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });

    // Double-check permissions
    try {
      chmodSync(AUTH_FILE, 0o600);
    } catch {
      // Ignore permission errors on Windows
    }
  }

  static load(): StoredToken | null {
    if (!existsSync(AUTH_FILE)) {
      return null;
    }

    try {
      const content = readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(content) as StoredToken;
    } catch {
      return null;
    }
  }

  static clear(): void {
    if (existsSync(AUTH_FILE)) {
      const { unlinkSync } = require('fs');
      unlinkSync(AUTH_FILE);
    }
  }

  static isExpired(): boolean {
    const token = this.load();
    if (!token) return true;

    const expiresAt = new Date(token.expiresAt);
    return expiresAt <= new Date();
  }

  static getToken(): string | null {
    const token = this.load();
    if (!token || this.isExpired()) return null;
    return token.token;
  }

  static getUserId(): string | null {
    const token = this.load();
    return token?.userId || null;
  }

  static getUsername(): string | null {
    const token = this.load();
    return token?.username || null;
  }
}
