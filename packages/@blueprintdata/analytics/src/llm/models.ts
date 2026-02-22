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
  lastUpdated: '2026-02-22',
  openrouter: [
    {
      id: 'openrouter/auto',
      name: 'OpenRouter Auto Router',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['routing', 'auto', 'balanced'],
      recommended: 'general',
    },
    {
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'fast',
      capabilities: ['speed', 'cost-effective'],
      recommended: 'profiling',
    },
    {
      id: 'minimax/minimax-m2.5-20260211',
      name: 'Minimax M2.5',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['analysis', 'general'],
      recommended: null,
    },
    {
      id: 'moonshotai/kimi-k2.5-0127',
      name: 'Kimi K2.5 0127',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['analysis', 'general'],
      recommended: null,
    },
    {
      id: 'z-ai/glm-5-20260211',
      name: 'GLM 5',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['analysis', 'general'],
      recommended: null,
    },
    {
      id: 'google/gemini-3-flash-preview-20251217',
      name: 'Gemini 3 Flash Preview',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'fast',
      capabilities: ['speed', 'preview'],
      recommended: null,
    },
    {
      id: 'deepseek/deepseek-v3.2-20251201',
      name: 'Deepseek V3.2',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['analysis', 'general'],
      recommended: null,
    },
    {
      id: 'x-ai/grok-4.1-fast',
      name: 'Grok 4.1 Fast',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'fast',
      capabilities: ['speed', 'general'],
      recommended: null,
    },
    {
      id: 'anthropic/claude-4.6-opus-20260205',
      name: 'Claude Opus 4.6',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'slow',
      capabilities: ['analysis', 'reasoning'],
      recommended: null,
    },
    {
      id: 'anthropic/claude-4.5-sonnet-20250929',
      name: 'Claude Sonnet 4.5',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'balanced',
      capabilities: ['analysis', 'reasoning'],
      recommended: null,
    },
    {
      id: 'arcee-ai/trinity-large-preview:free',
      name: 'Trinity Large Preview (free)',
      provider: 'openrouter',
      contextWindow: 0,
      costPer1MInputTokens: 0,
      costPer1MOutputTokens: 0,
      speed: 'fast',
      capabilities: ['free', 'preview'],
      recommended: null,
    },
  ],
};

export const OPENROUTER_MODELS: LLMModel[] = modelsConfig.openrouter.map((model) => ({
  ...model,
  recommended: model.recommended || undefined,
})) as LLMModel[];

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: LLMProvider): LLMModel[] {
  if (provider === 'openrouter') {
    return OPENROUTER_MODELS;
  }
  return [];
}

/**
 * Get a specific model by ID
 */
export function getModel(modelId: string): LLMModel | undefined {
  const allModels = [...OPENROUTER_MODELS];
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
    model.contextWindow > 0
      ? `${(model.contextWindow / 1000).toFixed(0)}K context`
      : 'Context varies',
    model.costPer1MInputTokens > 0 || model.costPer1MOutputTokens > 0
      ? `$${model.costPer1MInputTokens}/$${model.costPer1MOutputTokens} per 1M tokens`
      : 'Pricing varies',
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
