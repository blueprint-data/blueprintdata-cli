import type { Database } from '@blueprintdata/database';
import type { BaseWarehouseConnector } from '@blueprintdata/warehouse';

export interface ToolContext {
  database: Database;
  warehouse: BaseWarehouseConnector;
  agentContextPath: string;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown>;
}
