import fs from 'fs-extra';
import path from 'path';
import { AnalyticsConfig } from '../types.js';

const CONFIG_DIR = '.blueprintdata';
const CONFIG_FILE = 'config.json';

/**
 * Get the path to the config directory
 */
export const getConfigDir = (projectPath: string = process.cwd()): string => {
  return path.join(projectPath, CONFIG_DIR);
};

/**
 * Get the path to the config file
 */
export const getConfigPath = (projectPath: string = process.cwd()): string => {
  return path.join(getConfigDir(projectPath), CONFIG_FILE);
};

/**
 * Check if analytics is initialized (config exists)
 */
export const isAnalyticsInitialized = async (
  projectPath: string = process.cwd()
): Promise<boolean> => {
  const configPath = getConfigPath(projectPath);
  return await fs.pathExists(configPath);
};

/**
 * Load analytics configuration
 */
export const loadConfig = async (projectPath: string = process.cwd()): Promise<AnalyticsConfig> => {
  const configPath = getConfigPath(projectPath);

  if (!(await fs.pathExists(configPath))) {
    throw new Error(`Analytics not initialized. Run 'blueprintdata analytics init' first.`);
  }

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData) as AnalyticsConfig;
    return config;
  } catch (error) {
    throw new Error(
      `Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Save analytics configuration
 */
export const saveConfig = async (
  config: AnalyticsConfig,
  projectPath: string = process.cwd()
): Promise<void> => {
  const configDir = getConfigDir(projectPath);
  const configPath = getConfigPath(projectPath);

  // Ensure config directory exists
  await fs.ensureDir(configDir);

  // Write config file
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
};

/**
 * Update analytics configuration
 */
export const updateConfig = async (
  updates: Partial<AnalyticsConfig>,
  projectPath: string = process.cwd()
): Promise<AnalyticsConfig> => {
  const config = await loadConfig(projectPath);
  const updatedConfig = { ...config, ...updates };
  await saveConfig(updatedConfig, projectPath);
  return updatedConfig;
};

/**
 * Delete analytics configuration
 */
export const deleteConfig = async (projectPath: string = process.cwd()): Promise<void> => {
  const configDir = getConfigDir(projectPath);
  if (await fs.pathExists(configDir)) {
    await fs.remove(configDir);
  }
};
