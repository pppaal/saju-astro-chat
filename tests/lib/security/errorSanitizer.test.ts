import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeErrorMessage,
  getGenericError,
  createSafeErrorResponse,
  sanitizeError,
  type ErrorCategory,
} from '@/lib/security/errorSanitizer';
import { logger } from '@/lib/logger';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('errorSanitizer', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('sanitizeErrorMessage', () => {
    it('should return generic message for null/undefined input', () => {
      expect(sanitizeErrorMessage(null as unknown as string)).toBe('Internal server error');
      expect(sanitizeErrorMessage(undefined as unknown as string)).toBe('Internal server error');
      expect(sanitizeErrorMessage('')).toBe('Internal server error');
    });

    it('should handle non-string input gracefully', () => {
      // For non-string inputs, they get converted to strings, so check they don't throw
      const result1 = sanitizeErrorMessage(123 as unknown as string);
      expect(result1).toBeDefined();

      const result2 = sanitizeErrorMessage({} as unknown as string);
      expect(result2).toBeDefined();

      const result3 = sanitizeErrorMessage([] as unknown as string);
      expect(result3).toBeDefined();
    });

    it('should redact OpenAI API keys', () => {
      const message = 'Error: Invalid API key sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('sk-proj-');
    });

    it('should redact Stripe live keys', () => {
      const message = 'Payment failed: sk_live_51H7ZvwKZvKZvKZvKZvKZvwKZvK';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('sk_live_');
    });

    it('should redact Stripe test keys', () => {
      const message = 'Test error: sk_test_51H7ZvwKZvKZvKZvKZvKZvwKZvK';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('sk_test_');
    });

    it('should redact Bearer tokens', () => {
      const message = 'Auth failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('Bearer');
    });

    it('should redact PostgreSQL connection strings', () => {
      const message = 'DB error: postgres://user:password@localhost:5432/dbname';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('postgres://');
      expect(sanitized).not.toContain('password');
    });

    it('should redact MySQL connection strings', () => {
      const message = 'Connection failed: mysql://root:secret@db.example.com/mydb';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('mysql://');
      expect(sanitized).not.toContain('secret');
    });

    it('should redact MongoDB connection strings', () => {
      const message = 'Mongo error: mongodb://admin:pass123@cluster.mongodb.net/db';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('mongodb://');
      expect(sanitized).not.toContain('pass123');
    });

    it('should redact email addresses', () => {
      const message = 'User not found: john.doe@example.com';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('@example.com');
    });

    it('should redact internal IP addresses (10.x.x.x)', () => {
      const message = 'Server error at 10.0.1.42';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('10.0.1.42');
    });

    it('should redact internal IP addresses (192.168.x.x)', () => {
      const message = 'Request from 192.168.1.100';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('192.168.1.100');
    });

    it('should redact internal IP addresses (172.16-31.x.x)', () => {
      const message = 'Host 172.16.0.50 unreachable';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('172.16.0.50');
    });

    it('should redact Windows file paths', () => {
      const message = 'Error reading C:\\Users\\Admin\\Documents\\secret.txt';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('C:\\Users');
    });

    it('should redact Unix file paths', () => {
      const message = 'Cannot access /home/user/.env file';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('/home/user');
    });

    it('should redact stack trace paths with node_modules', () => {
      const message = 'Error at Object.method (/app/node_modules/package/index.js:42)';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('node_modules');
    });

    it('should truncate very long messages', () => {
      // Use characters that won't match sensitive patterns
      const longMessage = 'Error: ' + 'X'.repeat(300);
      const sanitized = sanitizeErrorMessage(longMessage);
      // Should truncate to 200 chars + '...'
      expect(sanitized.length).toBeLessThanOrEqual(203);
      // After sanitization, if still > 200, should have '...'
      if (sanitized.length === 203) {
        expect(sanitized).toContain('...');
      }
    });

    it('should handle multiple sensitive patterns in one message', () => {
      const message = 'DB error postgres://user:pass@10.0.1.5/db with key sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('postgres://');
      expect(sanitized).not.toContain('10.0.1.5');
      expect(sanitized).not.toContain('sk-proj-');
    });

    it('should preserve safe error messages', () => {
      const message = 'Invalid input: field must be a number';
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe(message);
    });
  });

  describe('getGenericError', () => {
    it('should return correct generic message for database category', () => {
      const message = getGenericError('database');
      expect(message).toBe('Database operation failed');
    });

    it('should return correct generic message for authentication category', () => {
      const message = getGenericError('authentication');
      expect(message).toBe('Authentication failed');
    });

    it('should return correct generic message for authorization category', () => {
      const message = getGenericError('authorization');
      expect(message).toBe('Access denied');
    });

    it('should return correct generic message for validation category', () => {
      const message = getGenericError('validation');
      expect(message).toBe('Invalid input');
    });

    it('should return correct generic message for external_api category', () => {
      const message = getGenericError('external_api');
      expect(message).toBe('External service unavailable');
    });

    it('should return correct generic message for internal category', () => {
      const message = getGenericError('internal');
      expect(message).toBe('Internal server error');
    });

    it('should return correct generic message for rate_limit category', () => {
      const message = getGenericError('rate_limit');
      expect(message).toBe('Too many requests');
    });

    it('should return correct generic message for not_found category', () => {
      const message = getGenericError('not_found');
      expect(message).toBe('Resource not found');
    });

    it('should log original error when provided', () => {
      const originalError = new Error('Detailed database error');
      getGenericError('database', originalError);

      expect(logger.error).toHaveBeenCalledWith(
        '[database] Original error:',
        originalError
      );
    });

    it('should not log when original error is not provided', () => {
      getGenericError('database');
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('createSafeErrorResponse', () => {
    it('should return only error message in production', () => {
      process.env.NODE_ENV = 'production';
      const response = createSafeErrorResponse('database', new Error('SQL syntax error'));

      expect(response).toEqual({
        error: 'Database operation failed',
      });
      expect(response.hint).toBeUndefined();
    });

    it('should include sanitized hint in development when includeHint is true', () => {
      process.env.NODE_ENV = 'development';
      const originalError = new Error('Connection to postgres://user:pass@localhost failed');
      const response = createSafeErrorResponse('database', originalError, true);

      expect(response.error).toBe('Database operation failed');
      expect(response.hint).toBeDefined();
      expect(response.hint).toContain('[REDACTED]');
      expect(response.hint).not.toContain('postgres://');
    });

    it('should not include hint in development when includeHint is false', () => {
      process.env.NODE_ENV = 'development';
      const response = createSafeErrorResponse('validation', new Error('Field required'), false);

      expect(response).toEqual({
        error: 'Invalid input',
      });
      expect(response.hint).toBeUndefined();
    });

    it('should handle non-Error objects as originalError', () => {
      process.env.NODE_ENV = 'development';
      const response = createSafeErrorResponse('internal', 'String error message', true);

      expect(response.error).toBe('Internal server error');
      expect(response.hint).toBe('String error message');
    });

    it('should handle undefined originalError', () => {
      process.env.NODE_ENV = 'development';
      const response = createSafeErrorResponse('authentication', undefined, true);

      expect(response.error).toBe('Authentication failed');
      expect(response.hint).toBeUndefined();
    });

    it('should log original error to logger', () => {
      process.env.NODE_ENV = 'production';
      const originalError = new Error('Sensitive error');
      createSafeErrorResponse('internal', originalError);

      expect(logger.error).toHaveBeenCalledWith(
        '[internal] Original error:',
        originalError
      );
    });
  });

  describe('sanitizeError', () => {
    it('should return only generic message in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection to postgres://user:pass@localhost failed');
      const result = sanitizeError(error, 'database');

      expect(result).toEqual({
        error: 'Database operation failed',
      });
      expect(result.hint).toBeUndefined();
    });

    it('should include sanitized hint in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('API key sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz invalid');
      const result = sanitizeError(error, 'external_api');

      expect(result.error).toBe('External service unavailable');
      expect(result.hint).toBeDefined();
      expect(result.hint).toContain('[REDACTED]');
      expect(result.hint).not.toContain('sk-proj-');
    });

    it('should handle non-Error objects', () => {
      process.env.NODE_ENV = 'development';
      const result = sanitizeError('Plain string error', 'validation');

      expect(result.error).toBe('Invalid input');
      expect(result.hint).toBe('Plain string error');
    });

    it('should default to internal category', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeError(new Error('Unknown error'));

      expect(result.error).toBe('Internal server error');
    });

    it('should log all errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      sanitizeError(error, 'authorization');

      expect(logger.error).toHaveBeenCalledWith(
        '[authorization] Error occurred:',
        error
      );
    });

    it('should handle null/undefined errors', () => {
      process.env.NODE_ENV = 'development';
      const result = sanitizeError(null, 'not_found');

      expect(result.error).toBe('Resource not found');
      expect(result.hint).toBe('null');
    });

    it('should handle object errors', () => {
      process.env.NODE_ENV = 'development';
      const errorObj = { code: 'ERR_001', message: 'Custom error' };
      const result = sanitizeError(errorObj, 'internal');

      expect(result.error).toBe('Internal server error');
      expect(result.hint).toContain('[object Object]');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete auth failure scenario', () => {
      process.env.NODE_ENV = 'production';
      const authError = new Error('JWT token Bearer abc123xyz expired for user@example.com');
      const result = sanitizeError(authError, 'authentication');

      expect(result.error).toBe('Authentication failed');
      expect(result.hint).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle database connection failure with all sensitive data', () => {
      process.env.NODE_ENV = 'development';
      const dbError = new Error(
        'Connection failed: postgres://admin:secret123@10.0.1.50:5432/production ' +
        'at /home/deploy/app/node_modules/pg/lib/client.js:123'
      );
      const result = sanitizeError(dbError, 'database');

      expect(result.error).toBe('Database operation failed');
      expect(result.hint).not.toContain('postgres://');
      expect(result.hint).not.toContain('secret123');
      expect(result.hint).not.toContain('10.0.1.50');
      expect(result.hint).not.toContain('/home/deploy');
      expect(result.hint).toContain('[REDACTED]');
    });

    it('should handle rate limit with user info', () => {
      process.env.NODE_ENV = 'production';
      const rateLimitError = new Error('Rate limit exceeded for user alice@company.com from 192.168.1.100');
      const result = sanitizeError(rateLimitError, 'rate_limit');

      expect(result.error).toBe('Too many requests');
      expect(result.hint).toBeUndefined();
    });
  });
});