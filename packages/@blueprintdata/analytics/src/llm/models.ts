import { LLMProvider } from '@blueprintdata/models';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  speed: 'fast' | 'balanced' | 'slow';
  capabilities: string[];
  recommended?: 'chat' | 'profiling' | 'general' | null;
}

const modelsConfig = {
  lastUpdated: '2026-02-11',
  anthropic: [
    {
      id: 'claude-opus-4-6',
      name: 'Claude Opus 4.6',
      provider: 'anthropic',
      contextWindow: 200000,
      costPer1MInputTokens: 5.0,
      costPer1MOutputTokens: 25.0,
      speed: 'slow',
      capabilities: ['analysis', 'reasoning', 'code', 'highest-quality', 'long-context'],
      recommended: null,
    },
    {
      id: 'claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      costPer1MInputTokens: 3.0,
      costPer1MOutputTokens: 15.0,
      speed: 'balanced',
      capabilities: ['analysis', 'reasoning', 'code', 'long-context'],
      recommended: 'general',
    },
    {
      id: 'claude-haiku-4-5',
      name: 'Claude Haiku 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      costPer1MInputTokens: 1.0,
      costPer1MOutputTokens: 5.0,
      speed: 'fast',
      capabilities: ['analysis', 'speed', 'cost-effective'],
      recommended: 'profiling',
    },
  ],
  openai: [
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      provider: 'openai',
      contextWindow: 400000,
      costPer1MInputTokens: 1.75,
      costPer1MOutputTokens: 14.0,
      speed: 'balanced',
      capabilities: ['analysis', 'reasoning', 'code', 'multimodal', 'long-context'],
      recommended: 'general',
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 mini',
      provider: 'openai',
      contextWindow: 400000,
      costPer1MInputTokens: 0.25,
      costPer1MOutputTokens: 2.0,
      speed: 'fast',
      capabilities: ['analysis', 'speed', 'cost-effective'],
      recommended: 'profiling',
    },
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 nano',
      provider: 'openai',
      contextWindow: 400000,
      costPer1MInputTokens: 0.05,
      costPer1MOutputTokens: 0.4,
      speed: 'fast',
      capabilities: ['speed', 'cost-effective'],
      recommended: null,
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'openai',
      contextWindow: 1047576,
      costPer1MInputTokens: 2.0,
      costPer1MOutputTokens: 8.0,
      speed: 'balanced',
      capabilities: ['analysis', 'code', 'long-context'],
      recommended: null,
    },
  ],
};

export const ANTHROPIC_MODELS: LLMModel[] = modelsConfig.anthropic.map((model) => ({
  ...model,
  recommended: model.recommended || undefined,
})) as LLMModel[];

export const OPENAI_MODELS: LLMModel[] = modelsConfig.openai.map((model) => ({
  ...model,
  recommended: model.recommended || undefined,
})) as LLMModel[];

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  if (provider === 'anthropic') {
    return ANTHROPIC_MODELS;
  } else if (provider === 'openai') {
    return OPENAI_MODELS;
  }
  return [];
}

/**
 * Get a specific model by ID
 */
export function getModel(modelId: string): LLMModel | undefined {
  const allModels = [...ANTHROPIC_MODELS, ...OPENAI_MODELS];
  return allModels.find((m) => m.id === modelId);
}

/**
 * Get the default model for a provider and use case
 */
export function getDefaultModel(
  provider: LLMProvider,
  useCase: 'chat' | 'profiling' = 'chat'
): LLMModel {
  const models = getModelsForProvider(provider);

  if (useCase === 'profiling') {
    // Prefer profiling-recommended model
    const profilingModel = models.find((m) => m.recommended === 'profiling');
    if (profilingModel) return profilingModel;
  }

  // Fall back to general-recommended model
  const generalModel = models.find((m) => m.recommended === 'general');
  if (generalModel) return generalModel;

  // Last resort: first model
  return models[0];
}

/**
 * Validate that a model ID is valid for a provider
 */
export function validateModel(modelId: string, provider: LLMProvider): boolean {
  const models = getModelsForProvider(provider);
  return models.some((m) => m.id === modelId);
}

/**
 * Format model for display in selection prompts
 */
export function formatModelOption(model: LLMModel): {
  value: string;
  label: string;
  hint?: string;
} {
  let label = model.name;

  if (model.recommended === 'general') {
    label += ' (Recommended)';
  } else if (model.recommended === 'profiling') {
    label += ' (Recommended - Cost Effective)';
  }

  const hint = [
    `${model.speed === 'fast' ? 'Fast' : model.speed === 'slow' ? 'Slower' : 'Balanced'}`,
    `${(model.contextWindow / 1000).toFixed(0)}K context`,
    `$${model.costPer1MInputTokens}/$${model.costPer1MOutputTokens} per 1M tokens`,
  ].join(' • ');

  return {
    value: model.id,
    label,
    hint,
  };
}

/**
 * Calculate cost estimate for token usage
 */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModel(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.costPer1MInputTokens;
  const outputCost = (outputTokens / 1_000_000) * model.costPer1MOutputTokens;

  return inputCost + outputCost;
}
