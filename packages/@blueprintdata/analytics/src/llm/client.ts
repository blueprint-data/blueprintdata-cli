import { OpenRouter } from '@openrouter/sdk';
import { LLMProvider } from '@blueprintdata/models';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

export interface ChatGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSchema[];
  toolChoice?: 'auto' | 'none' | { name: string };
}

export interface GenerateResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface ChatGenerateResult extends GenerateResult {
  toolCalls?: ToolCall[];
}

/**
 * Unified LLM client that uses OpenRouter APIs
 */
export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private modelId: string;
  private openRouterClient?: OpenRouter;

  constructor(provider: LLMProvider, apiKey: string, modelId: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.modelId = modelId;

    if (provider === 'openrouter') {
      this.openRouterClient = new OpenRouter({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const maxTokens = options?.maxTokens ?? 4096;

    if (this.provider !== 'openrouter' || !this.openRouterClient) {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }

    const temperature = options?.temperature ?? 0.7;
    const messages = [] as Array<{ role: 'system' | 'user'; content: string }>;

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const requestPayload = {
      model: this.modelId,
      messages,
      temperature,
      maxTokens,
    };

    let response: Awaited<ReturnType<OpenRouter['chat']['send']>>;

    try {
      response = await this.openRouterClient.chat.send(requestPayload);
    } catch (error) {
      this.logOpenRouterError('generate', error, requestPayload);
      throw error;
    }

    const message = response.choices?.[0]?.message as { content?: unknown } | undefined;
    let content = '';

    const extractText = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object') {
        if ('text' in value) {
          const textValue = (value as { text?: unknown }).text;
          if (typeof textValue === 'string') {
            return textValue;
          }
        }
        if ('value' in value && typeof (value as { value?: unknown }).value === 'string') {
          return (value as { value?: string }).value ?? '';
        }
        if ('content' in value) {
          return extractText((value as { content?: unknown }).content);
        }
      }
      return '';
    };

    if (typeof message?.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message?.content)) {
      content = message?.content.map((part) => extractText(part)).join('') ?? '';
    } else if (message?.content) {
      content = extractText(message.content);
    }

    if (!content) {
      if (process.env.BLUEPRINTDATA_VERBOSE === '1') {
        console.warn('OpenRouter returned empty content', {
          model: this.modelId,
          responseId: (response as { id?: string }).id,
        });
      }
      throw new Error('OpenRouter returned empty content');
    }

    const usage = response.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    return {
      content,
      tokensUsed: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Generate a completion from chat messages (supports tools)
   */
  async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerateOptions
  ): Promise<ChatGenerateResult> {
    const maxTokens = options?.maxTokens ?? 4096;

    if (this.provider !== 'openrouter' || !this.openRouterClient) {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }

    const temperature = options?.temperature ?? 0.7;
    const tools = options?.tools ? this.buildTools(options.tools) : undefined;
    const toolChoice = options?.toolChoice;

    const requestPayload = {
      model: this.modelId,
      messages: this.buildMessages(messages) as unknown as Parameters<
        typeof this.openRouterClient.chat.send
      >[0]['messages'],
      temperature,
      maxTokens,
      tools: tools as Parameters<typeof this.openRouterClient.chat.send>[0]['tools'],
      toolChoice: toolChoice as Parameters<typeof this.openRouterClient.chat.send>[0]['toolChoice'],
    };

    let response: Awaited<ReturnType<OpenRouter['chat']['send']>>;

    try {
      response = await this.openRouterClient.chat.send(requestPayload);
    } catch (error) {
      this.logOpenRouterError('generateChat', error, requestPayload);
      throw error;
    }

    const message = response.choices?.[0]?.message as
      | {
          content?: unknown;
          tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: unknown };
          }>;
          toolCalls?: Array<{
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: unknown };
          }>;
        }
      | undefined;

    const toolCalls = this.extractToolCalls(message?.toolCalls ?? message?.tool_calls);
    const content = this.extractContent(message?.content);

    if (process.env.BLUEPRINTDATA_VERBOSE === '1') {
      const toolCallCount = toolCalls?.length ?? 0;
      console.log('OpenRouter chat response received', {
        model: this.modelId,
        responseId: (response as { id?: string }).id,
        contentLength: content?.length ?? 0,
        toolCallCount,
      });
    }

    if (!content && (!toolCalls || toolCalls.length === 0)) {
      if (process.env.BLUEPRINTDATA_VERBOSE === '1') {
        console.warn('OpenRouter returned empty content', {
          model: this.modelId,
          responseId: (response as { id?: string }).id,
        });
      }
      throw new Error('OpenRouter returned empty content');
    }

    const usage = response.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    return {
      content,
      toolCalls,
      tokensUsed: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Get the model ID being used
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * Get the provider being used
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Create a new client with a different model ID
   */
  withModel(modelId: string): LLMClient {
    return new LLMClient(this.provider, this.apiKey, modelId);
  }

  private extractContent(value: unknown): string {
    const extractText = (inner: unknown): string => {
      if (typeof inner === 'string') {
        return inner;
      }
      if (inner && typeof inner === 'object') {
        if ('text' in inner) {
          const textValue = (inner as { text?: unknown }).text;
          if (typeof textValue === 'string') {
            return textValue;
          }
        }
        if ('value' in inner && typeof (inner as { value?: unknown }).value === 'string') {
          return (inner as { value?: string }).value ?? '';
        }
        if ('content' in inner) {
          return extractText((inner as { content?: unknown }).content);
        }
      }
      return '';
    };

    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((part) => extractText(part)).join('') ?? '';
    }
    if (value) {
      return extractText(value);
    }
    return '';
  }

  private extractToolCalls(
    toolCalls?: Array<{
      id?: string;
      type?: string;
      function?: { name?: string; arguments?: unknown };
    }>
  ): ToolCall[] | undefined {
    if (!toolCalls || toolCalls.length === 0) {
      return undefined;
    }

    const results: ToolCall[] = [];

    for (const call of toolCalls) {
      const name = call.function?.name ? String(call.function.name) : '';
      const rawArgs = call.function?.arguments;
      let args: Record<string, unknown> = {};

      if (typeof rawArgs === 'string') {
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = {};
        }
      } else if (rawArgs && typeof rawArgs === 'object') {
        args = rawArgs as Record<string, unknown>;
      }

      if (!name) {
        continue;
      }

      results.push({
        id: call.id,
        name,
        arguments: args,
      });
    }

    return results;
  }

  private buildMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((message, index) => {
      if (message.role === 'tool') {
        return {
          role: 'tool',
          content: message.content,
          toolCallId: message.toolCallId || `tool_call_${index}`,
        };
      }

      if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: message.content,
          toolCalls: message.toolCalls.map((call, callIndex) => ({
            id: call.id || `tool_call_${index}_${callIndex}`,
            type: 'function',
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments ?? {}),
            },
          })),
        };
      }

      return {
        role: message.role,
        content: message.content,
      };
    });
  }

  private buildTools(tools: ToolSchema[]): Array<Record<string, unknown>> {
    return tools.map((tool) => {
      const properties: Record<string, Record<string, unknown>> = {};
      const required: string[] = [];

      for (const param of tool.parameters) {
        properties[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum ? { enum: param.enum } : {}),
        };
        if (param.required) {
          required.push(param.name);
        }
      }

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {}),
          },
        },
      };
    });
  }

  private logOpenRouterError(
    requestType: 'generate' | 'generateChat',
    error: unknown,
    payload: Record<string, unknown>
  ): void {
    const errorObject = error as {
      name?: string;
      message?: string;
      stack?: string;
      details?: unknown;
      statusCode?: number;
      code?: string | number;
      provider?: string;
      model?: string;
    };

    const messages = Array.isArray(payload.messages)
      ? (payload.messages as Array<{ content?: unknown }>)
      : [];
    const contentLength = messages.reduce((total, message) => {
      if (typeof message.content === 'string') {
        return total + message.content.length;
      }
      if (Array.isArray(message.content)) {
        return (
          total +
          message.content.reduce((innerTotal, part) => {
            if (typeof part === 'string') {
              return innerTotal + part.length;
            }
            return innerTotal;
          }, 0)
        );
      }
      return total;
    }, 0);

    const tools = Array.isArray(payload.tools)
      ? (payload.tools as Array<{ function?: { name?: unknown } }>)
      : [];
    const toolNames = tools
      .map((tool) => (typeof tool.function?.name === 'string' ? tool.function.name : ''))
      .filter(Boolean);

    console.error('OpenRouter request failed', {
      requestType,
      model: this.modelId,
      messageCount: messages.length,
      toolCount: tools.length,
      toolNames,
      contentLength,
      error: {
        name: errorObject?.name,
        message: errorObject?.message,
        statusCode: errorObject?.statusCode,
        code: errorObject?.code,
        provider: errorObject?.provider,
        model: errorObject?.model,
        details: errorObject?.details,
      },
    });

    if (process.env.BLUEPRINTDATA_VERBOSE === '1') {
      console.error('OpenRouter request payload', payload);
      if (errorObject?.stack) {
        console.error('OpenRouter error stack', errorObject.stack);
      }
    }
  }
}

/**
 * Create an LLM client from config
 */
export function createLLMClient(provider: LLMProvider, apiKey: string, modelId: string): LLMClient {
  return new LLMClient(provider, apiKey, modelId);
}
