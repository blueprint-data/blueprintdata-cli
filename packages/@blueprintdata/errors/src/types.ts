/**
 * Base error class for all BlueprintData CLI errors
 */
export class BlueprintError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation errors (invalid input, missing files, etc.)
 */
export class ValidationError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

/**
 * Warehouse connection and query errors
 */
export class WarehouseConnectionError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'WAREHOUSE_CONNECTION_ERROR', cause);
  }
}

export class WarehouseQueryError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'WAREHOUSE_QUERY_ERROR', cause);
  }
}

/**
 * LLM API errors
 */
export class LLMAPIError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'LLM_API_ERROR', cause);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', cause);
  }
}

/**
 * dbt project errors
 */
export class DbtProjectError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'DBT_PROJECT_ERROR', cause);
  }
}

/**
 * File system errors
 */
export class FileSystemError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'FILE_SYSTEM_ERROR', cause);
  }
}

/**
 * Context building errors
 */
export class ContextBuildError extends BlueprintError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONTEXT_BUILD_ERROR', cause);
  }
}
