import { describe, it, expect } from 'bun:test';
import { tryAsync, tryAsyncResult, trySync, formatErrorMessage, isErrorType } from '../handlers.js';
import {
  BlueprintError,
  ValidationError,
  ConfigurationError,
  WarehouseConnectionError,
} from '../types.js';

describe('Error Handlers', () => {
  describe('tryAsync', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success';

      const result = await tryAsync(fn, 'Test error', ValidationError);

      expect(result).toBe('success');
    });

    it('should throw custom error on failure', async () => {
      const fn = async () => {
        throw new Error('Original error');
      };

      await expect(tryAsync(fn, 'Custom message', ValidationError)).rejects.toThrow(
        ValidationError
      );

      try {
        await tryAsync(fn, 'Custom message', ValidationError);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Custom message');
        expect((error as ValidationError).cause?.message).toBe('Original error');
      }
    });

    it('should preserve error cause chain', async () => {
      const originalError = new Error('Root cause');
      const fn = async () => {
        throw originalError;
      };

      try {
        await tryAsync(fn, 'Wrapped error', ConfigurationError);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).cause).toBe(originalError);
      }
    });

    it('should handle non-Error thrown values', async () => {
      const fn = async () => {
        throw 'String error';
      };

      try {
        await tryAsync(fn, 'Custom message', ValidationError);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).cause).toBeUndefined();
      }
    });
  });

  describe('trySync', () => {
    it('should return result on success', () => {
      const fn = () => 'success';

      const result = trySync(fn, 'Test error', ValidationError);

      expect(result).toBe('success');
    });

    it('should throw custom error on failure', () => {
      const fn = () => {
        throw new Error('Original error');
      };

      expect(() => trySync(fn, 'Custom message', ValidationError)).toThrow(ValidationError);

      try {
        trySync(fn, 'Custom message', ValidationError);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Custom message');
        expect((error as ValidationError).cause?.message).toBe('Original error');
      }
    });

    it('should handle complex return types', () => {
      const fn = () => ({ data: 'test', count: 42 });

      const result = trySync(fn, 'Error message', ValidationError);

      expect(result).toEqual({ data: 'test', count: 42 });
    });
  });

  describe('tryAsyncResult', () => {
    it('should return success Result on success', async () => {
      const fn = async () => 'success';

      const result = await tryAsyncResult(fn, 'Test error', ValidationError);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('should return failure Result on error', async () => {
      const fn = async () => {
        throw new Error('Original error');
      };

      const result = await tryAsyncResult(fn, 'Custom message', ValidationError);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Custom message');
        expect(result.error.cause?.message).toBe('Original error');
      }
    });

    it('should not throw errors', async () => {
      const fn = async () => {
        throw new Error('Original error');
      };

      await expect(
        tryAsyncResult(fn, 'Custom message', ValidationError)
      ).resolves.toBeDefined();
    });

    it('should handle complex return types', async () => {
      const fn = async () => ({ data: ['a', 'b', 'c'], count: 3 });

      const result = await tryAsyncResult(fn, 'Error message', ValidationError);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(3);
        expect(result.data.data).toHaveLength(3);
      }
    });
  });

  describe('formatErrorMessage', () => {
    it('should format BlueprintError with cause', () => {
      const cause = new Error('Root cause');
      const error = new ValidationError('Main message', cause);

      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('Main message');
      expect(formatted).toContain('Caused by: Root cause');
    });

    it('should format BlueprintError without cause', () => {
      const error = new ValidationError('Main message');

      const formatted = formatErrorMessage(error);

      expect(formatted).toBe('Main message');
      expect(formatted).not.toContain('Caused by');
    });

    it('should format standard Error', () => {
      const error = new Error('Standard error');

      const formatted = formatErrorMessage(error);

      expect(formatted).toBe('Standard error');
    });

    it('should format unknown error types', () => {
      const formatted = formatErrorMessage('string error');

      expect(formatted).toBe('An unknown error occurred');
    });

    it('should handle null and undefined', () => {
      const formatted1 = formatErrorMessage(null);
      const formatted2 = formatErrorMessage(undefined);

      expect(formatted1).toBe('An unknown error occurred');
      expect(formatted2).toBe('An unknown error occurred');
    });
  });

  describe('isErrorType', () => {
    it('should correctly identify error types', () => {
      const validationError = new ValidationError('Validation failed');
      const configError = new ConfigurationError('Config failed');
      const warehouseError = new WarehouseConnectionError('Connection failed');
      const standardError = new Error('Standard error');

      expect(isErrorType(validationError, ValidationError)).toBe(true);
      expect(isErrorType(configError, ConfigurationError)).toBe(true);
      expect(isErrorType(warehouseError, WarehouseConnectionError)).toBe(true);

      expect(isErrorType(validationError, ConfigurationError)).toBe(false);
      expect(isErrorType(standardError, ValidationError)).toBe(false);
      expect(isErrorType('string', ValidationError)).toBe(false);
    });

    it('should check against base BlueprintError', () => {
      const validationError = new ValidationError('Validation failed');
      const configError = new ConfigurationError('Config failed');

      expect(isErrorType(validationError, BlueprintError)).toBe(true);
      expect(isErrorType(configError, BlueprintError)).toBe(true);
    });

    it('should return false for non-errors', () => {
      expect(isErrorType('string', ValidationError)).toBe(false);
      expect(isErrorType(123, ValidationError)).toBe(false);
      expect(isErrorType(null, ValidationError)).toBe(false);
      expect(isErrorType(undefined, ValidationError)).toBe(false);
    });
  });

  describe('Error Hierarchy', () => {
    it('should maintain error hierarchy', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(BlueprintError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set correct error codes', () => {
      const validationError = new ValidationError('Test');
      const configError = new ConfigurationError('Test');

      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(configError.code).toBe('CONFIGURATION_ERROR');
    });

    it('should handle error cause properly', () => {
      const cause = new Error('Original');
      const error = new ValidationError('Wrapped', cause);

      expect(error.cause).toBe(cause);
      expect(error.cause.message).toBe('Original');
    });
  });
});
