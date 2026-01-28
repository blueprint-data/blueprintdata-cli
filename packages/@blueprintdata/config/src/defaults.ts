/**
 * Default configuration values for the analytics agent
 */
export const DEFAULT_CONFIG = {
  /**
   * Interface configuration defaults
   */
  interface: {
    uiPort: 3000,
    gatewayPort: 8080,
  },

  /**
   * Profiling configuration defaults
   */
  profiling: {
    includeRowCounts: true,
    maxSampleSize: 1000,
    timeoutSeconds: 60,
  },

  /**
   * Warehouse configuration defaults
   */
  warehouse: {
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 60000, // 60 seconds
    poolSize: 10,
  },

  /**
   * LLM configuration defaults
   */
  llm: {
    maxRetries: 3,
    timeoutSeconds: 120,
  },
} as const;

/**
 * Get default UI port
 */
export function getDefaultUIPort(): number {
  return process.env.UI_PORT ? parseInt(process.env.UI_PORT, 10) : DEFAULT_CONFIG.interface.uiPort;
}

/**
 * Get default Gateway port
 */
export function getDefaultGatewayPort(): number {
  return process.env.GATEWAY_PORT
    ? parseInt(process.env.GATEWAY_PORT, 10)
    : DEFAULT_CONFIG.interface.gatewayPort;
}
