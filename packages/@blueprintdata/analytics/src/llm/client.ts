import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMProvider } from '@blueprintdata/models';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface GenerateResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Unified LLM client that abstracts Anthropic and OpenAI APIs
 */
export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private modelId: string;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;

  constructor(provider: LLMProvider, apiKey: string, modelId: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.modelId = modelId;

    if (provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: this.apiKey,
      });
    } else if (provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const maxTokens = options?.maxTokens ?? 4096;

    if (this.provider === 'anthropic') {
      const temperature = options?.temperature ?? 0.7;
      return await this.generateAnthropic(prompt, options?.systemPrompt, temperature, maxTokens);
    } else if (this.provider === 'openai') {
      return await this.generateOpenAI(
        prompt,
        options?.systemPrompt,
        options?.temperature,
        maxTokens
      );
    }

    throw new Error(`Unsupported LLM provider: ${this.provider}`);
  }

  /**
   * Generate using Anthropic Claude
   */
  private async generateAnthropic(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7,
    maxTokens: number = 4096
  ): Promise<GenerateResult> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.anthropicClient.messages.create({
      model: this.modelId,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }

  /**
   * Generate using OpenAI GPT
   */
  private async generateOpenAI(
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens: number = 4096
  ): Promise<GenerateResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.openaiClient.chat.completions.create({
      model: this.modelId,
      messages,
      max_completion_tokens: maxTokens,
      ...(temperature === 1 ? { temperature } : {}),
    });

    const message = response.choices[0]?.message;
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
          if (textValue && typeof textValue === 'object' && 'value' in textValue) {
            const textInner = (textValue as { value?: unknown }).value;
            if (typeof textInner === 'string') {
              return textInner;
            }
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
    } else {
      const contentParts = message?.content as unknown;
      if (Array.isArray(contentParts)) {
        content = contentParts.map((part) => extractText(part)).join('');
      }
    }

    if (!content) {
      if (process.env.BLUEPRINTDATA_VERBOSE === '1') {
        const messageDebug = {
          role: message?.role,
          messageKeys: message ? Object.keys(message) : [],
          contentType: Array.isArray(message?.content) ? 'array' : typeof message?.content,
          contentLength:
            typeof message?.content === 'string'
              ? message.content.length
              : Array.isArray(message?.content)
                ? (message.content as unknown[]).length
                : undefined,
          contentPreview: Array.isArray(message?.content)
            ? message?.content.map((part) =>
                typeof part === 'string'
                  ? part.slice(0, 80)
                  : part && typeof part === 'object'
                    ? Object.keys(part).slice(0, 6)
                    : typeof part
              )
            : typeof message?.content === 'string'
              ? message?.content.slice(0, 120)
              : undefined,
          refusal:
            message && typeof (message as { refusal?: unknown }).refusal === 'string'
              ? (message as { refusal?: string }).refusal
              : undefined,
        };
        const responseDebug = {
          id: response.id,
          model: response.model,
          usage: response.usage,
          choices: response.choices.map((choice) => ({
            index: choice.index,
            finishReason: choice.finish_reason,
            choiceKeys: Object.keys(choice),
            message: {
              role: choice.message?.role,
              contentType: Array.isArray(choice.message?.content)
                ? 'array'
                : typeof choice.message?.content,
              contentLength:
                typeof choice.message?.content === 'string'
                  ? choice.message.content.length
                  : Array.isArray(choice.message?.content)
                    ? (choice.message.content as unknown[]).length
                    : undefined,
              messageKeys: choice.message ? Object.keys(choice.message) : [],
              refusal:
                choice.message &&
                typeof (choice.message as { refusal?: unknown }).refusal === 'string'
                  ? (choice.message as { refusal?: string }).refusal
                  : undefined,
            },
          })),
        };
        console.warn('OpenAI empty content debug:', messageDebug);
        console.warn('OpenAI response debug:', responseDebug);
      }
      const refusal =
        message && typeof (message as { refusal?: unknown }).refusal === 'string'
          ? (message as { refusal?: string }).refusal
          : undefined;
      if (refusal) {
        throw new Error(`OpenAI refusal: ${refusal}`);
      }
      throw new Error('OpenAI returned empty content');
    }
    const usage = response.usage;

    return {
      content,
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
}

/**
 * Create an LLM client from config
 */
export function createLLMClient(provider: LLMProvider, apiKey: string, modelId: string): LLMClient {
  return new LLMClient(provider, apiKey, modelId);
}
