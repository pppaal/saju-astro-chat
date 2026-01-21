import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDreamAnalysis } from '@/hooks/useDreamAnalysis';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api');
vi.mock('@/lib/logger');

describe('useDreamAnalysis', () => {
  const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

  const mockUserProfile = {
    birthDate: '1990-01-01',
    birthTime: '10:00',
    gender: 'M' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  };

  const mockGuestBirthInfo = {
    birthDate: '1995-05-15',
    birthTime: '14:30',
    gender: 'F' as const,
    birthCity: 'Seoul',
  };

  const mockInsightResponse = {
    summary: 'Dream interpretation summary',
    dreamSymbols: [
      { label: 'Water', meaning: 'Emotions' },
      { label: 'Mountain', meaning: 'Obstacles' },
    ],
    themes: [{ label: 'Growth', description: 'Personal development' }],
    recommendations: ['Recommendation 1', 'Recommendation 2'],
    culturalNotes: 'Cultural context',
    celestial: { moon_phase: 'Full Moon' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dream text validation', () => {
    it('should reject empty dream text', async () => {
      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.analyzeDream();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should reject dream text shorter than 10 characters', async () => {
      const { result } = renderHook(() =>
        useDreamAnalysis('ko', null, null)
      );

      act(() => {
        result.current.setDreamText('짧은 꿈');
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.analyzeDream();
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('10자 이상');
    });

    it('should accept valid dream text', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('I had a dream about flying over mountains and oceans.');
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.analyzeDream();
      });

      expect(success).toBe(true);
      expect(mockApiFetch).toHaveBeenCalled();
    });
  });

  describe('Birth info handling', () => {
    it('should use user profile birth info when available', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', mockUserProfile as any, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/dream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('1990-01-01'),
        })
      );
    });

    it('should use guest birth info when user profile is null', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, mockGuestBirthInfo)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/dream',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('1995-05-15'),
        })
      );
    });

    it('should work without birth info', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/dream',
        expect.objectContaining({
          method: 'POST',
        })
      );
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.birth).toBeUndefined();
    });
  });

  describe('API interaction', () => {
    it('should set loading state during analysis', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiFetch.mockReturnValue(promise as any);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      act(() => {
        result.current.analyzeDream();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => mockInsightResponse,
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle API success', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(result.current.result).toEqual(mockInsightResponse);
      expect(result.current.error).toBeNull();
    });

    it('should handle API error response', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Analysis failed' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('ko', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.analyzeDream();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.result).toBeNull();
    });

    it('should handle network error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.analyzeDream();
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('error occurred');
    });
  });

  describe('Reset functionality', () => {
    it('should reset all state', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(result.current.dreamText).not.toBe('');
      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.resetAnalysis();
      });

      expect(result.current.dreamText).toBe('');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Locale handling', () => {
    it('should use Korean error messages for ko locale', async () => {
      const { result } = renderHook(() =>
        useDreamAnalysis('ko', null, null)
      );

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(result.current.error).toContain('10자');
    });

    it('should use English error messages for en locale', async () => {
      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(result.current.error).toContain('10 characters');
    });

    it('should send locale to API', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('ko', null, null)
      );

      act(() => {
        result.current.setDreamText('의미있는 꿈 내용입니다');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.locale).toBe('ko');
    });
  });

  describe('Edge cases', () => {
    it('should trim whitespace from dream text', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText('   Dream with spaces   ');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dream).toBe('Dream with spaces');
    });

    it('should handle very long dream text', async () => {
      const longText = 'A'.repeat(10000);
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', null, null)
      );

      act(() => {
        result.current.setDreamText(longText);
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(mockApiFetch).toHaveBeenCalled();
    });

    it('should handle incomplete user profile', async () => {
      const incompleteProfile = {
        birthDate: '1990-01-01',
        // Missing other fields
      };

      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockInsightResponse,
      } as Response);

      const { result } = renderHook(() =>
        useDreamAnalysis('en', incompleteProfile as any, null)
      );

      act(() => {
        result.current.setDreamText('A meaningful dream text here');
      });

      await act(async () => {
        await result.current.analyzeDream();
      });

      expect(mockApiFetch).toHaveBeenCalled();
    });
  });
});
