import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { LLMClient, createLLMClient } from '../client.js';
import type { LLMProvider } from '@blueprintdata/models';

const mockOpenRouterSend = mock(async () => ({
  id: 'chatcmpl-test',
  model: 'openrouter/auto',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Mocked OpenRouter response',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 120,
    completion_tokens: 60,
    total_tokens: 180,
  },
}));

mock.module('@openrouter/sdk', () => {
  return {
    OpenRouter: class MockOpenRouter {
      chat = {
        send: mockOpenRouterSend,
      };
      models = {
        list: mock(async () => ({ data: [] })),
      };
    },
  };
});

describe('LLMClient', () => {
  beforeEach(() => {
    mockOpenRouterSend.mockClear();
  });

  describe('constructor', () => {
    it('should create OpenRouter client', () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      expect(client.getProvider()).toBe('openrouter' as LLMProvider);
      expect(client.getModelId()).toBe('openrouter/auto');
    });
  });

  describe('generate - OpenRouter', () => {
    it('should generate completion with OpenRouter', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      const result = await client.generate('Test prompt');

      expect(result.content).toBe('Mocked OpenRouter response');
      expect(result.tokensUsed.input).toBe(120);
      expect(result.tokensUsed.output).toBe(60);
      expect(mockOpenRouterSend).toHaveBeenCalledTimes(1);
    });

    it('should pass temperature and maxTokens to OpenRouter', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      await client.generate('Test prompt', { temperature: 0.5, maxTokens: 2000 });

      expect(mockOpenRouterSend).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 2000,
        })
      );
    });

    it('should pass system prompt to OpenRouter', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      await client.generate('Test prompt', { systemPrompt: 'You are a helpful assistant' });

      expect(mockOpenRouterSend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Test prompt' },
          ],
        })
      );
    });

    it('should not include system message when not provided', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      await client.generate('Test prompt');

      expect(mockOpenRouterSend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test prompt' }],
        })
      );
    });

    it('should handle OpenRouter error', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      mockOpenRouterSend.mockRejectedValueOnce(new Error('API rate limit'));

      await expect(client.generate('Test prompt')).rejects.toThrow('API rate limit');
    });

    it('should handle missing usage data', async () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      mockOpenRouterSend.mockResolvedValueOnce({
        id: 'chatcmpl-test',
        model: 'openrouter/auto',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: undefined,
      } as any);

      const result = await client.generate('Test prompt');

      expect(result.tokensUsed.input).toBe(0);
      expect(result.tokensUsed.output).toBe(0);
    });
  });

  describe('createLLMClient factory', () => {
    it('should create OpenRouter client', () => {
      const client = createLLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      expect(client.getProvider()).toBe('openrouter' as LLMProvider);
      expect(client.getModelId()).toBe('openrouter/auto');
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported provider', async () => {
      const client = new LLMClient('unsupported' as any, 'test-key', 'model-id');

      await expect(client.generate('Test prompt')).rejects.toThrow('Unsupported LLM provider');
    });
  });

  describe('getters', () => {
    it('should return correct model ID', () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      expect(client.getModelId()).toBe('openrouter/auto');
    });

    it('should return correct provider', () => {
      const client = new LLMClient('openrouter' as LLMProvider, 'or-test-key', 'openrouter/auto');

      expect(client.getProvider()).toBe('openrouter' as LLMProvider);
    });
  });
});
