/**
 * useLifePredictionProfile Hook Tests
 * Tests for profile and birth information management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLifePredictionProfile, type GuestBirthInfo } from '@/hooks/useLifePredictionProfile';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useLifePredictionProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with null user profile', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
    });

    it('should initialize with null guest birth info', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.guestBirthInfo).toBeNull();
    });

    it('should start with loading true', () => {
      const { result } = renderHook(() => useLifePredictionProfile('loading'));
      expect(result.current.profileLoading).toBe(true);
    });
  });

  describe('Unauthenticated User', () => {
    it('should not make API call when unauthenticated', async () => {
      renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('should stop loading when unauthenticated', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });
    });

    it('should handle birth info submission for guest', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      const birthInfo: GuestBirthInfo = {
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'M',
        birthCity: '서울',
      };

      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      expect(result.current.guestBirthInfo).toEqual(birthInfo);
    });

    it('should not call API when guest submits birth info', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      const birthInfo: GuestBirthInfo = {
        birthDate: '1990-05-15',
        birthTime: '10:30',
        gender: 'F',
      };

      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      // fetch should not have been called for saving birth info
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/user/update-birth-info',
        expect.anything()
      );
    });
  });

  describe('Authenticated User - Profile Loading', () => {
    it('should fetch profile when authenticated', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            name: 'Test User',
            birthDate: '1990-01-01',
            birthTime: '12:00',
            birthCity: 'Seoul',
            gender: 'M',
          },
        }),
      });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/me/profile', { cache: 'no-store' });
    });

    it('should populate user profile from API response', async () => {
      const mockProfile = {
        name: 'John Doe',
        birthDate: '1985-03-15',
        birthTime: '08:30',
        birthCity: 'Busan',
        gender: 'M' as const,
        latitude: 35.1796,
        longitude: 129.0756,
        tzId: 'Asia/Seoul',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockProfile }),
      });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).toEqual({
        name: 'John Doe',
        birthDate: '1985-03-15',
        birthTime: '08:30',
        birthCity: 'Busan',
        gender: 'M',
        latitude: 35.1796,
        longitude: 129.0756,
        timezone: 'Asia/Seoul',
      });
    });

    it('should not set profile if user has no birthDate', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            name: 'User Without Birth Date',
            email: 'test@test.com',
          },
        }),
      });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
    });

    it('should handle API error gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
    });

    it('should handle non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).toBeNull();
    });
  });

  describe('Authenticated User - Birth Info Submit', () => {
    it('should call API when authenticated user submits birth info', async () => {
      // First call for profile loading
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: {} }),
        })
        // Second call for updating birth info
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      const birthInfo: GuestBirthInfo = {
        birthDate: '1995-07-20',
        birthTime: '14:00',
        gender: 'F',
        birthCity: '대전',
      };

      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/user/update-birth-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: '1995-07-20',
          birthTime: '14:00',
          gender: 'F',
          birthCity: '대전',
        }),
      });
    });

    it('should update user profile after successful API call', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      const birthInfo: GuestBirthInfo = {
        birthDate: '1988-12-25',
        birthTime: '06:00',
        gender: 'M',
        birthCity: '인천',
      };

      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      expect(result.current.userProfile).toEqual({
        birthDate: '1988-12-25',
        birthTime: '06:00',
        gender: 'M',
        birthCity: '인천',
      });
    });

    it('should handle API error on birth info submit', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: {} }),
        })
        .mockRejectedValueOnce(new Error('Failed to save'));

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      const birthInfo: GuestBirthInfo = {
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'M',
      };

      // Should not throw
      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      // Profile should not be updated on error
      expect(result.current.userProfile).toBeNull();
    });
  });

  describe('handleChangeBirthInfo', () => {
    it('should reset guest birth info', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      // Set guest birth info
      await act(async () => {
        await result.current.handleBirthInfoSubmit({
          birthDate: '1990-01-01',
          birthTime: '12:00',
          gender: 'M',
        });
      });

      expect(result.current.guestBirthInfo).not.toBeNull();

      // Reset
      act(() => {
        result.current.handleChangeBirthInfo();
      });

      expect(result.current.guestBirthInfo).toBeNull();
    });

    it('should reset user profile', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-01-01',
            birthTime: '12:00',
            gender: 'M',
          },
        }),
      });

      const { result } = renderHook(() => useLifePredictionProfile('authenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current.userProfile).not.toBeNull();

      // Reset
      act(() => {
        result.current.handleChangeBirthInfo();
      });

      expect(result.current.userProfile).toBeNull();
    });
  });

  describe('Status Transitions', () => {
    it('should handle status change from loading to authenticated', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-01-01',
            birthTime: '12:00',
            gender: 'M',
          },
        }),
      });

      const { result, rerender } = renderHook(
        ({ status }) => useLifePredictionProfile(status),
        { initialProps: { status: 'loading' as const } }
      );

      // Initially loading, no API call
      expect(global.fetch).not.toHaveBeenCalled();

      // Change to authenticated
      rerender({ status: 'authenticated' as const });

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/me/profile', expect.anything());
    });

    it('should handle status change from loading to unauthenticated', async () => {
      const { result, rerender } = renderHook(
        ({ status }) => useLifePredictionProfile(status),
        { initialProps: { status: 'loading' as const } }
      );

      // Change to unauthenticated
      rerender({ status: 'unauthenticated' as const });

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.userProfile).toBeNull();
    });
  });

  describe('Return Type', () => {
    it('should return all expected properties', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('userProfile');
      expect(result.current).toHaveProperty('guestBirthInfo');
      expect(result.current).toHaveProperty('profileLoading');
      expect(result.current).toHaveProperty('handleBirthInfoSubmit');
      expect(result.current).toHaveProperty('handleChangeBirthInfo');
    });

    it('handleBirthInfoSubmit should be a function', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(typeof result.current.handleBirthInfoSubmit).toBe('function');
    });

    it('handleChangeBirthInfo should be a function', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      expect(typeof result.current.handleChangeBirthInfo).toBe('function');
    });
  });

  describe('Birth Info Validation', () => {
    it('should handle birth info without optional birthCity', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      const birthInfo: GuestBirthInfo = {
        birthDate: '2000-06-15',
        birthTime: '18:45',
        gender: 'F',
      };

      await act(async () => {
        await result.current.handleBirthInfoSubmit(birthInfo);
      });

      expect(result.current.guestBirthInfo).toEqual(birthInfo);
      expect(result.current.guestBirthInfo?.birthCity).toBeUndefined();
    });

    it('should handle different gender values', async () => {
      const { result } = renderHook(() => useLifePredictionProfile('unauthenticated'));

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false);
      });

      // Male
      await act(async () => {
        await result.current.handleBirthInfoSubmit({
          birthDate: '1990-01-01',
          birthTime: '12:00',
          gender: 'M',
        });
      });
      expect(result.current.guestBirthInfo?.gender).toBe('M');

      // Female
      await act(async () => {
        await result.current.handleBirthInfoSubmit({
          birthDate: '1990-01-01',
          birthTime: '12:00',
          gender: 'F',
        });
      });
      expect(result.current.guestBirthInfo?.gender).toBe('F');
    });
  });
});
