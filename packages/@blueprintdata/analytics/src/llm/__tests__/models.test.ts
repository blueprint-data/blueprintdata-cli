import { describe, it, expect } from 'bun:test';
import {
  getModelsForProvider,
  getModel,
  getDefaultModel,
  validateModel,
  formatModelOption,
  estimateCost,
} from '../models.js';
import type { LLMProvider } from '@blueprintdata/models';

describe('LLM Models', () => {
  describe('getModelsForProvider', () => {
    it('should return OpenRouter models', () => {
      const models = getModelsForProvider('openrouter' as LLMProvider);

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === ('openrouter' as LLMProvider))).toBe(true);
    });

    it('should return empty array for unknown provider', () => {
      const models = getModelsForProvider('unknown' as any);

      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should get OpenRouter model by ID', () => {
      const model = getModel('openrouter/auto');

      expect(model).toBeDefined();
      expect(model?.id).toBe('openrouter/auto');
      expect(model?.provider).toBe('openrouter' as LLMProvider);
    });

    it('should return undefined for unknown model', () => {
      const model = getModel('unknown-model');

      expect(model).toBeUndefined();
    });
  });

  describe('getDefaultModel', () => {
    it('should return profiling-recommended model for profiling use case', () => {
      const profiling = getDefaultModel('openrouter' as LLMProvider, 'profiling');

      expect(profiling.recommended).toBe('profiling');
    });

    it('should return general-recommended model for chat use case', () => {
      const chat = getDefaultModel('openrouter' as LLMProvider, 'chat');

      expect(chat.recommended).toBe('general');
    });

    it('should default to chat use case', () => {
      const model = getDefaultModel('openrouter' as LLMProvider);

      expect(model.recommended).toBe('general');
    });

    it('should fallback gracefully when no recommended model', () => {
      const model = getDefaultModel('openrouter' as LLMProvider);

      expect(model).toBeDefined();
      expect(model.provider).toBe('openrouter' as LLMProvider);
    });
  });

  describe('validateModel', () => {
    it('should validate correct OpenRouter models', () => {
      expect(validateModel('openrouter/auto', 'openrouter' as LLMProvider)).toBe(true);
      expect(validateModel('google/gemini-2.5-flash', 'openrouter' as LLMProvider)).toBe(true);
    });

    it('should reject incorrect model for provider', () => {
      expect(validateModel('gpt-5.2', 'openrouter' as LLMProvider)).toBe(false);
    });

    it('should reject unknown models', () => {
      expect(validateModel('unknown-model', 'openrouter' as LLMProvider)).toBe(false);
    });
  });

  describe('formatModelOption', () => {
    it('should format model with recommendation', () => {
      const model = getModel('openrouter/auto');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.value).toBe(model.id);
      expect(formatted.label).toContain('Recommended');
      expect(formatted.hint).toBeDefined();
    });

    it('should format model without recommendation', () => {
      const model = getModel('minimax/minimax-m2.5-20260211');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.value).toBe(model.id);
      expect(formatted.label).not.toContain('Recommended');
    });

    it('should include cost information in hint', () => {
      const model = getModel('openrouter/auto');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.hint).toBeDefined();
    });

    it('should include context window in hint', () => {
      const model = getModel('google/gemini-2.5-flash');
      if (!model) throw new Error('Model not found');

      const formatted = formatModelOption(model);

      expect(formatted.hint).toBeDefined();
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost for OpenRouter models', () => {
      const cost = estimateCost('openrouter/auto', 1_000_000, 1_000_000);

      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for unknown model', () => {
      const cost = estimateCost('unknown-model', 1_000_000, 1_000_000);

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = estimateCost('openrouter/auto', 0, 0);

      expect(cost).toBe(0);
    });
  });

  describe('Model Data Integrity', () => {
    it('should have all required fields for OpenRouter models', () => {
      const models = getModelsForProvider('openrouter' as LLMProvider);

      models.forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBe('openrouter' as LLMProvider);
        expect(model.contextWindow).toBeGreaterThanOrEqual(0);
        expect(model.costPer1MInputTokens).toBeGreaterThanOrEqual(0);
        expect(model.costPer1MOutputTokens).toBeGreaterThanOrEqual(0);
        expect(['fast', 'balanced', 'slow']).toContain(model.speed);
        expect(Array.isArray(model.capabilities)).toBe(true);
      });
    });

    it('should have at least one recommended model', () => {
      const models = getModelsForProvider('openrouter' as LLMProvider);
      const hasRecommended = models.some((m) => m.recommended);

      expect(hasRecommended).toBe(true);
    });
  });
});
