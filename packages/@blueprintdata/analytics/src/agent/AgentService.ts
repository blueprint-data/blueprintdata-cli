import type { Database } from '@blueprintdata/database';
import type { BaseWarehouseConnector } from '@blueprintdata/warehouse';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChatGenerateResult, ChatMessage, LLMClient, ToolCall } from '../llm/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { queryWarehouseTool } from '../tools/implementations/QueryTool.js';
import { generateChartTool } from '../tools/implementations/ChartTool.js';
import {
  listContextDocsTool,
  readContextDocTool,
} from '../tools/implementations/ContextDocsTool.js';
import type { ToolContext } from '../tools/types.js';

export interface AgentConfig {
  database: Database;
  warehouse: BaseWarehouseConnector;
  llmClient: LLMClient;
  agentContextPath: string;
  systemPrompt?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    toolCall?: {
      name: string;
      arguments: Record<string, unknown>;
    };
    toolResult?: unknown;
    chartConfig?: Record<string, unknown>;
  };
}

export interface ToolCallEvent {
  callId: string;
  tool: string;
  arguments: Record<string, unknown>;
  iteration: number;
}

export interface ToolResultEvent {
  callId: string;
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
  iteration: number;
}

export interface ProcessMessageOptions {
  onToolCallStart?: (event: ToolCallEvent) => void | Promise<void>;
  onToolResult?: (event: ToolResultEvent) => void | Promise<void>;
  llmModelOverride?: string;
}

export class AgentService {
  private config: AgentConfig;
  private toolRegistry: ToolRegistry;
  private toolContext: ToolContext;

  constructor(config: AgentConfig) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();

    // Register default tools
    this.toolRegistry.register(queryWarehouseTool);
    this.toolRegistry.register(generateChartTool);
    this.toolRegistry.register(listContextDocsTool);
    this.toolRegistry.register(readContextDocTool);

