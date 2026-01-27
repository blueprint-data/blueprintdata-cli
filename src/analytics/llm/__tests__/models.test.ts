import { describe, it, expect } from 'bun:test';
import {
  getModelsForProvider,
  getModel,
  getDefaultModel,
  validateModel,
  formatModelOption,
  estimateCost,
} from '../models.js';

describe('LLM Models', () => {
  describe('getModelsForProvider', () => {
    it('should return Anthropic models', () => {
      const models = getModelsForProvider('anthropic');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'anthropic')).toBe(true);
    });

    it('should return OpenAI models', () => {
      const models = getModelsForProvider('openai');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'openai')).toBe(true);
    });

    it('should return empty array for unknown provider', () => {
      const models = getModelsForProvider('unknown' as any);

      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should get Anthropic model by ID', () => {
      const model = getModel('claude-3-5-sonnet-20241022');

      expect(model).toBeDefined();
      expect(model?.id).toBe('claude-3-5-sonnet-20241022');
      expect(model?.provider).toBe('anthropic');
    });

    it('should get OpenAI model by ID', () => {
      const model = getModel('gpt-4o');

      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-4o');
      expect(model?.provider).toBe('openai');
    });

    it('should return undefined for unknown model', () => {
      const model = getModel('unknown-model');

      expect(model).toBeUndefined();
    });
  });

  describe('getDefaultModel', () => {
    it('should return profiling-recommended model for profiling use case', () => {
      const anthropicProfiling = getDefaultModel('anthropic', 'profiling');
      const openaiProfiling = getDefaultModel('openai', 'profiling');

      expect(anthropicProfiling.recommended).toBe('profiling');
      expect(openaiProfiling.recommended).toBe('profiling');
    });

    it('should return general-recommended model for chat use case', () => {
      const anthropicChat = getDefaultModel('anthropic', 'chat');
      const openaiChat = getDefaultModel('openai', 'chat');

      expect(anthropicChat.recommended).toBe('general');
      expect(openaiChat.recommended).toBe('general');
    });

    it('should default to chat use case', () => {
      const anthropic = getDefaultModel('anthropic');
      const openai = getDefaultModel('openai');

      expect(anthropic.recommended).toBe('general');
      expect(openai.recommended).toBe('general');
    });

    it('should fallback gracefully when no recommended model', () => {
      const model = getDefaultModel('anthropic');

      expect(model).toBeDefined();
      expect(model.provider).toBe('anthropic');
    });
  });

  describe('validateModel', () => {
    it('should validate correct Anthropic models', () => {
      expect(validateModel('claude-3-5-sonnet-20241022', 'anthropic')).toBe(true);
      expect(validateModel('claude-3-5-haiku-20241022', 'anthropic')).toBe(true);
    });

    it('should validate correct OpenAI models', () => {
      expect(validateModel('gpt-4o', 'openai')).toBe(true);
      expect(validateModel('gpt-4o-mini', 'openai')).toBe(true);
    });

    it('should reject incorrect model for provider', () => {
      expect(validateModel('gpt-4o', 'anthropic')).toBe(false);
      expect(validateModel('claude-3-5-sonnet-20241022', 'openai')).toBe(false);
    });

    it('should reject unknown models', () => {
      expect(validateModel('unknown-model', 'anthropic')).toBe(false);
      expect(validateModel('unknown-model', 'openai')).toBe(false);
    });
  });

  describe('formatModelOption', () => {
    it('should format model with recommendation', () => {
      const model = getModel('claude-3-5-sonnet-20241022');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.value).toBe(model.id);
      expect(formatted.label).toContain('Recommended');
      expect(formatted.hint).toBeDefined();
    });

    it('should format model without recommendation', () => {
      const model = getModel('claude-3-opus-20240229');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.value).toBe(model.id);
      expect(formatted.label).not.toContain('Recommended');
    });

    it('should include cost information in hint', () => {
      const model = getModel('claude-3-5-haiku-20241022');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.hint).toContain('$');
      expect(formatted.hint).toContain('1M tokens');
    });

    it('should include context window in hint', () => {
      const model = getModel('gpt-4o');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.hint).toContain('K context');
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost for Anthropic Sonnet', () => {
      const cost = estimateCost('claude-3-5-sonnet-20241022', 1_000_000, 1_000_000);

      expect(cost).toBe(18.0); // $3 input + $15 output
    });

    it('should calculate cost for Anthropic Haiku', () => {
      const cost = estimateCost('claude-3-5-haiku-20241022', 1_000_000, 1_000_000);

      expect(cost).toBe(6.0); // $1 input + $5 output
    });

    it('should calculate cost for smaller token counts', () => {
      const cost = estimateCost('claude-3-5-sonnet-20241022', 100_000, 50_000);

      expect(cost).toBeCloseTo(1.05, 2); // $0.30 input + $0.75 output
    });

    it('should return 0 for unknown model', () => {
      const cost = estimateCost('unknown-model', 1_000_000, 1_000_000);

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = estimateCost('claude-3-5-sonnet-20241022', 0, 0);

      expect(cost).toBe(0);
    });

    it('should calculate asymmetric input/output costs correctly', () => {
      const cost = estimateCost('claude-3-5-sonnet-20241022', 2_000_000, 500_000);

      expect(cost).toBe(13.5); // $6 input + $7.5 output
    });
  });

  describe('Model Data Integrity', () => {
    it('should have all required fields for Anthropic models', () => {
      const models = getModelsForProvider('anthropic');

      models.forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBe('anthropic');
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.costPer1MInputTokens).toBeGreaterThan(0);
        expect(model.costPer1MOutputTokens).toBeGreaterThan(0);
        expect(['fast', 'balanced', 'slow']).toContain(model.speed);
        expect(Array.isArray(model.capabilities)).toBe(true);
      });
    });

    it('should have all required fields for OpenAI models', () => {
      const models = getModelsForProvider('openai');

      models.forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBe('openai');
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.costPer1MInputTokens).toBeGreaterThan(0);
        expect(model.costPer1MOutputTokens).toBeGreaterThan(0);
        expect(['fast', 'balanced', 'slow']).toContain(model.speed);
        expect(Array.isArray(model.capabilities)).toBe(true);
      });
    });

    it('should have at least one recommended model per provider', () => {
      const anthropicModels = getModelsForProvider('anthropic');
      const openaiModels = getModelsForProvider('openai');

      const hasAnthropicRecommended = anthropicModels.some((m) => m.recommended);
      const hasOpenAIRecommended = openaiModels.some((m) => m.recommended);

      expect(hasAnthropicRecommended).toBe(true);
      expect(hasOpenAIRecommended).toBe(true);
    });
  });
});
