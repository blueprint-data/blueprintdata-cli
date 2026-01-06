export type StackType = 'lite' | 'aws';

export type StorageType = 'postgres' | 'bigquery';

export interface ProjectConfig {
  stackType: StackType;
  projectName: string;
  storageType: StorageType;
  targetDir: string;
}

export interface TemplateConfig {
  name: string;
  repoUrl: string;
  branch?: string;
  path: string;
}

export interface TemplateOptions {
  force?: boolean;
  offline?: boolean;
}

export interface FetchedTemplate {
  path: string;
  isTemporary: boolean;
}