    this.toolContext = {
      database: config.database,
      warehouse: config.warehouse,
      agentContextPath: config.agentContextPath,
    };
  }

  async processMessage(
    message: string,
    conversationHistory: Message[] = [],
    options?: ProcessMessageOptions
  ): Promise<Message> {
    console.log('[AgentService] Processing message', {
      messageLength: message.length,
      historyCount: conversationHistory.length,
    });
    const isFirstMessage = conversationHistory.length === 0;
    const startupContext = isFirstMessage ? await this.getInitialContextPrompt() : '';
    const baseSystemPrompt = this.config.systemPrompt
      ? `${this.config.systemPrompt}\n\n${this.getToolInstructions()}`
      : this.getDefaultSystemPrompt();
    const systemPrompt = startupContext
      ? `${baseSystemPrompt}\n\n${startupContext}`
      : baseSystemPrompt;

    // Build messages for LLM
    const messages: ChatMessage[] = [];
    messages.push({ role: 'system', content: systemPrompt });
    for (const entry of conversationHistory) {
      messages.push({ role: entry.role, content: entry.content });
    }
    messages.push({ role: 'user', content: message });

    const toolDefinitions = this.toolRegistry.list();
    const maxToolIterations = 12;

    console.log('[AgentService] Sending LLM request', {
      messageCount: messages.length,
      toolCount: toolDefinitions.length,
    });
    const llmClient = options?.llmModelOverride
      ? this.config.llmClient.withModel(options.llmModelOverride)
      : this.config.llmClient;
    let response: ChatGenerateResult;
    try {
      response = await llmClient.generateChat(messages, {
        tools: toolDefinitions,
        toolChoice: 'auto',
      });
    } catch (error) {
      console.error('[AgentService] LLM request failed', {
        ...this.getErrorDetails(error),
        provider: this.config.llmClient.getProvider?.(),
        model: this.config.llmClient.getModelId?.(),
        messageCount: messages.length,
        toolCount: toolDefinitions.length,
      });
      throw error;
    }

    console.log('[AgentService] LLM response received', {
      contentLength: response.content?.length ?? 0,
      toolCallCount: response.toolCalls?.length ?? 0,
      toolCalls: response.toolCalls?.map((call: ToolCall) => call.name) ?? [],
    });

    let toolCalls = this.normalizeToolCalls(response.toolCalls);
    if ((!toolCalls || toolCalls.length === 0) && response.content) {
      const legacyToolCall = this.extractToolCall(response.content);
      if (legacyToolCall) {
        console.log('[AgentService] Parsed legacy tool call', {
          tool: legacyToolCall.name,
        });
      }
      toolCalls = legacyToolCall
        ? [{ name: legacyToolCall.name, arguments: legacyToolCall.arguments }]
        : [];
    }

    let iteration = 0;
    while (toolCalls && toolCalls.length > 0 && iteration < maxToolIterations) {
      console.log('[AgentService] Executing tool calls', {
        iteration: iteration + 1,
        toolCount: toolCalls.length,
        tools: toolCalls.map((call) => call.name),
      });
      const normalized = toolCalls.map((call, index) => ({
        ...call,
        id: call.id || `tool_call_${iteration}_${index}`,
      }));

      messages.push({
        role: 'assistant',
        content: response.content || '',
        toolCalls: normalized,
      });

      for (const call of normalized) {
        let toolResult: unknown;
        await this.emitToolCall(options, {
          callId: call.id,
          tool: call.name,
          arguments: call.arguments,
          iteration: iteration + 1,
        });
        try {
          console.log('[AgentService] Running tool', {
            tool: call.name,
            toolCallId: call.id,
          });
          toolResult = await this.executeTool(call.name, call.arguments);
          console.log('[AgentService] Tool completed', {
            tool: call.name,
            toolCallId: call.id,
          });
          await this.emitToolResult(options, {
            callId: call.id,
            tool: call.name,
            success: true,
            result: toolResult,
            iteration: iteration + 1,
          });
        } catch (error) {
          console.error('[AgentService] Tool failed', {
            tool: call.name,
            toolCallId: call.id,
            error: error instanceof Error ? error.message : error,
          });
          await this.emitToolResult(options, {
            callId: call.id,
            tool: call.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown tool error',
            iteration: iteration + 1,
          });
          toolResult = {
            error: error instanceof Error ? error.message : 'Unknown tool error',
          };
        }

        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult, null, 2),
          toolCallId: call.id,
        });
      }

      console.log('[AgentService] Sending LLM follow-up', {
        messageCount: messages.length,
        toolCount: toolDefinitions.length,
      });
      try {
        response = await llmClient.generateChat(messages, {
          tools: toolDefinitions,
          toolChoice: 'auto',
        });
      } catch (error) {
        console.error('[AgentService] LLM follow-up failed', {
          ...this.getErrorDetails(error),
          provider: this.config.llmClient.getProvider?.(),
          model: this.config.llmClient.getModelId?.(),
          iteration: iteration + 1,
          messageCount: messages.length,
          toolCount: toolDefinitions.length,
          toolCalls: normalized.map((call) => call.name),
        });
        throw error;
      }

      console.log('[AgentService] LLM follow-up received', {
        contentLength: response.content?.length ?? 0,
        toolCallCount: response.toolCalls?.length ?? 0,
        toolCalls: response.toolCalls?.map((call: ToolCall) => call.name) ?? [],
      });

      toolCalls = this.normalizeToolCalls(response.toolCalls);
      if ((!toolCalls || toolCalls.length === 0) && response.content) {
        const legacyToolCall = this.extractToolCall(response.content);
        if (legacyToolCall) {
          console.log('[AgentService] Parsed legacy tool call', {
            tool: legacyToolCall.name,
          });
        }
        toolCalls = legacyToolCall
          ? [{ name: legacyToolCall.name, arguments: legacyToolCall.arguments }]
          : [];
      }
      iteration += 1;
    }

    console.log('[AgentService] Response ready', {
      contentLength: response.content?.length ?? 0,
    });
    return {
      role: 'assistant',
      content: response.content,
    };
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return tool.execute(args, this.toolContext);
  }

  getAvailableTools() {
    return this.toolRegistry.list();
  }

  private getDefaultSystemPrompt(): string {
    return `You are BlueprintData Analytics Agent, an AI assistant specialized in helping users analyze their data warehouse.

${this.getToolInstructions()}

Always explain your reasoning and provide insights based on the data.`;
  }

  private async getInitialContextPrompt(): Promise<string> {
    const currentDate = new Date().toISOString();
    const agentContextPath = this.config.agentContextPath;

    if (!existsSync(agentContextPath)) {
      return `Current date: ${currentDate}\nAgent context directory not found.`;
    }

    const files = await this.listMarkdownFiles(agentContextPath, 200);
    if (files.length === 0) {
      return `Current date: ${currentDate}\nNo markdown context files found under agent-context.`;
    }

    const listing = files.map((file) => `- ${file}`).join('\n');
    return `Current date: ${currentDate}\nAvailable context docs:\n${listing}`;
  }

  private async listMarkdownFiles(baseDir: string, limit: number): Promise<string[]> {
    const results: string[] = [];
    let truncated = false;

    const walk = async (currentDir: string): Promise<void> => {
      if (truncated) {
        return;
      }

      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (truncated) {
          return;
        }

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (!entry.name.toLowerCase().endsWith('.md')) {
          continue;
        }

        results.push(path.relative(baseDir, fullPath));

        if (results.length >= limit) {
          truncated = true;
          return;
        }
      }
    };

    await walk(baseDir);
    return results;
  }

  private getToolInstructions(): string {
    const tools = this.toolRegistry.list();
    const toolDescriptions = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

    return `You have access to the following tools:
${toolDescriptions}

When users ask questions about data:
1. Use list_context_docs and read_context_doc to browse agent-context markdown files
2. Use the query_warehouse tool to execute SQL queries and retrieve data
3. Use the generate_chart tool to create visualizations when appropriate

Important: Context doc paths are case-sensitive. Always use the exact file paths returned by list_context_docs.

Use tool calls when needed, then answer normally after receiving tool results.`;
  }

  private extractToolCall(
    content: string
  ): { name: string; arguments: Record<string, unknown> } | null {
    const trimmed = content.trim();
    const jsonMatch =
      trimmed.match(/^```json\s*([\s\S]*?)\s*```$/i) || trimmed.match(/({[\s\S]*})/);

    if (!jsonMatch) {
      return null;
    }

    const raw = jsonMatch[1] ?? jsonMatch[0];

    try {
      const parsed = JSON.parse(raw);
      const toolCall = (parsed as { tool_call?: unknown }).tool_call;
      if (
        toolCall &&
        typeof toolCall === 'object' &&
        'name' in toolCall &&
        'arguments' in toolCall
      ) {
        const name = String((toolCall as { name?: unknown }).name || '');
        const args = (toolCall as { arguments?: Record<string, unknown> }).arguments || {};
        if (name) {
          return { name, arguments: args };
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private normalizeToolCalls(toolCalls?: ToolCall[]): ToolCall[] {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }

    return toolCalls.map((call) => ({
      id: call.id,
      name: call.name,
      arguments: call.arguments || {},
    }));
  }

  private async emitToolCall(options: ProcessMessageOptions | undefined, event: ToolCallEvent) {
    if (!options?.onToolCallStart) {
      return;
    }

    try {
      await options.onToolCallStart(event);
    } catch (error) {
      console.warn('[AgentService] Tool call callback failed', {
        error: error instanceof Error ? error.message : error,
        tool: event.tool,
        callId: event.callId,
      });
    }
  }

  private async emitToolResult(options: ProcessMessageOptions | undefined, event: ToolResultEvent) {
    if (!options?.onToolResult) {
      return;
    }

    try {
      await options.onToolResult(event);
    } catch (error) {
      console.warn('[AgentService] Tool result callback failed', {
        error: error instanceof Error ? error.message : error,
        tool: event.tool,
        callId: event.callId,
      });
    }
  }

  private getErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const details: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      const extra = this.extractErrorExtras(error as unknown as Record<string, unknown>);
      if (Object.keys(extra).length > 0) {
        details.details = extra;
      }
      if ('cause' in error) {
        details.cause = (error as { cause?: unknown }).cause;
      }
      return details;
    }

    if (error && typeof error === 'object') {
      return {
        name: 'NonError',
        details: this.extractErrorExtras(error as Record<string, unknown>),
      };
    }

    return {
      message: String(error),
    };
  }

  private extractErrorExtras(error: Record<string, unknown>): Record<string, unknown> {
    const keys = [
      'code',
      'status',
      'statusCode',
      'statusText',
      'type',
      'param',
      'requestId',
      'response',
      'data',
      'errors',
      'error',
      'details',
    ];
    const extras: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in error) {
        extras[key] = error[key];
      }
    }
    return extras;
  }
}
