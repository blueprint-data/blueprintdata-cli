import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { WarehouseConnection, StorageType } from '@blueprintdata/models';

export interface DbtProfile {
  target: string;
  outputs: Record<string, DbtOutput>;
}

export interface DbtOutput {
  type: string;
  // Postgres/Redshift
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  dbname?: string;
  schema?: string;
  // Snowflake
  account?: string;
  warehouse?: string;
  role?: string;
  database?: string;
  authenticator?: string;
  private_key_path?: string;
  private_key_passphrase?: string;
  private_key?: string;
  // BigQuery
  project?: string;
  dataset?: string;
  location?: string;
  keyfile?: string;
  keyfile_json?: Record<string, unknown>;
  method?: string; // oauth, oauth-secrets, service-account, service-account-json, application-default
  // Common
  threads?: number;
}

export interface DbtProfiles {
  [profileName: string]: DbtProfile;
}

/**
 * Get the default dbt profiles path
 */
export const getDefaultProfilesPath = (): string => {
  return path.join(os.homedir(), '.dbt', 'profiles.yml');
};

/**
 * Check if dbt profiles file exists
 */
export const resolveProfilesPath = async (
  projectPath: string = process.cwd(),
  profilesPath?: string
): Promise<string> => {
  if (profilesPath) {
    return profilesPath;
  }

  const envProfilesDir = process.env.DBT_PROFILES_DIR;
  if (envProfilesDir && envProfilesDir.length > 0) {
    const envProfilesPath = path.join(envProfilesDir, 'profiles.yml');
    if (await fs.pathExists(envProfilesPath)) {
      return envProfilesPath;
    }
  }

  const localProfilesPath = path.join(projectPath, 'profiles.yml');
  if (await fs.pathExists(localProfilesPath)) {
    return localProfilesPath;
  }

  return getDefaultProfilesPath();
};

export const profilesExist = async (
  projectPath: string = process.cwd(),
  profilesPath?: string
): Promise<boolean> => {
  const profilePath = await resolveProfilesPath(projectPath, profilesPath);
  return await fs.pathExists(profilePath);
};

/**
 * Parse dbt profiles.yml file
 */
export const parseProfiles = async (
  projectPath: string = process.cwd(),
  profilesPath?: string
): Promise<DbtProfiles> => {
  const profilePath = await resolveProfilesPath(projectPath, profilesPath);

  if (!(await fs.pathExists(profilePath))) {
    throw new Error(`dbt profiles.yml not found at ${profilePath}`);
  }

  try {
    const content = await fs.readFile(profilePath, 'utf-8');
    const profiles = yaml.parse(content) as DbtProfiles;
    return profiles;
  } catch (error) {
    throw new Error(
      `Failed to parse profiles.yml: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Read dbt_project.yml to get profile name
 */
export const getDbtProfileName = async (projectPath: string = process.cwd()): Promise<string> => {
  const dbtProjectPath = path.join(projectPath, 'dbt_project.yml');

  if (!(await fs.pathExists(dbtProjectPath))) {
    throw new Error('dbt_project.yml not found. Make sure you are in a dbt project directory.');
  }

  try {
    const content = await fs.readFile(dbtProjectPath, 'utf-8');
    const project = yaml.parse(content) as { profile?: string; name?: string };

    // Use profile name from dbt_project.yml, fallback to project name
    return project.profile || project.name || 'default';
  } catch (error) {
    throw new Error(
      `Failed to parse dbt_project.yml: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Get dbt profile for the current project
 */
export const getDbtProfile = async (
  projectPath: string = process.cwd(),
  profilesPath?: string
): Promise<DbtProfile> => {
  const profileName = await getDbtProfileName(projectPath);
  const profiles = await parseProfiles(projectPath, profilesPath);

  const profile = profiles[profileName];
  if (!profile) {
    throw new Error(`Profile '${profileName}' not found in profiles.yml`);
  }

  return profile;
};

/**
 * Convert dbt output to warehouse connection
 */
export const dbtOutputToWarehouseConnection = (output: DbtOutput): WarehouseConnection => {
  const type = output.type as StorageType;

  if (type === 'bigquery') {
    return {
      type: 'bigquery',
      projectId: output.project,
      database: output.dataset || 'default',
      location: output.location,
      keyFilePath: output.keyfile,
      // Pass the authentication method so BigQuery connector can handle it
      // oauth, oauth-secrets, service-account, service-account-json, application-default
      schema: output.method, // Reusing schema field to pass auth method
    };
  } else if (type === 'snowflake') {
    return {
      type: 'snowflake',
      account: output.account,
      warehouse: output.warehouse,
      role: output.role,
      database: output.database || 'default',
      schema: output.schema,
      user: output.user,
      password: output.password,
      authenticator: output.authenticator,
      privateKey: output.private_key,
      privateKeyPath: output.private_key_path,
      privateKeyPassphrase: output.private_key_passphrase,
    };
  } else if (type === 'postgres' || type === 'redshift') {
    return {
      type: 'postgres',
      host: output.host,
      port: output.port || 5432,
      database: output.dbname || 'postgres',
      schema: output.schema || 'public',
      user: output.user,
      password: output.password,
    };
  } else {
    throw new Error(`Unsupported warehouse type: ${type}`);
  }
};

/**
 * Get warehouse connection from dbt profile
 */
export const getWarehouseConnectionFromDbt = async (
  projectPath: string = process.cwd(),
  profilesPath?: string,
  targetName?: string
): Promise<WarehouseConnection> => {
  const profile = await getDbtProfile(projectPath, profilesPath);
  const target = targetName || profile.target || 'dev';

  const output = profile.outputs[target];
  if (!output) {
    throw new Error(`Target '${target}' not found in profile`);
  }

  return dbtOutputToWarehouseConnection(output);
};

/**
 * Validate environment variables for LLM providers
 */
export const validateLLMApiKey = (provider: 'openrouter'): string | undefined => {
  if (provider !== 'openrouter') {
    return undefined;
  }
  return process.env.OPENROUTER_API_KEY;
};

/**
 * Check if running in a dbt project directory
 */
export const isDbtProject = async (projectPath: string = process.cwd()): Promise<boolean> => {
  const dbtProjectPath = path.join(projectPath, 'dbt_project.yml');
  return await fs.pathExists(dbtProjectPath);
};
