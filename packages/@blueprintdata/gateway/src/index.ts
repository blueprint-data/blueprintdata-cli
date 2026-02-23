import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@blueprintdata/database';
import { renderChartToBase64 } from './chartRenderer.js';

// Message types
export interface WSMessage {
  type:
    | 'chat'
    | 'tool_call'
    | 'tool_result'
    | 'models_request'
    | 'models_response'
    | 'error'
    | 'system'
    | 'pong';
  id: string;
  payload: unknown;
  timestamp: string;
}

export interface ChatHistoryItemPayload {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  content: string;
  modelId?: string;
  history?: ChatHistoryItemPayload[];
}

export interface ModelsRequestPayload {
  sessionId?: string;
}

export interface ModelInfoPayload {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  costPer1MInputTokens?: number;
  costPer1MOutputTokens?: number;
  speed?: string;
  capabilities?: string[];
  recommended?: string | null;
}

export interface ModelsResponsePayload {
  sessionId?: string;
  provider: string;
  defaultModelId: string;
  models: ModelInfoPayload[];
}

export interface ToolCallPayload {
  sessionId?: string;
  tool: string;
  arguments: Record<string, unknown>;
  callId: string;
}

export interface ToolResultPayload {
  sessionId?: string;
  callId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  media?: MediaPayload;
}

export interface MediaPayload {
  mimeType: string;
  data: string;
  name?: string;
}

// Client connection
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  sessionId?: string;
  lastActivity: Date;
}

export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  database: Database;
  maxConnections?: number;
  heartbeatInterval?: number;
  handleChatMessage?: (payload: ChatMessagePayload) => Promise<{ content: string; role?: string }>;
  handleModelsRequest?: (payload: ModelsRequestPayload) => Promise<ModelsResponsePayload>;
}

export class GatewayServer {
  private wss: WebSocketServer;
  private httpServer: Server;
  private clients: Map<string, ClientConnection>;
  private config: GatewayConfig;
  private heartbeatTimer?: NodeJS.Timer;

  constructor(config: GatewayConfig) {
    this.config = {
      maxConnections: 100,
      heartbeatInterval: 30000,
      ...config,
    };
    this.clients = new Map();
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

      this.httpServer.listen(this.config.port, () => {
        console.log(`Gateway server listening on port ${this.config.port}`);
        this.startHeartbeat();
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.stopHeartbeat();

      // Close all client connections
      this.clients.forEach((client) => {
        client.ws.close();
      });
      this.clients.clear();

      this.wss.close(() => {
        this.httpServer.close(() => {
          console.log('Gateway server stopped');
          resolve();
        });
      });
    });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    // Validate JWT from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    // Verify token if present, otherwise allow anonymous access
    let payload: { userId: string; username: string } | null = null;
    if (token) {
      try {
        payload = jwt.verify(token, this.config.jwtSecret) as { userId: string; username: string };
      } catch {
        ws.close(1008, 'Invalid authentication token');
        return;
      }
    }

    // Check max connections
    if (this.clients.size >= (this.config.maxConnections || 100)) {
      ws.close(1013, 'Server capacity exceeded');
      return;
    }

    const clientId = uuidv4();
    const client: ClientConnection = {
      ws,
      userId: payload?.userId || 'local',
      username: payload?.username || 'local',
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);
    console.log(`Client connected: ${client.username} (${clientId})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'system',
      id: uuidv4(),
      payload: { message: 'Connected to BlueprintData Analytics Gateway' },
      timestamp: new Date().toISOString(),
    });

    // Handle messages
    ws.on('message', (data) => this.handleMessage(clientId, data));

    // Handle close
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });
  }

  private handleMessage(clientId: string, data: Buffer | ArrayBuffer | Buffer[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    let message: WSMessage;
    try {
      message = JSON.parse(data.toString()) as WSMessage;
    } catch {
      this.sendToClient(clientId, {
        type: 'error',
        id: uuidv4(),
        payload: { message: 'Invalid JSON format' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle ping/pong
    if (message.type === 'pong') {
      return;
    }

    console.log(`Received ${message.type} message from ${client.username}`);

    if (message.type === 'models_request') {
      const payload = message.payload as ModelsRequestPayload;

      if (!this.config.handleModelsRequest) {
        this.sendToClient(clientId, {
          type: 'error',
          id: uuidv4(),
          payload: { message: 'Model list not available', sessionId: payload?.sessionId },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.config
        .handleModelsRequest(payload)
        .then((response) => {
          this.sendToClient(clientId, {
            type: 'models_response',
            id: message.id,
            payload: response,
            timestamp: new Date().toISOString(),
          });
        })
        .catch((error) => {
          this.sendToClient(clientId, {
            type: 'error',
            id: message.id,
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
              sessionId: payload?.sessionId,
            },
            timestamp: new Date().toISOString(),
          });
        });
      return;
    }

    if (message.type === 'chat') {
      const payload = message.payload as ChatMessagePayload;

      if (this.config.handleChatMessage) {
        this.config
          .handleChatMessage(payload)
          .then((response) => {
            this.sendToClient(clientId, {
              type: 'chat',
              id: message.id,
              payload: {
                sessionId: payload.sessionId,
                content: response.content,
                role: response.role || 'assistant',
              },
              timestamp: new Date().toISOString(),
            });
          })
          .catch((error) => {
            this.sendToClient(clientId, {
              type: 'error',
              id: message.id,
              payload: { message: error instanceof Error ? error.message : 'Unknown error' },
              timestamp: new Date().toISOString(),
            });
          });
        return;
      }

      this.sendToClient(clientId, {
        type: 'chat',
        id: message.id,
        payload: {
          sessionId: payload.sessionId,
          content: `Echo: ${payload.content || 'No content'}`,
          role: 'assistant',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    client.ws.send(JSON.stringify(message));
  }

  broadcast(message: WSMessage, excludeClientId?: string): void {
    this.clients.forEach((client, id) => {
      if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      this.clients.forEach((client, id) => {
        // Check if client is still alive (5 minute timeout)
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        if (timeSinceActivity > 5 * 60 * 1000) {
          console.log(`Closing inactive connection: ${id}`);
          client.ws.close(1000, 'Inactive');
          this.clients.delete(id);
          return;
        }

        // Send ping
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer as NodeJS.Timeout);
    }
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  async broadcastToolResult(payload: ToolResultPayload): Promise<void> {
    const enrichedPayload = await this.attachChartMedia(payload);

    this.broadcast({
      type: 'tool_result',
      id: payload.callId,
      payload: enrichedPayload,
      timestamp: new Date().toISOString(),
    });
  }

  private async attachChartMedia(payload: ToolResultPayload): Promise<ToolResultPayload> {
    if (!payload.success || !payload.result) {
      return payload;
    }

    const chartConfig = extractChartConfig(payload.result);
    if (!chartConfig) {
      return payload;
    }

    try {
      const base64 = await renderChartToBase64(chartConfig);
      return {
        ...payload,
        media: {
          mimeType: 'image/png',
          data: base64,
        },
      };
    } catch (error) {
      console.error('Failed to render chart image', error);
      return payload;
    }
  }
}

function extractChartConfig(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const chartConfig = (result as { chartConfig?: unknown }).chartConfig;
  if (!chartConfig || typeof chartConfig !== 'object') {
    return null;
  }

  return chartConfig as Record<string, unknown>;
}
