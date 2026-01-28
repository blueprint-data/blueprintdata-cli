import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { LLMClient, createLLMClient } from '../client.js';
import type { GenerateOptions } from '../client.js';

// Mock the Anthropic SDK
const mockAnthropicCreate = mock(async () => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text' as const, text: 'Mocked Anthropic response' }],
  model: 'claude-3-5-sonnet-20241022',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
}));

const mockOpenAICreate = mock(async () => ({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Mocked OpenAI response',
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

// Mock modules
mock.module('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockAnthropicCreate,
      };
    },
  };
});

mock.module('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    },
  };
});

describe('LLMClient', () => {
  beforeEach(() => {
    mockAnthropicCreate.mockClear();
    mockOpenAICreate.mockClear();
  });

  describe('constructor', () => {
    it('should create Anthropic client', () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      expect(client.getProvider()).toBe('anthropic');
      expect(client.getModelId()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should create OpenAI client', () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      expect(client.getProvider()).toBe('openai');
      expect(client.getModelId()).toBe('gpt-4o');
    });
  });

  describe('generate - Anthropic', () => {
    it('should generate completion with Anthropic', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      const result = await client.generate('Test prompt');

      expect(result.content).toBe('Mocked Anthropic response');
      expect(result.tokensUsed.input).toBe(100);
      expect(result.tokensUsed.output).toBe(50);
      expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    });

    it('should pass temperature and maxTokens to Anthropic', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      await client.generate('Test prompt', { temperature: 0.5, maxTokens: 2000 });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 2000,
        })
      );
    });

    it('should pass system prompt to Anthropic', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      await client.generate('Test prompt', { systemPrompt: 'You are a helpful assistant' });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant',
        })
      );
    });

    it('should use default temperature and maxTokens', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      await client.generate('Test prompt');

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 4096,
        })
      );
    });

    it('should format messages correctly for Anthropic', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      await client.generate('Test prompt');

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: 'user',
              content: 'Test prompt',
            },
          ],
        })
      );
    });

    it('should handle Anthropic error', async () => {
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      mockAnthropicCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(client.generate('Test prompt')).rejects.toThrow('API error');
    });
  });

  describe('generate - OpenAI', () => {
    it('should generate completion with OpenAI', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      const result = await client.generate('Test prompt');

      expect(result.content).toBe('Mocked OpenAI response');
      expect(result.tokensUsed.input).toBe(120);
      expect(result.tokensUsed.output).toBe(60);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
    });

    it('should pass temperature and maxTokens to OpenAI', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      await client.generate('Test prompt', { temperature: 0.8, maxTokens: 1000 });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
          max_tokens: 1000,
        })
      );
    });

    it('should pass system prompt to OpenAI', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      await client.generate('Test prompt', { systemPrompt: 'You are a helpful assistant' });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Test prompt' },
          ],
        })
      );
    });

    it('should not include system message when not provided', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      await client.generate('Test prompt');

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test prompt' }],
        })
      );
    });

    it('should handle OpenAI error', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      mockOpenAICreate.mockRejectedValueOnce(new Error('API rate limit'));

      await expect(client.generate('Test prompt')).rejects.toThrow('API rate limit');
    });

    it('should handle empty response content', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      mockOpenAICreate.mockResolvedValueOnce({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      });

      const result = await client.generate('Test prompt');

      expect(result.content).toBe('');
      expect(result.tokensUsed.input).toBe(10);
      expect(result.tokensUsed.output).toBe(0);
    });

    it('should handle missing usage data', async () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      mockOpenAICreate.mockResolvedValueOnce({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
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
      });

      const result = await client.generate('Test prompt');

      expect(result.tokensUsed.input).toBe(0);
      expect(result.tokensUsed.output).toBe(0);
    });
  });

  describe('createLLMClient factory', () => {
    it('should create Anthropic client', () => {
      const client = createLLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      expect(client.getProvider()).toBe('anthropic');
      expect(client.getModelId()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should create OpenAI client', () => {
      const client = createLLMClient('openai', 'sk-test-key', 'gpt-4o');

      expect(client.getProvider()).toBe('openai');
      expect(client.getModelId()).toBe('gpt-4o');
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
      const client = new LLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');

      expect(client.getModelId()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return correct provider', () => {
      const client = new LLMClient('openai', 'sk-test-key', 'gpt-4o');

      expect(client.getProvider()).toBe('openai');
    });
  });
});
