/**
 * Tests for useBirthInfo hook
 * src/hooks/useBirthInfo.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBirthInfo } from '@/hooks/useBirthInfo';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { useSession } from 'next-auth/react';
import { logger } from '@/lib/logger';

const mockUseSession = vi.mocked(useSession);

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useBirthInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      expect(result.current.userProfile).toBeNull();
      expect(result.current.guestBirthInfo).toBeNull();
      expect(result.current.hasBirthInfo).toBe(false);
      expect(result.current.birthDate).toBe('');
      expect(result.current.birthTime).toBe('12:00');
      expect(result.current.gender).toBe('M');
      expect(result.current.birthCity).toBe('');
      expect(result.current.showTimeInput).toBe(false);
      expect(result.current.showCityInput).toBe(false);
      expect(result.current.loadingProfileBtn).toBe(false);
      expect(result.current.profileLoadedMsg).toBe(false);
      expect(result.current.profileLoadError).toBeNull();
    });
  });

  describe('form state setters', () => {
    it('should update birthDate', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-01-15');
      });

      expect(result.current.birthDate).toBe('1990-01-15');
    });

    it('should update birthTime', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthTime('10:30');
      });

      expect(result.current.birthTime).toBe('10:30');
    });

    it('should update gender', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setGender('F');
      });

      expect(result.current.gender).toBe('F');
    });

    it('should update birthCity', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthCity('Seoul');
      });

      expect(result.current.birthCity).toBe('Seoul');
    });

    it('should toggle showTimeInput', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setShowTimeInput(true);
      });

      expect(result.current.showTimeInput).toBe(true);
    });

    it('should toggle showCityInput', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setShowCityInput(true);
      });

      expect(result.current.showCityInput).toBe(true);
    });
  });

  describe('loadProfile', () => {
    it('should not fetch when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should load profile when authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-05-15',
            birthTime: '10:30',
            gender: 'F',
            birthCity: 'Seoul',
            latitude: 37.5665,
            longitude: 126.978,
            tzId: 'Asia/Seoul',
          },
        }),
      });

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.birthDate).toBe('1990-05-15');
      expect(result.current.birthTime).toBe('10:30');
      expect(result.current.gender).toBe('F');
      expect(result.current.birthCity).toBe('Seoul');
      expect(result.current.showTimeInput).toBe(true);
      expect(result.current.showCityInput).toBe(true);
      expect(result.current.profileLoadedMsg).toBe(true);
      expect(result.current.userProfile).toEqual({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'F',
        birthCity: 'Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });
    });

    it('should set loading state during fetch', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.loadProfile();
      });

      expect(result.current.loadingProfileBtn).toBe(true);
    });

    it('should handle API error response (English)', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: false,
      });

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.profileLoadError).toBe('Failed to load profile');
    });

    it('should handle API error response (Korean)', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: false,
      });

      const { result } = renderHook(() => useBirthInfo('ko'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.profileLoadError).toBe('프로필을 불러올 수 없습니다');
    });

    it('should handle missing profile data (English)', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: null }),
      });

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.profileLoadError).toBe(
        'No saved profile. Please save your info in My Journey first.'
      );
    });

    it('should handle network error', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.profileLoadError).toBe('Profile load failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('saveBirthInfo', () => {
    it('should return false if birthDate is empty', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveBirthInfo();
      });

      expect(success).toBe(false);
    });

    it('should save birth info for guest user', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
        result.current.setGender('F');
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveBirthInfo();
      });

      expect(success).toBe(true);
      expect(result.current.guestBirthInfo).toEqual({
        birthDate: '1990-05-15',
        birthTime: '12:00',
        gender: 'F',
        birthCity: undefined,
      });
    });

    it('should save birth info with optional time and city', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
        result.current.setBirthTime('10:30');
        result.current.setShowTimeInput(true);
        result.current.setBirthCity('Seoul');
        result.current.setShowCityInput(true);
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(result.current.guestBirthInfo).toEqual({
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'M',
        birthCity: 'Seoul',
      });
    });

    it('should save birth info to API for authenticated user', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: null }),
        })
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
        result.current.setGender('F');
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/user/update-birth-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: '1990-05-15',
          birthTime: '12:00',
          gender: 'F',
          birthCity: undefined,
        }),
      });

      expect(result.current.userProfile).toEqual({
        birthDate: '1990-05-15',
        birthTime: '12:00',
        gender: 'F',
        birthCity: undefined,
      });
    });

    it('should handle API error when saving', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(logger.error).toHaveBeenCalledWith('Failed to save birth info:', expect.any(Error));
    });
  });

  describe('resetBirthInfo', () => {
    it('should reset all birth info state', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      // Set some state
      act(() => {
        result.current.setBirthDate('1990-05-15');
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(result.current.guestBirthInfo).not.toBeNull();

      // Reset
      act(() => {
        result.current.resetBirthInfo();
      });

      expect(result.current.guestBirthInfo).toBeNull();
      expect(result.current.userProfile).toBeNull();
      expect(result.current.profileLoadedMsg).toBe(false);
      expect(result.current.profileLoadError).toBeNull();
    });
  });

  describe('skipBirthInfo', () => {
    it('should clear guest birth info', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(result.current.guestBirthInfo).not.toBeNull();

      act(() => {
        result.current.skipBirthInfo();
      });

      expect(result.current.guestBirthInfo).toBeNull();
    });
  });

  describe('hasBirthInfo', () => {
    it('should be true when userProfile has birthDate', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: 'test@test.com' } },
        status: 'authenticated',
        update: vi.fn(),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-05-15',
          },
        }),
      });

      const { result } = renderHook(() => useBirthInfo('en'));

      await act(async () => {
        await result.current.loadProfile();
      });

      expect(result.current.hasBirthInfo).toBe(true);
    });

    it('should be true when guestBirthInfo has birthDate', async () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      act(() => {
        result.current.setBirthDate('1990-05-15');
      });

      await act(async () => {
        await result.current.saveBirthInfo();
      });

      expect(result.current.hasBirthInfo).toBe(true);
    });

    it('should be false when no birth info', () => {
      const { result } = renderHook(() => useBirthInfo('en'));

      expect(result.current.hasBirthInfo).toBe(false);
    });
  });
});
