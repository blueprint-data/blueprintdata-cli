import { LLMClient, GenerateOptions, GenerateResult } from '../../analytics/llm/client.js';
import { LLMProvider } from '../../types.js';

/**
 * Mock LLM client for testing
 */
export class MockLLMClient extends LLMClient {
  private responses: Map<string, string> = new Map();
  private callHistory: Array<{ messages: any[]; options?: GenerateOptions }> = [];
  private shouldFail = false;
  private failureError: Error | null = null;
  private tokenCounts: { input: number; output: number } = { input: 0, output: 0 };

  constructor(provider: LLMProvider = 'anthropic', model: string = 'test-model') {
    super(provider, 'test-api-key', model);
  }

  /**
   * Set a mock response for a specific prompt pattern
   */
  setMockResponse(promptPattern: string, response: string): void {
    this.responses.set(promptPattern, response);
  }

  /**
   * Set multiple mock responses at once
   */
  setMockResponses(responses: Record<string, string>): void {
    Object.entries(responses).forEach(([pattern, response]) => {
      this.responses.set(pattern, response);
    });
  }

  /**
   * Set default response for all prompts
   */
  setDefaultResponse(response: string): void {
    this.responses.set('__default__', response);
  }

  /**
   * Configure the mock to fail on next call
   */
  setShouldFail(error?: Error): void {
    this.shouldFail = true;
    this.failureError = error || new Error('Mock LLM client error');
  }

  /**
   * Configure the mock to succeed on next call
   */
  setShouldSucceed(): void {
    this.shouldFail = false;
    this.failureError = null;
  }

  /**
   * Set mock token counts for responses
   */
  setTokenCounts(input: number, output: number): void {
    this.tokenCounts = { input, output };
  }

  /**
   * Get call history for assertions
   */
  getCallHistory(): Array<{ messages: any[]; options?: GenerateOptions }> {
    return this.callHistory;
  }

  /**
   * Get the number of times the client was called
   */
  getCallCount(): number {
    return this.callHistory.length;
  }

  /**
   * Get the last call made to the client
   */
  getLastCall(): { messages: any[]; options?: GenerateOptions } | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Clear call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
    this.shouldFail = false;
    this.failureError = null;
    this.tokenCounts = { input: 0, output: 0 };
  }

  /**
   * Mock implementation of generate
   */
  async generate(messages: any[], options?: GenerateOptions): Promise<string> {
    this.callHistory.push({ messages, options });

    if (this.shouldFail) {
      throw this.failureError || new Error('Mock LLM client error');
    }

    const userMessage = messages.find((m) => m.role === 'user')?.content || '';

    for (const [pattern, response] of this.responses.entries()) {
      if (pattern === '__default__') continue;
      if (userMessage.includes(pattern)) {
        return response;
      }
    }

    const defaultResponse = this.responses.get('__default__');
    if (defaultResponse) {
      return defaultResponse;
    }

    return `Mock response for: ${userMessage.substring(0, 50)}...`;
  }

  /**
   * Mock implementation of generateWithTokens
   */
  async generateWithTokens(
    messages: any[],
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const content = await this.generate(messages, options);

    return {
      content,
      tokensUsed: this.tokenCounts,
    };
  }

  /**
   * Mock implementation of chat (legacy)
   */
  async chat(messages: any[]): Promise<string> {
    return this.generate(messages);
  }
}

/**
 * Create a mock LLM client with default test configuration
 */
export function createMockLLMClient(overrides?: {
  provider?: LLMProvider;
  model?: string;
  defaultResponse?: string;
}): MockLLMClient {
  const client = new MockLLMClient(
    overrides?.provider || 'anthropic',
    overrides?.model || 'test-model'
  );

  if (overrides?.defaultResponse) {
    client.setDefaultResponse(overrides.defaultResponse);
  }

  return client;
}
