import { StackType, StorageType, TemplateConfig } from '@blueprintdata/models';
import path from 'path';

export const REPO_URL = 'github:blueprint-data/blueprintdata-cli';

export const DEFAULT_BRANCH = 'main';

export const LOCAL_TEMPLATE_DIR = path.join(process.cwd(), 'templates');

export const TEMPLATE_MAPPINGS: Record<StackType, TemplateConfig> = {
  lite: {
    name: 'lite-data-stack-bigquery',
    repoUrl: REPO_URL,
    branch: DEFAULT_BRANCH,
    path: 'templates/lite-data-stack-bigquery',
  },
  'lite-bigquery': {
    name: 'lite-data-stack-bigquery',
    repoUrl: REPO_URL,
    branch: DEFAULT_BRANCH,
    path: 'templates/lite-data-stack-bigquery',
  },
  'lite-postgres': {
    name: 'lite-data-stack-postgres',
    repoUrl: REPO_URL,
    branch: DEFAULT_BRANCH,
    path: 'templates/lite-data-stack-postgres',
  },
  aws: {
    name: 'aws-data-stack',
    repoUrl: REPO_URL,
    branch: DEFAULT_BRANCH,
    path: 'templates/aws-data-stack',
  },
};

export const STORAGE_DISPLAY_NAMES: Record<StorageType, string> = {
  postgres: 'PostgreSQL',
  bigquery: 'BigQuery',
};

export const STORAGE_ENV_VARS: Record<StorageType, string[]> = {
  postgres: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
  bigquery: ['GOOGLE_CREDENTIALS_PATH', 'BIGQUERY_PROJECT_ID', 'BIGQUERY_DATASET_ID'],
};

export const PLACEHOLDERS = {
  PROJECT_NAME: '{{PROJECT_NAME}}',
  STORAGE_TYPE: '{{STORAGE_TYPE}}',
  STORAGE_DISPLAY_NAME: '{{STORAGE_DISPLAY_NAME}}',
};

export const IGNORED_DIRS = ['.git', 'node_modules', 'dist', 'coverage'];

export const README_NEXT_STEPS = [
  'cd {{PROJECT_NAME}}',
  'Review the .env.example file and configure your environment variables',
  'Run extraction: `cd extraction && meltano install && meltano run tap-target`',
  'Run transform: `cd transform && dbt run`',
  'See README.md for detailed setup instructions',
];
