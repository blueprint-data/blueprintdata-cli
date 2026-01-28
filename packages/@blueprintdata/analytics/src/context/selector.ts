import { DbtModel } from './scanner.js';
import { DbtManifest } from './dbt-integration.js';
import { ModelSelector } from '@blueprintdata/models';

/**
 * Select models based on dbt selection syntax
 * Supports:
 * - model_name (exact match)
 * - fct_* (wildcard)
 * - +model (upstream)
 * - model+ (downstream)
 * - +model+ (upstream and downstream)
 * - tag:tagname
 * - path:folder/*
 */
export class DbtModelSelector {
  private allModels: DbtModel[];
  private manifest?: DbtManifest;

  constructor(allModels: DbtModel[], manifest?: DbtManifest) {
    this.allModels = allModels;
    this.manifest = manifest;
  }

  /**
   * Select models based on selector patterns
   */
  select(selector: ModelSelector): DbtModel[] {
    let selected = this.allModels;

    // Apply include patterns
    if (selector.include && selector.include.length > 0) {
      const included = new Set<string>();

      for (const pattern of selector.include) {
        const matches = this.matchPattern(pattern, this.allModels);
        matches.forEach((model) => included.add(model.name));
      }

      selected = selected.filter((model) => included.has(model.name));
    }

    // Apply exclude patterns
    if (selector.exclude && selector.exclude.length > 0) {
      const excluded = new Set<string>();

      for (const pattern of selector.exclude) {
        const matches = this.matchPattern(pattern, this.allModels);
        matches.forEach((model) => excluded.add(model.name));
      }

      selected = selected.filter((model) => !excluded.has(model.name));
    }

    return selected;
  }

  /**
   * Match a single pattern against models
   */
  private matchPattern(pattern: string, models: DbtModel[]): DbtModel[] {
    // Check for upstream/downstream operators
    if (pattern.startsWith('+') && pattern.endsWith('+')) {
      // +model+ (upstream and downstream)
      const modelName = pattern.slice(1, -1);
      return this.getUpstreamAndDownstream(modelName, models);
    } else if (pattern.startsWith('+')) {
      // +model (model and upstream)
      const modelName = pattern.slice(1);
      return this.getUpstream(modelName, models);
    } else if (pattern.endsWith('+')) {
      // model+ (model and downstream)
      const modelName = pattern.slice(0, -1);
      return this.getDownstream(modelName, models);
    }

    // Check for tag selector
    if (pattern.startsWith('tag:')) {
      const tagName = pattern.slice(4);
      return this.matchByTag(tagName, models);
    }

    // Check for path selector
    if (pattern.startsWith('path:')) {
      const pathPattern = pattern.slice(5);
      return this.matchByPath(pathPattern, models);
    }

    // Check for wildcard pattern
    if (pattern.includes('*')) {
      return this.matchWildcard(pattern, models);
    }

    // Exact match
    return models.filter((model) => model.name === pattern);
  }

  /**
   * Match models by wildcard pattern
   */
  private matchWildcard(pattern: string, models: DbtModel[]): DbtModel[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return models.filter((model) => regex.test(model.name));
  }

  /**
   * Match models by tag
   */
  private matchByTag(tag: string, models: DbtModel[]): DbtModel[] {
    if (!this.manifest) {
      // Fallback: can't match by tag without manifest
      return [];
    }

    const taggedModels = new Set<string>();

    Object.values(this.manifest.nodes).forEach((node) => {
      if (node.resource_type === 'model' && node.tags.includes(tag)) {
        taggedModels.add(node.name);
      }
    });

    return models.filter((model) => taggedModels.has(model.name));
  }

  /**
   * Match models by path pattern
   */
  private matchByPath(pathPattern: string, models: DbtModel[]): DbtModel[] {
    const regex = new RegExp(pathPattern.replace(/\*/g, '.*'));
    return models.filter((model) => regex.test(model.relativePath));
  }

  /**
   * Get a model and all its upstream dependencies
   */
  private getUpstream(modelName: string, models: DbtModel[]): DbtModel[] {
    const result = new Set<string>();
    const queue = [modelName];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (result.has(current)) continue;
      result.add(current);

      const model = models.find((m) => m.name === current);
      if (model) {
        // Add upstream refs
        queue.push(...model.refs);
      }
    }

    return models.filter((model) => result.has(model.name));
  }

  /**
   * Get a model and all its downstream dependents
   */
  private getDownstream(modelName: string, models: DbtModel[]): DbtModel[] {
    const result = new Set<string>();
    const queue = [modelName];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (result.has(current)) continue;
      result.add(current);

      // Find models that reference this model
      const dependents = models.filter((m) => m.refs.includes(current));
      queue.push(...dependents.map((m) => m.name));
    }

    return models.filter((model) => result.has(model.name));
  }

  /**
   * Get a model, all its upstream, and all its downstream
   */
  private getUpstreamAndDownstream(modelName: string, models: DbtModel[]): DbtModel[] {
    const upstream = this.getUpstream(modelName, models);
    const downstream = this.getDownstream(modelName, models);

    const combined = new Set<string>();
    upstream.forEach((model) => combined.add(model.name));
    downstream.forEach((model) => combined.add(model.name));

    return models.filter((model) => combined.has(model.name));
  }
}

/**
 * Parse selection string into ModelSelector
 * Examples:
 *   "marts.*" -> { include: ["marts.*"] }
 *   "fct_*" -> { include: ["fct_*"] }
 */
export function parseSelectionString(selection: string): ModelSelector {
  return {
    include: [selection],
  };
}

/**
 * Helper function to select models
 */
export function selectModels(
  allModels: DbtModel[],
  selector: ModelSelector,
  manifest?: DbtManifest
): DbtModel[] {
  const modelSelector = new DbtModelSelector(allModels, manifest);
  return modelSelector.select(selector);
}
