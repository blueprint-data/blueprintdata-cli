import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@blueprintdata/database';

// Message types
export interface WSMessage {
  type: 'chat' | 'tool_call' | 'tool_result' | 'error' | 'system' | 'pong';
  id: string;
  payload: unknown;
  timestamp: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  content: string;
}

export interface ToolCallPayload {
  tool: string;
  arguments: Record<string, unknown>;
  callId: string;
}

export interface ToolResultPayload {
  callId: string;
  success: boolean;
  result?: unknown;
  error?: string;
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

    if (!token) {
      ws.close(1008, 'Missing authentication token');
      return;
    }

    // Verify token
    let payload: { userId: string; username: string } | null = null;
    try {
      payload = jwt.verify(token, this.config.jwtSecret) as { userId: string; username: string };
    } catch {
      ws.close(1008, 'Invalid authentication token');
      return;
    }

    // Check max connections
    if (this.clients.size >= (this.config.maxConnections || 100)) {
      ws.close(1013, 'Server capacity exceeded');
      return;
    }

    const clientId = uuidv4();
    const client: ClientConnection = {
      ws,
      userId: payload.userId,
      username: payload.username,
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);
    console.log(`Client connected: ${payload.username} (${clientId})`);

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

    // TODO: Route to Agent service in Phase 4
    // For now, echo back a simple response
    this.sendToClient(clientId, {
      type: 'chat',
      id: message.id,
      payload: {
        sessionId: (message.payload as any)?.sessionId,
        content: `Echo: ${(message.payload as any)?.content || 'No content'}`,
        role: 'assistant',
      },
      timestamp: new Date().toISOString(),
    });
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
}
