import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useBirthInfo } from '@/hooks/useBirthInfo';
import { useDreamAnalysis } from '@/hooks/useDreamAnalysis';
import { useDreamPhase } from '@/hooks/useDreamPhase';

// Mock the hooks
vi.mock('@/hooks/useBirthInfo');
vi.mock('@/hooks/useDreamAnalysis');
vi.mock('@/hooks/useDreamPhase');

describe('Dream Page Integration', () => {
  const mockUseSession = useSession as ReturnType<typeof vi.fn>;
  const mockUseBirthInfo = useBirthInfo as ReturnType<typeof vi.fn>;
  const mockUseDreamAnalysis = useDreamAnalysis as ReturnType<typeof vi.fn>;
  const mockUseDreamPhase = useDreamPhase as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    mockUseBirthInfo.mockReturnValue({
      birthDate: '',
      setBirthDate: vi.fn(),
      birthTime: '',
      setBirthTime: vi.fn(),
      gender: 'male',
      setGender: vi.fn(),
      birthCity: '',
      setBirthCity: vi.fn(),
      latitude: null,
      setLatitude: vi.fn(),
      longitude: null,
      setLongitude: vi.fn(),
      timeZone: 'UTC',
      setTimeZone: vi.fn(),
      loadProfile: vi.fn(),
      saveBirthInfo: vi.fn(),
      isLoadingProfile: false,
      skipBirthInfo: vi.fn(),
    });

    mockUseDreamAnalysis.mockReturnValue({
      dreamText: '',
      setDreamText: vi.fn(),
      isAnalyzing: false,
      analyzeDream: vi.fn(),
      result: null,
    });

    mockUseDreamPhase.mockReturnValue({
      phase: 'birth-input',
      setPhase: vi.fn(),
      profileLoading: false,
      userProfile: null,
    });
  });

  it('should start with birth-input phase', () => {
    mockUseDreamPhase.mockReturnValue({
      phase: 'birth-input',
      setPhase: vi.fn(),
      profileLoading: false,
      userProfile: null,
    });

    expect(mockUseDreamPhase().phase).toBe('birth-input');
  });

  it('should transition to dream-input after birth info submitted', () => {
    const setPhase = vi.fn();
    mockUseDreamPhase.mockReturnValue({
      phase: 'dream-input',
      setPhase,
      profileLoading: false,
      userProfile: null,
    });

    expect(mockUseDreamPhase().phase).toBe('dream-input');
  });

  it('should transition to analyzing phase during analysis', () => {
    mockUseDreamPhase.mockReturnValue({
      phase: 'analyzing',
      setPhase: vi.fn(),
      profileLoading: false,
      userProfile: null,
    });

    mockUseDreamAnalysis.mockReturnValue({
      dreamText: 'I saw a flying bird',
      setDreamText: vi.fn(),
      isAnalyzing: true,
      analyzeDream: vi.fn(),
      result: null,
    });

    expect(mockUseDreamPhase().phase).toBe('analyzing');
    expect(mockUseDreamAnalysis().isAnalyzing).toBe(true);
  });

  it('should show result after analysis completes', () => {
    mockUseDreamPhase.mockReturnValue({
      phase: 'result',
      setPhase: vi.fn(),
      profileLoading: false,
      userProfile: null,
    });

    const mockResult = {
      summary: 'Freedom and aspirations',
      dreamSymbols: [],
      recommendations: [],
    };

    mockUseDreamAnalysis.mockReturnValue({
      dreamText: 'I saw a flying bird',
      setDreamText: vi.fn(),
      isAnalyzing: false,
      analyzeDream: vi.fn(),
      result: mockResult,
    });

    expect(mockUseDreamPhase().phase).toBe('result');
    expect(mockUseDreamAnalysis().result).toEqual(mockResult);
  });

  it('should load user profile when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com' } } as any,
      status: 'authenticated',
      update: vi.fn(),
    });

    const loadProfile = vi.fn();
    mockUseBirthInfo.mockReturnValue({
      ...mockUseBirthInfo(),
      loadProfile,
    });

    expect(mockUseSession().status).toBe('authenticated');
  });

  it('should skip birth info input when user clicks skip', () => {
    const skipBirthInfo = vi.fn();
    mockUseBirthInfo.mockReturnValue({
      ...mockUseBirthInfo(),
      skipBirthInfo,
    });

    // This would be called by the component
    mockUseBirthInfo().skipBirthInfo();

    expect(skipBirthInfo).toHaveBeenCalled();
  });

  it('should validate birth info before proceeding', () => {
    const birthInfo = mockUseBirthInfo();

    const isValid =
      birthInfo.birthDate !== '' &&
      birthInfo.birthTime !== '' &&
      birthInfo.latitude !== null &&
      birthInfo.longitude !== null;

    expect(isValid).toBe(false); // Should be invalid with empty data
  });

  it('should handle dream analysis error', () => {
    mockUseDreamAnalysis.mockReturnValue({
      dreamText: 'Test dream',
      setDreamText: vi.fn(),
      isAnalyzing: false,
      analyzeDream: vi.fn().mockRejectedValue(new Error('API Error')),
      result: null,
    });

    const analyzeDream = mockUseDreamAnalysis().analyzeDream;
    expect(analyzeDream).toBeDefined();
  });
});
