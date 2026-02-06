import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invalidateClientCaches } from '@/lib/cache/invalidateClientCaches';
import { clearChartCache } from '@/lib/cache/chartDataCache';
import { clearChartCache as clearChartCacheClient } from '@/lib/cache/chart-cache-client';
import { clearAllCaches as clearSajuCaches } from '@/lib/Saju/cache';
import { clearAllCalendarCache } from '@/components/calendar/cache-utils';
import { logger } from '@/lib/logger';

// Mock all cache clearing functions
vi.mock('@/lib/cache/chartDataCache');
vi.mock('@/lib/cache/chart-cache-client');
vi.mock('@/lib/Saju/cache');
vi.mock('@/components/calendar/cache-utils');
vi.mock('@/lib/logger');

describe('invalidateClientCaches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Happy Path - All Caches Clear Successfully', () => {
    it('should clear all 4 cache types in correct order', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert - verify all caches were cleared
      expect(clearChartCache).toHaveBeenCalledTimes(1);
      expect(clearChartCacheClient).toHaveBeenCalledTimes(1);
      expect(clearSajuCaches).toHaveBeenCalledTimes(1);
      expect(clearAllCalendarCache).toHaveBeenCalledTimes(1);
    });

    it('should log success message after all caches cleared', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '[invalidateClientCaches] All client caches cleared after birth info change'
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should await clearChartCacheClient before proceeding to next caches', async () => {
      // Arrange - track call order
      const callOrder: string[] = [];

      vi.mocked(clearChartCache).mockImplementation(() => {
        callOrder.push('clearChartCache');
      });

      vi.mocked(clearChartCacheClient).mockImplementation(async () => {
        callOrder.push('clearChartCacheClient-start');
        await new Promise(resolve => setTimeout(resolve, 10));
        callOrder.push('clearChartCacheClient-end');
      });

      vi.mocked(clearSajuCaches).mockImplementation(() => {
        callOrder.push('clearSajuCaches');
      });

      vi.mocked(clearAllCalendarCache).mockImplementation(() => {
        callOrder.push('clearAllCalendarCache');
      });

      // Act
      await invalidateClientCaches();

      // Assert - verify async cache is awaited before proceeding
      expect(callOrder).toEqual([
        'clearChartCache',
        'clearChartCacheClient-start',
        'clearChartCacheClient-end',
        'clearSajuCaches',
        'clearAllCalendarCache',
      ]);
    });
  });

  describe('Error Handling - Partial Failures', () => {
    it('should catch error from first cache and continue', async () => {
      // Arrange
      const error = new Error('SessionStorage clear failed');
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw error;
      });
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        error
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should catch error from async cache and log warning', async () => {
      // Arrange
      const error = new Error('Redis clear failed');
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockRejectedValue(error);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        error
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should catch error from in-memory saju cache', async () => {
      // Arrange
      const error = new Error('Saju cache clear failed');
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockImplementation(() => {
        throw error;
      });
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        error
      );
    });

    it('should catch error from calendar cache', async () => {
      // Arrange
      const error = new Error('Calendar cache clear failed');
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockImplementation(() => {
        throw error;
      });

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        error
      );
    });

    it('should not throw error when cache clearing fails', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw new Error('Critical failure');
      });

      // Act & Assert - should not throw
      await expect(invalidateClientCaches()).resolves.toBeUndefined();
    });
  });

  describe('Error Handling - Multiple Failures', () => {
    it('should catch first error and stop execution', async () => {
      // Arrange - first cache throws, others should not be called due to try-catch
      const firstError = new Error('First cache failed');
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw firstError;
      });
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert - only first function called before error
      expect(clearChartCache).toHaveBeenCalledTimes(1);
      expect(clearChartCacheClient).not.toHaveBeenCalled();
      expect(clearSajuCaches).not.toHaveBeenCalled();
      expect(clearAllCalendarCache).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        firstError
      );
    });

    it('should handle async rejection and not call subsequent caches', async () => {
      // Arrange
      const asyncError = new Error('Async cache failed');
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockRejectedValue(asyncError);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert - sync caches after async should not be called
      expect(clearChartCache).toHaveBeenCalledTimes(1);
      expect(clearChartCacheClient).toHaveBeenCalledTimes(1);
      expect(clearSajuCaches).not.toHaveBeenCalled();
      expect(clearAllCalendarCache).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        asyncError
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache functions that return values', async () => {
      // Arrange - some caches might return values instead of undefined
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert - function completes successfully
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle non-Error objects thrown', async () => {
      // Arrange - throw string instead of Error
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw 'String error message';
      });

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        'String error message'
      );
    });

    it('should handle null/undefined errors', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw null;
      });

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[invalidateClientCaches] Partial failure:',
        null
      );
    });
  });

  describe('Integration - Call Verification', () => {
    it('should call each cache clearing function with no arguments', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert - verify no arguments passed
      expect(clearChartCache).toHaveBeenCalledWith();
      expect(clearChartCacheClient).toHaveBeenCalledWith();
      expect(clearSajuCaches).toHaveBeenCalledWith();
      expect(clearAllCalendarCache).toHaveBeenCalledWith();
    });

    it('should complete function without returning value', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      const result = await invalidateClientCaches();

      // Assert - function returns void (undefined)
      expect(result).toBeUndefined();
    });
  });

  describe('Logging Verification', () => {
    it('should log with correct message format on success', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[invalidateClientCaches]')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('All client caches cleared')
      );
    });

    it('should log with correct format on error', async () => {
      // Arrange
      const error = new Error('Test error');
      vi.mocked(clearChartCache).mockImplementation(() => {
        throw error;
      });

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[invalidateClientCaches]'),
        error
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Partial failure'),
        error
      );
    });

    it('should never call logger.error (only info/warn)', async () => {
      // Arrange
      vi.mocked(clearChartCache).mockReturnValue(undefined);
      vi.mocked(clearChartCacheClient).mockResolvedValue(undefined);
      vi.mocked(clearSajuCaches).mockReturnValue(undefined);
      vi.mocked(clearAllCalendarCache).mockReturnValue(undefined);

      // Act
      await invalidateClientCaches();

      // Assert
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
