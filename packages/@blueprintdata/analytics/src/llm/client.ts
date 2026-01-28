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
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 4096;

    if (this.provider === 'anthropic') {
      return await this.generateAnthropic(prompt, options?.systemPrompt, temperature, maxTokens);
    } else if (this.provider === 'openai') {
      return await this.generateOpenAI(prompt, options?.systemPrompt, temperature, maxTokens);
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
    temperature: number = 0.7,
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
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
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
}

/**
 * Create an LLM client from config
 */
export function createLLMClient(provider: LLMProvider, apiKey: string, modelId: string): LLMClient {
  return new LLMClient(provider, apiKey, modelId);
}
