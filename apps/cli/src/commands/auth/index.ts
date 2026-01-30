import { Command } from 'commander';
import * as p from '@clack/prompts';
import { createDatabase, ensureDatabaseDirectory } from '@blueprintdata/database';
import { AuthService } from '@blueprintdata/auth';
import { TokenStorage } from '../../utils/tokenStorage.js';
import { resolve } from 'path';

const DB_PATH = '.blueprintdata/analytics.db';

const getAuthService = async () => {
  const dbPath = resolve(DB_PATH);
  ensureDatabaseDirectory(dbPath);
  const db = createDatabase({ dbPath });
  return new AuthService(db);
};

export const authCommand = new Command('auth').description(
  'Authentication commands for BlueprintData Analytics'
);

// Register command
authCommand
  .command('register')
  .description('Register a new user')
  .action(async () => {
    p.intro('Create a new account');

    const authService = await getAuthService();

    // Check if a user already exists
    const hasUsers = await authService.userExists();
    if (hasUsers) {
      p.log.warn('A user already exists. Use `auth login` instead.');
      return;
    }

    const username = await p.text({
      message: 'Choose a username:',
      validate: (value) => {
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 20) return 'Username must be less than 20 characters';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'Username can only contain letters, numbers, underscores, and hyphens';
        }
        return undefined;
      },
    });

    if (p.isCancel(username)) {
      p.cancel('Registration cancelled');
      return;
    }

    const password = await p.password({
      message: 'Create a password:',
      mask: '*',
      validate: (value) => {
        if (value.length < 8) return 'Password must be at least 8 characters';
        return undefined;
      },
    });

    if (p.isCancel(password)) {
      p.cancel('Registration cancelled');
      return;
    }

    const confirmPassword = await p.password({
      message: 'Confirm your password:',
      mask: '*',
    });

    if (p.isCancel(confirmPassword)) {
      p.cancel('Registration cancelled');
      return;
    }

    if (password !== confirmPassword) {
      p.log.error('Passwords do not match');
      return;
    }

    const spinner = p.spinner();
    spinner.start('Creating your account...');

    const result = await authService.register({
      username: username as string,
      password: password as string,
    });

    if (result.success && result.token) {
      TokenStorage.save({
        token: result.token,
        userId: result.userId!,
        username: username as string,
        expiresAt: result.expiresAt!.toISOString(),
      });

      spinner.stop('Account created successfully!');
      p.log.success(`Welcome, ${username}! You are now logged in.`);
    } else {
      spinner.stop('Registration failed');
      p.log.error(result.error || 'Unknown error');
    }
  });

// Login command
authCommand
  .command('login')
  .description('Log in to your account')
  .action(async () => {
    p.intro('Log in to BlueprintData Analytics');

    const authService = await getAuthService();

    const username = await p.text({
      message: 'Username:',
    });

    if (p.isCancel(username)) {
      p.cancel('Login cancelled');
      return;
    }

    const password = await p.password({
      message: 'Password:',
      mask: '*',
    });

    if (p.isCancel(password)) {
      p.cancel('Login cancelled');
      return;
    }

    const spinner = p.spinner();
    spinner.start('Logging in...');

    const result = await authService.login({
      username: username as string,
      password: password as string,
    });

    if (result.success && result.token) {
      TokenStorage.save({
        token: result.token,
        userId: result.userId!,
        username: username as string,
        expiresAt: result.expiresAt!.toISOString(),
      });

      spinner.stop('Logged in successfully!');
      p.log.success(`Welcome back, ${username}!`);
    } else {
      spinner.stop('Login failed');
      p.log.error(result.error || 'Invalid credentials');
    }
  });

// Logout command
authCommand
  .command('logout')
  .description('Log out of your account')
  .action(async () => {
    const username = TokenStorage.getUsername();

    if (!username) {
      p.log.warn('You are not logged in');
      return;
    }

    const confirm = await p.confirm({
      message: `Log out ${username}?`,
    });

    if (confirm) {
      TokenStorage.clear();
      p.log.success('Logged out successfully');
    } else {
      p.log.info('Logout cancelled');
    }
  });

// Status command
authCommand
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    p.intro('Authentication Status');

    const token = TokenStorage.load();

    if (!token) {
      p.log.warn('Not authenticated');
      p.log.info('Run `blueprintdata auth login` to log in');
      return;
    }

    const authService = await getAuthService();
    const isValid = authService.validateToken(token.token);

    if (!isValid) {
      p.log.error('Session expired');
      p.log.info('Run `blueprintdata auth login` to log in again');
      return;
    }

    const expiresAt = new Date(token.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    p.log.success(`Authenticated as: ${token.username}`);
    p.log.info(`User ID: ${token.userId}`);
    p.log.info(`Session expires: ${expiresAt.toLocaleDateString()} (${daysUntilExpiry} days)`);
  });
