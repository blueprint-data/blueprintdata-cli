import { LLMProvider } from '../../types.js';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;
  speed: 'fast' | 'balanced' | 'slow';
  capabilities: string[];
  recommended?: 'chat' | 'profiling' | 'general';
}

/**
 * Anthropic Claude models
 */
export const ANTHROPIC_MODELS: LLMModel[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MInputTokens: 3.0,
    costPer1MOutputTokens: 15.0,
    speed: 'balanced',
    capabilities: ['analysis', 'reasoning', 'code', 'long-context'],
    recommended: 'general',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MInputTokens: 1.0,
    costPer1MOutputTokens: 5.0,
    speed: 'fast',
    capabilities: ['analysis', 'speed', 'cost-effective'],
    recommended: 'profiling',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1MInputTokens: 15.0,
    costPer1MOutputTokens: 75.0,
    speed: 'slow',
    capabilities: ['analysis', 'reasoning', 'complex-tasks', 'highest-quality'],
    recommended: undefined,
  },
];

/**
 * OpenAI GPT models
 */
export const OPENAI_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MInputTokens: 2.5,
    costPer1MOutputTokens: 10.0,
    speed: 'balanced',
    capabilities: ['analysis', 'vision', 'code', 'multimodal'],
    recommended: 'general',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MInputTokens: 0.15,
    costPer1MOutputTokens: 0.6,
    speed: 'fast',
    capabilities: ['analysis', 'speed', 'cost-effective'],
    recommended: 'profiling',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    costPer1MInputTokens: 10.0,
    costPer1MOutputTokens: 30.0,
    speed: 'balanced',
    capabilities: ['analysis', 'reasoning', 'code'],
    recommended: undefined,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    costPer1MInputTokens: 0.5,
    costPer1MOutputTokens: 1.5,
    speed: 'fast',
    capabilities: ['speed', 'cost-effective'],
    recommended: undefined,
  },
];

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
