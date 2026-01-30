import { spawn } from 'child_process';
import { createDatabase, type Database } from '@blueprintdata/database';
import { GatewayServer } from '@blueprintdata/gateway';
import { logger } from '../../utils/logger';
import path from 'path';
import os from 'os';

interface ChatServiceConfig {
  uiPort: number;
  gatewayPort: number;
  noOpen: boolean;
}

export class ChatService {
  private config: ChatServiceConfig;
  private gateway?: GatewayServer;
  private uiProcess?: ReturnType<typeof spawn>;
  private database?: Database;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting BlueprintData Analytics Chat...');

      // 1. Check initialization
      await this.checkInitialization();

      // 2. Initialize database
      await this.initializeDatabase();

      // 3. Start gateway server
      await this.startGateway();

      // 4. Start UI server
      await this.startUI();

      // 5. Open browser (unless --no-open)
      if (!this.config.noOpen) {
        this.openBrowser();
      }

      logger.info(`Chat interface running at http://localhost:${this.config.uiPort}`);
      logger.info(`Gateway running at ws://localhost:${this.config.gatewayPort}`);
      logger.info('Press Ctrl+C to stop');

      // Handle graceful shutdown
      this.setupShutdownHandlers();
    } catch (error) {
      logger.error('Failed to start chat service: ' + error);
      throw error;
    }
  }

  private async checkInitialization(): Promise<void> {
    const configPath = path.join(process.cwd(), '.blueprintdata', 'config.json');
    const fs = await import('fs');

    if (!fs.existsSync(configPath)) {
      throw new Error(
        'BlueprintData not initialized. Please run "blueprintdata analytics init" first.'
      );
    }
  }

  private async initializeDatabase(): Promise<void> {
    logger.info('Initializing database...');

    const dbPath = path.join(process.cwd(), '.blueprintdata', 'analytics.db');
    this.database = createDatabase({ dbPath });

    // Run migrations
    const { migrate } = await import('drizzle-orm/libsql/migrator');
    const migrationsFolder = path.join(process.cwd(), '.blueprintdata', 'migrations');

    // Create migrations folder if it doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(migrationsFolder)) {
      fs.mkdirSync(migrationsFolder, { recursive: true });
    }

    if (this.database) {
      await migrate(this.database, { migrationsFolder });
    }
    logger.info('Database initialized');
  }

  private async startGateway(): Promise<void> {
    logger.info('Starting gateway server...');

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    this.gateway = new GatewayServer({
      port: this.config.gatewayPort,
      jwtSecret,
      database: this.database,
    });

    await this.gateway.start();
  }

  private async startUI(): Promise<void> {
    logger.info('Starting UI server...');

    // Start the web app using vinxi
    this.uiProcess = spawn('npx', ['vinxi', 'dev', '--port', String(this.config.uiPort)], {
      cwd: path.join(__dirname, '..', '..', '..', '..', 'web'),
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_GATEWAY_URL: `ws://localhost:${this.config.gatewayPort}`,
        PORT: String(this.config.uiPort),
      },
    });

    return new Promise((resolve, reject) => {
      if (!this.uiProcess) {
        reject(new Error('UI process not started'));
        return;
      }

      // Give the UI server a moment to start
      setTimeout(resolve, 3000);

      this.uiProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private openBrowser(): void {
    const url = `http://localhost:${this.config.uiPort}`;

    let command: string;
    switch (os.platform()) {
      case 'darwin':
        command = 'open';
        break;
      case 'win32':
        command = 'start';
        break;
      default:
        command = 'xdg-open';
    }

    spawn(command, [url], { detached: true, stdio: 'ignore' });
    logger.info(`Opened browser at ${url}`);
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      logger.info('\nShutting down...');

      if (this.uiProcess) {
        this.uiProcess.kill();
      }

      if (this.gateway) {
        await this.gateway.stop();
      }

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
