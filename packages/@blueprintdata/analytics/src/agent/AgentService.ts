import type { Database } from '@blueprintdata/database';
import type { BaseWarehouseConnector } from '@blueprintdata/warehouse';
import type { LLMClient } from '../llm/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { queryWarehouseTool } from '../tools/implementations/QueryTool.js';
import { searchContextTool } from '../tools/implementations/ContextSearchTool.js';
import { generateChartTool } from '../tools/implementations/ChartTool.js';
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

export class AgentService {
  private config: AgentConfig;
  private toolRegistry: ToolRegistry;
  private toolContext: ToolContext;

  constructor(config: AgentConfig) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();

    // Register default tools
    this.toolRegistry.register(queryWarehouseTool);
    this.toolRegistry.register(searchContextTool);
    this.toolRegistry.register(generateChartTool);

    this.toolContext = {
      database: config.database,
      warehouse: config.warehouse,
      agentContextPath: config.agentContextPath,
    };
  }

  async processMessage(message: string, conversationHistory: Message[] = []): Promise<Message> {
    // Build system prompt
    const systemPrompt = this.config.systemPrompt || this.getDefaultSystemPrompt();

    // Build messages for LLM
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // For MVP, we'll use a simple approach without complex tool calling
    // In a full implementation, this would parse tool calls from the LLM response

    // Get response from LLM
    // For MVP, concatenate messages into a single prompt
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
    const response = await this.config.llmClient.generate(prompt, {
      systemPrompt: systemPrompt,
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
    const tools = this.toolRegistry.list();
    const toolDescriptions = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

    return `You are BlueprintData Analytics Agent, an AI assistant specialized in helping users analyze their data warehouse.

You have access to the following tools:
${toolDescriptions}

When users ask questions about data:
1. Use the search_context tool to find relevant information about their data models
2. Use the query_warehouse tool to execute SQL queries and retrieve data
3. Use the generate_chart tool to create visualizations when appropriate

Always explain your reasoning and provide insights based on the data.`;
  }
}
