import { BlueprintError } from './types.js';

/**
 * Result type for operations that can fail
 */
export type Result<T, E = BlueprintError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Wrap an async operation with standardized error handling
 *
 * @param fn - The async function to execute
 * @param errorMessage - Custom error message
 * @param ErrorClass - Error class to instantiate on failure
 * @returns Promise with the result
 *
 * @example
 * ```typescript
 * const config = await tryAsync(
 *   () => fs.readFile(configPath, 'utf-8'),
 *   'Failed to load config',
 *   ConfigurationError
 * );
 * ```
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  ErrorClass: new (message: string, cause?: Error) => BlueprintError
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    throw new ErrorClass(errorMessage, cause);
  }
}

/**
 * Wrap a sync operation with standardized error handling
 *
 * @param fn - The sync function to execute
 * @param errorMessage - Custom error message
 * @param ErrorClass - Error class to instantiate on failure
 * @returns The result
 *
 * @example
 * ```typescript
 * const parsed = trySync(
 *   () => JSON.parse(data),
 *   'Failed to parse JSON',
 *   ConfigurationError
 * );
 * ```
 */
export function trySync<T>(
  fn: () => T,
  errorMessage: string,
  ErrorClass: new (message: string, cause?: Error) => BlueprintError
): T {
  try {
    return fn();
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    throw new ErrorClass(errorMessage, cause);
  }
}

/**
 * Wrap an async operation and return a Result type instead of throwing
 *
 * @param fn - The async function to execute
 * @param errorMessage - Custom error message
 * @param ErrorClass - Error class to instantiate on failure
 * @returns Promise with Result type
 *
 * @example
 * ```typescript
 * const result = await tryAsyncResult(
 *   () => connector.testConnection(),
 *   'Failed to test connection',
 *   WarehouseConnectionError
 * );
 *
 * if (result.success) {
 *   console.log('Success:', result.data);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export async function tryAsyncResult<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  ErrorClass: new (message: string, cause?: Error) => BlueprintError
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    const blueprintError = new ErrorClass(errorMessage, cause);
    return { success: false, error: blueprintError };
  }
}

/**
 * Format error message for user display
 *
 * @param error - The error to format
 * @returns Formatted error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof BlueprintError) {
    let message = error.message;
    if (error.cause) {
      message += `\n  Caused by: ${error.cause.message}`;
    }
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Check if error is a specific type
 *
 * @param error - The error to check
 * @param ErrorClass - The error class to check against
 * @returns True if error is instance of ErrorClass
 */
export function isErrorType(
  error: unknown,
  ErrorClass: typeof BlueprintError
): error is InstanceType<typeof ErrorClass> {
  return error instanceof ErrorClass;
}
