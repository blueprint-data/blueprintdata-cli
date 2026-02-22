import { spawn } from 'child_process';
import { createDatabase, type Database } from '@blueprintdata/database';
import { GatewayServer } from '@blueprintdata/gateway';
import {
  AgentService,
  LLMClient,
  getModelsForProvider,
  validateModel,
  type Message,
} from '@blueprintdata/analytics';
import { createWarehouseConnector, type BaseWarehouseConnector } from '@blueprintdata/warehouse';
import type { LLMProvider } from '@blueprintdata/models';
import { loadConfig } from '../../utils/config.js';
import { logger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';

interface ChatServiceConfig {
  uiPort: number;
  gatewayPort: number;
  noOpen: boolean;
}

export class ChatService {
  private config: ChatServiceConfig;
  private gateway?: GatewayServer;
  private uiServer?: http.Server;
  private database?: Database;
  private warehouse?: BaseWarehouseConnector;
  private agentService?: AgentService;
  private conversationHistory: Map<string, Message[]> = new Map();
  private llmProvider?: LLMProvider;
  private llmModel?: string;

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

      // 3. Initialize agent service
      await this.initializeAgent();

      // 4. Start gateway server
      await this.startGateway();

      // 5. Start UI server
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
    const metaFolder = path.join(migrationsFolder, 'meta');
    const journalPath = path.join(metaFolder, '_journal.json');

    // Create migrations folder if it doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(migrationsFolder)) {
      fs.mkdirSync(migrationsFolder, { recursive: true });
    }

    if (!fs.existsSync(metaFolder)) {
      fs.mkdirSync(metaFolder, { recursive: true });
    }

    if (!fs.existsSync(journalPath)) {
      fs.writeFileSync(journalPath, JSON.stringify({ version: '5', entries: [] }, null, 2));
    }

    if (this.database) {
      await migrate(this.database, { migrationsFolder });
    }
    logger.info('Database initialized');
  }

  private async initializeAgent(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const projectPath = process.cwd();
    const config = await loadConfig(projectPath);
    this.warehouse = await createWarehouseConnector(config.warehouseConnection);
    this.llmProvider = config.llmProvider;
    this.llmModel = config.llmModel;

    const llmClient = new LLMClient(config.llmProvider, config.llmApiKey, config.llmModel);
    const agentContextPath = path.join(projectPath, 'agent-context');
    const systemPromptPath = path.join(agentContextPath, 'system_prompt.md');
    const systemPrompt = fs.existsSync(systemPromptPath)
      ? fs.readFileSync(systemPromptPath, 'utf-8')
      : undefined;

    this.agentService = new AgentService({
      database: this.database,
      warehouse: this.warehouse,
      llmClient,
      agentContextPath,
      systemPrompt,
    });
  }

  private async startGateway(): Promise<void> {
    logger.info('Starting gateway server...');

    if (!this.database) {
      throw new Error('Database not initialized');
    }

    if (!this.agentService) {
      throw new Error('Agent service not initialized');
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    this.gateway = new GatewayServer({
      port: this.config.gatewayPort,
      jwtSecret,
      database: this.database,
      handleModelsRequest: async (payload) => {
        if (!this.llmProvider || !this.llmModel) {
          throw new Error('LLM config not initialized');
        }

        const models = getModelsForProvider(this.llmProvider).map((model) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          contextWindow: model.contextWindow,
          costPer1MInputTokens: model.costPer1MInputTokens,
          costPer1MOutputTokens: model.costPer1MOutputTokens,
          speed: model.speed,
          capabilities: model.capabilities,
          recommended: model.recommended ?? null,
        }));

        return {
          sessionId: payload?.sessionId,
          provider: this.llmProvider,
          defaultModelId: this.llmModel,
          models,
        };
      },
      handleChatMessage: async (payload) => {
        const sessionId = payload.sessionId || 'default';
        const history = this.conversationHistory.get(sessionId) || [];
        const toolMessages: Message[] = [];
        const toolCallById = new Map<
          string,
          { tool: string; arguments: Record<string, unknown> }
        >();
        const modelOverride =
          payload.modelId && this.llmProvider && validateModel(payload.modelId, this.llmProvider)
            ? payload.modelId
            : undefined;
        if (payload.modelId && !modelOverride) {
          logger.warn(`Ignoring invalid model override: ${payload.modelId}`);
        }

        const sendToolCall = (toolCall: {
          tool: string;
          arguments: Record<string, unknown>;
          callId: string;
        }) => {
          this.gateway?.broadcast({
            type: 'tool_call',
            id: toolCall.callId,
            payload: {
              sessionId,
              tool: toolCall.tool,
              arguments: toolCall.arguments,
              callId: toolCall.callId,
            },
            timestamp: new Date().toISOString(),
          });
        };

        const sendToolResult = async (toolResult: {
          callId: string;
          success: boolean;
          result?: unknown;
          error?: string;
        }) => {
          await this.gateway?.broadcastToolResult({
            sessionId,
            callId: toolResult.callId,
            success: toolResult.success,
            result: toolResult.result,
            error: toolResult.error,
          });
        };

        let response: Message;
        try {
          response = await this.agentService!.processMessage(payload.content, history, {
            llmModelOverride: modelOverride,
            onToolCallStart: (event) =>
              (() => {
                toolCallById.set(event.callId, {
                  tool: event.tool,
                  arguments: event.arguments,
                });
                return sendToolCall({
                  tool: event.tool,
                  arguments: event.arguments,
                  callId: event.callId,
                });
              })(),
            onToolResult: (event) => {
              const toolInfo = toolCallById.get(event.callId);
              toolCallById.delete(event.callId);
              if (!event.success) {
                const args = toolInfo?.arguments || {};
                const argsText = Object.keys(args).length > 0 ? JSON.stringify(args) : '';
                const argsLine = argsText ? `\nArguments: ${argsText}` : '';
                toolMessages.push({
                  role: 'system',
                  content: `Tool ${toolInfo?.tool || event.tool} failed.${argsLine}\nError: ${
                    event.error || 'Unknown tool error'
                  }`,
                });
              }
              return sendToolResult({
                callId: event.callId,
                success: event.success,
                result: event.result,
                error: event.error,
              });
            },
          });
        } catch (error) {
          logger.error(
            'Failed to process chat message: ' +
              (error instanceof Error ? error.message : String(error))
          );
          throw error;
        }
        const updatedHistory: Message[] = [
          ...history,
          ...toolMessages,
          { role: 'user', content: payload.content },
          response,
        ];

        this.conversationHistory.set(sessionId, updatedHistory.slice(-20));

        return { content: response.content, role: response.role };
      },
    });

    await this.gateway.start();
  }

  private async startUI(): Promise<void> {
    logger.info('Starting UI server...');

    const webRoot = this.resolveWebRoot();
    if (!webRoot) {
      throw new Error(
        'Web app assets not found. Please run the CLI build after building the web app.'
      );
    }

    this.uiServer = http.createServer((req, res) => {
      const host = req.headers.host || `localhost:${this.config.uiPort}`;
      const requestUrl = new URL(req.url || '/', `http://${host}`);

      if (requestUrl.pathname === '/api/config') {
        const gatewayUrl = `ws://localhost:${this.config.gatewayPort}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ gatewayUrl }));
        return;
      }

      const filePath = this.resolveStaticPath(webRoot, requestUrl.pathname);
      if (!filePath) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      const resolvedPath = fs.existsSync(filePath) ? filePath : path.join(webRoot, 'index.html');

      fs.readFile(resolvedPath, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        res.writeHead(200, { 'Content-Type': this.getContentType(resolvedPath) });
        res.end(data);
      });
    });

    return new Promise((resolve, reject) => {
      if (!this.uiServer) {
        reject(new Error('UI server not started'));
        return;
      }

      this.uiServer.on('error', reject);
      this.uiServer.listen(this.config.uiPort, () => resolve());
    });
  }

  private resolveWebRoot(): string | undefined {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.join(currentDir, 'web'),
      path.join(currentDir, '..', 'web'),
      path.join(currentDir, '..', '..', 'web'),
      path.join(process.cwd(), 'apps', 'web', 'dist'),
      path.join(process.cwd(), 'web', 'dist'),
    ];

    for (const candidate of candidates) {
      const indexPath = path.join(candidate, 'index.html');
      if (fs.existsSync(indexPath)) {
        return candidate;
      }
    }

    return undefined;
  }

  private resolveStaticPath(webRoot: string, requestPath: string): string | undefined {
    const normalizedPath = path.posix.normalize(decodeURIComponent(requestPath));
    const safePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    const fullPath = path.join(webRoot, safePath || 'index.html');
    const resolvedRoot = path.resolve(webRoot) + path.sep;
    const resolvedPath = path.resolve(fullPath);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return undefined;
    }

    return resolvedPath;
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.html':
        return 'text/html; charset=utf-8';
      case '.js':
        return 'application/javascript; charset=utf-8';
      case '.css':
        return 'text/css; charset=utf-8';
      case '.json':
        return 'application/json; charset=utf-8';
      case '.svg':
        return 'image/svg+xml';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.woff':
        return 'font/woff';
      case '.woff2':
        return 'font/woff2';
      default:
        return 'application/octet-stream';
    }
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

      if (this.uiServer) {
        this.uiServer.close();
      }

      if (this.warehouse) {
        await this.warehouse.close();
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
