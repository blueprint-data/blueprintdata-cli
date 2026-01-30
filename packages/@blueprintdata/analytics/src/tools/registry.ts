import type { Tool, ToolDefinition } from './types.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}
