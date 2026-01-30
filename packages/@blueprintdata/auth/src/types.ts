export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  expiresAt?: Date;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string; // e.g., '30d'
  bcryptRounds: number;
}

export const defaultAuthConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'blueprintdata-secret-key-change-in-production',
  jwtExpiresIn: '30d',
  bcryptRounds: 10,
};
