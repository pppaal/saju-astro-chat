/**
 * useLifePredictionAPI Hook Tests
 * 인생 예측 API 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLifePredictionAPI } from '@/hooks/useLifePredictionAPI';
import type { UserProfile, GuestBirthInfo } from '@/hooks/useLifePredictionProfile';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useLifePredictionAPI', () => {
  const mockOnError = vi.fn();
  const mockUserProfile: UserProfile = {
    birthDate: '1990-05-15',
    birthTime: '14:30',
    gender: 'M',
  };

  const mockGuestBirthInfo: GuestBirthInfo = {
    birthDate: '1995-08-20',
    birthTime: '09:00',
    gender: 'F',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should return handleSubmit function', () => {
      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      expect(result.current.handleSubmit).toBeDefined();
      expect(typeof result.current.handleSubmit).toBe('function');
    });
  });

  describe('handleSubmit with user profile', () => {
    it('should call backend-predict API first', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [
              {
                startDate: '2024-06-01',
                endDate: '2024-08-31',
                score: 85,
                grade: 'A',
                reasons: ['좋은 시기입니다'],
              },
            ],
            generalAdvice: '전반적으로 좋은 시기입니다.',
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('언제 이직하면 좋을까요?', 'career');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/life-prediction/backend-predict',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response).toBeDefined();
      expect(response?.periods).toHaveLength(1);
      expect(response?.periods[0].grade).toBe('A');
    });

    it('should parse birth date correctly from user profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { optimalPeriods: [] },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.birthYear).toBe(1990);
      expect(body.birthMonth).toBe(5);
      expect(body.birthDay).toBe(15);
      expect(body.gender).toBe('male');
    });

    it('should use default birth time when not provided', async () => {
      const profileWithoutTime: UserProfile = {
        birthDate: '1990-05-15',
        gender: 'M',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { optimalPeriods: [] } }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(profileWithoutTime, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.birthHour).toBe(12); // Default 12:00
    });
  });

  describe('handleSubmit with guest birth info', () => {
    it('should use guest birth info when user profile is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { optimalPeriods: [] },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(null, mockGuestBirthInfo, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.birthYear).toBe(1995);
      expect(body.birthMonth).toBe(8);
      expect(body.birthDay).toBe(20);
      expect(body.gender).toBe('female');
    });
  });

  describe('error handling', () => {
    it('should call onError when birth info is missing', async () => {
      const { result } = renderHook(() =>
        useLifePredictionAPI(null, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      expect(mockOnError).toHaveBeenCalledWith('먼저 생년월일 정보가 필요합니다.');
    });

    it('should show English error message for en locale', async () => {
      const { result } = renderHook(() =>
        useLifePredictionAPI(null, null, 'en', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      expect(mockOnError).toHaveBeenCalledWith('Please enter your birth information first.');
    });

    it('should call onError when API throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      expect(mockOnError).toHaveBeenCalledWith(
        '예측 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response).toBeNull();
    });
  });

  describe('fallback prediction', () => {
    it('should use fallback when backend returns error', async () => {
      // Backend returns error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Backend unavailable' }),
      });

      // Fallback: analyze-question
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { eventType: 'career', eventLabel: '이직' },
        }),
      });

      // Fallback: precompute-chart
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          saju: {
            pillars: {
              year: { heavenlyStem: { name: '갑' }, earthlyBranch: { name: '자' } },
              month: { heavenlyStem: { name: '을' }, earthlyBranch: { name: '축' } },
              day: { heavenlyStem: { name: '병' }, earthlyBranch: { name: '인' } },
              time: { heavenlyStem: { name: '정' }, earthlyBranch: { name: '묘' } },
            },
          },
        }),
      });

      // Fallback: life-prediction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [
              {
                startDate: '2024-07-01',
                endDate: '2024-09-30',
                score: 78,
                grade: 'B',
                reasons: ['좋은 시기'],
              },
            ],
          },
        }),
      });

      // Fallback: explain-results (optional)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            periods: [{ reasons: ['AI가 분석한 이유'] }],
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('언제 이직하면 좋을까요?', 'career');
      });

      expect(response).toBeDefined();
      expect(response?.periods).toHaveLength(1);
      // Should have AI explained reasons
      expect(response?.periods[0].reasons).toContain('AI가 분석한 이유');
    });

    it('should return default periods when saju data is missing', async () => {
      // Backend returns error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Backend unavailable' }),
      });

      // Fallback: analyze-question
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { eventType: 'career' } }),
      });

      // Fallback: precompute-chart - returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', 'career');
      });

      expect(response).toBeDefined();
      expect(response?.periods).toHaveLength(1);
      expect(response?.periods[0].grade).toBe('B');
      expect(response?.periods[0].score).toBe(75);
    });
  });

  describe('period mapping', () => {
    it('should map grade correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [
              { startDate: '2024-01-01', endDate: '2024-03-31', score: 95, grade: 'S', reasons: [] },
              { startDate: '2024-04-01', endDate: '2024-06-30', score: 88, grade: 'A+', reasons: [] },
              { startDate: '2024-07-01', endDate: '2024-09-30', score: 82, grade: 'A', reasons: [] },
              { startDate: '2024-10-01', endDate: '2024-12-31', score: 72, grade: 'B', reasons: [] },
            ],
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response?.periods[0].grade).toBe('S');
      expect(response?.periods[1].grade).toBe('A+');
      expect(response?.periods[2].grade).toBe('A');
      expect(response?.periods[3].grade).toBe('B');
    });

    it('should map specificDays with quality based on score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [
              {
                startDate: '2024-01-01',
                endDate: '2024-03-31',
                score: 90,
                grade: 'A+',
                reasons: [],
                specificDays: ['2024-01-15', '2024-02-20'],
              },
            ],
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response?.periods[0].specificDays).toBeDefined();
      expect(response?.periods[0].specificDays?.[0].quality).toBe('excellent');
    });

    it('should default reasons when missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [
              {
                startDate: '2024-01-01',
                endDate: '2024-03-31',
                score: 80,
                grade: 'A',
              },
            ],
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response?.periods[0].reasons).toContain('✨ 좋은 시기입니다');
    });
  });

  describe('locale handling', () => {
    it('should pass locale to API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { optimalPeriods: [] } }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'en', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.locale).toBe('en');
    });
  });

  describe('general advice', () => {
    it('should extract generalAdvice from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [],
            generalAdvice: '올해는 새로운 시작에 적합한 해입니다.',
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response?.generalAdvice).toBe('올해는 새로운 시작에 적합한 해입니다.');
    });

    it('should use naturalAnswer as fallback for generalAdvice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            optimalPeriods: [],
            naturalAnswer: '자연어 응답입니다.',
          },
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response?.generalAdvice).toBe('자연어 응답입니다.');
    });
  });

  describe('gender handling', () => {
    it('should convert M to male', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { optimalPeriods: [] } }),
      });

      const maleProfile: UserProfile = {
        birthDate: '1990-01-01',
        gender: 'M',
      };

      const { result } = renderHook(() =>
        useLifePredictionAPI(maleProfile, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.gender).toBe('male');
    });

    it('should convert F to female', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { optimalPeriods: [] } }),
      });

      const femaleProfile: UserProfile = {
        birthDate: '1990-01-01',
        gender: 'F',
      };

      const { result } = renderHook(() =>
        useLifePredictionAPI(femaleProfile, null, 'ko', mockOnError)
      );

      await act(async () => {
        await result.current.handleSubmit('test', null);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.gender).toBe('female');
    });
  });

  describe('return value when no optimal periods', () => {
    it('should return null when no optimalPeriods in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
        }),
      });

      const { result } = renderHook(() =>
        useLifePredictionAPI(mockUserProfile, null, 'ko', mockOnError)
      );

      let response;
      await act(async () => {
        response = await result.current.handleSubmit('test', null);
      });

      expect(response).toBeNull();
    });
  });
});
