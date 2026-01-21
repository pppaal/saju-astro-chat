import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSajuCycles } from '@/hooks/useSajuCycles';
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/Saju';
import type { DayMaster, DaeunData, YeonunData, WolunData, IljinData } from '@/lib/Saju';

vi.mock('@/lib/Saju', () => ({
  getAnnualCycles: vi.fn(),
  getMonthlyCycles: vi.fn(),
  getIljinCalendar: vi.fn(),
}));

describe('useSajuCycles', () => {
  const mockGetAnnualCycles = getAnnualCycles as ReturnType<typeof vi.fn>;
  const mockGetMonthlyCycles = getMonthlyCycles as ReturnType<typeof vi.fn>;
  const mockGetIljinCalendar = getIljinCalendar as ReturnType<typeof vi.fn>;

  const mockDayMaster: DayMaster = {
    heavenlyStem: '甲',
    earthlyBranch: '子',
    element: 'Wood',
  } as any;

  const mockDaeunCycles: DaeunData[] = [
    {
      age: 5,
      heavenlyStem: '甲',
      earthlyBranch: '子',
      element: 'Wood',
      branch: '子',
    } as any,
    {
      age: 15,
      heavenlyStem: '乙',
      earthlyBranch: '丑',
      element: 'Wood',
      branch: '丑',
    } as any,
    {
      age: 25,
      heavenlyStem: '丙',
      earthlyBranch: '寅',
      element: 'Fire',
      branch: '寅',
    } as any,
  ];

  const mockYeonunData: YeonunData[] = [
    { year: 2024, heavenlyStem: '甲', earthlyBranch: '辰', element: 'Wood' } as any,
    { year: 2025, heavenlyStem: '乙', earthlyBranch: '巳', element: 'Wood' } as any,
    { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: 'Fire' } as any,
  ];

  const mockWolunData: WolunData[] = Array.from({ length: 12 }, (_, i) => ({
    year: 2026,
    month: i + 1,
    heavenlyStem: '甲',
    earthlyBranch: '子',
    element: 'Wood',
  })) as any;

  const mockIljinData: IljinData[] = Array.from({ length: 31 }, (_, i) => ({
    year: 2026,
    month: 1,
    day: i + 1,
    heavenlyStem: '甲',
    earthlyBranch: '子',
    element: 'Wood',
  })) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnnualCycles.mockReturnValue(mockYeonunData);
    mockGetMonthlyCycles.mockReturnValue(mockWolunData);
    mockGetIljinCalendar.mockReturnValue(mockIljinData);

    // Mock current date
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Daeun selection', () => {
    it('should select current Daeun based on age', () => {
      const birthYear = 2000; // Age 26 in 2026
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      // Should select age 25 Daeun (current age 26 falls in 25-34 range)
      expect(result.current.selectedDaeun).toEqual(mockDaeunCycles[2]);
    });

    it('should select first Daeun if current age is before first cycle', () => {
      const birthYear = 2023; // Age 3 in 2026
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedDaeun).toEqual(mockDaeunCycles[0]);
    });

    it('should handle empty Daeun cycles', () => {
      const { result } = renderHook(() =>
        useSajuCycles(2000, mockDayMaster, [])
      );

      expect(result.current.selectedDaeun).toBeNull();
    });

    it('should update when Daeun cycles change', () => {
      const birthYear = 2000;
      const { result, rerender } = renderHook(
        ({ cycles }) => useSajuCycles(birthYear, mockDayMaster, cycles),
        { initialProps: { cycles: [] as DaeunData[] } }
      );

      expect(result.current.selectedDaeun).toBeNull();

      rerender({ cycles: mockDaeunCycles });

      expect(result.current.selectedDaeun).not.toBeNull();
    });
  });

  describe('Yeonun calculation', () => {
    it('should calculate annual cycles when Daeun is selected', () => {
      const birthYear = 2000;
      renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(mockGetAnnualCycles).toHaveBeenCalledWith(
        2024, // birthYear + age - 1
        10,
        mockDayMaster
      );
    });

    it('should select current year Yeonun', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedYeonun?.year).toBe(2026);
    });

    it('should select last Yeonun if current year not found', () => {
      mockGetAnnualCycles.mockReturnValue([
        { year: 2020, heavenlyStem: '甲', earthlyBranch: '子', element: 'Wood' } as any,
        { year: 2021, heavenlyStem: '乙', earthlyBranch: '丑', element: 'Wood' } as any,
      ]);

      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedYeonun?.year).toBe(2021);
    });

    it('should not calculate Yeonun if no Daeun selected', () => {
      renderHook(() =>
        useSajuCycles(2000, mockDayMaster, [])
      );

      expect(mockGetAnnualCycles).not.toHaveBeenCalled();
    });
  });

  describe('Wolun calculation', () => {
    it('should calculate monthly cycles when Yeonun is selected', () => {
      const birthYear = 2000;
      renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(mockGetMonthlyCycles).toHaveBeenCalledWith(2026, mockDayMaster);
    });

    it('should select current month Wolun', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedWolun?.month).toBe(1); // January (current month)
    });

    it('should select last Wolun if current month not found', () => {
      mockGetMonthlyCycles.mockReturnValue([
        { year: 2026, month: 3, heavenlyStem: '甲', earthlyBranch: '子', element: 'Wood' } as any,
        { year: 2026, month: 4, heavenlyStem: '乙', earthlyBranch: '丑', element: 'Wood' } as any,
      ]);

      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedWolun?.month).toBe(4);
    });

    it('should not calculate Wolun if no Yeonun selected', () => {
      mockGetAnnualCycles.mockReturnValue([]);

      renderHook(() =>
        useSajuCycles(2000, mockDayMaster, mockDaeunCycles)
      );

      expect(mockGetMonthlyCycles).not.toHaveBeenCalled();
    });
  });

  describe('Iljin calculation', () => {
    it('should calculate daily calendar when Wolun is selected', () => {
      const birthYear = 2000;
      renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(mockGetIljinCalendar).toHaveBeenCalledWith(2026, 1, mockDayMaster);
    });

    it('should filter Iljin for current month/year', () => {
      const mixedIljinData = [
        { year: 2025, month: 12, day: 31, heavenlyStem: '甲', earthlyBranch: '子', element: 'Wood' } as any,
        { year: 2026, month: 1, day: 1, heavenlyStem: '乙', earthlyBranch: '丑', element: 'Wood' } as any,
        { year: 2026, month: 1, day: 2, heavenlyStem: '丙', earthlyBranch: '寅', element: 'Fire' } as any,
        { year: 2026, month: 2, day: 1, heavenlyStem: '丁', earthlyBranch: '卯', element: 'Fire' } as any,
      ];
      mockGetIljinCalendar.mockReturnValue(mixedIljinData);

      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.displayedIljin.length).toBe(2); // Only Jan 2026 days
      expect(result.current.displayedIljin.every((d) => d.year === 2026 && d.month === 1)).toBe(true);
    });

    it('should not calculate Iljin if no Wolun selected', () => {
      mockGetMonthlyCycles.mockReturnValue([]);

      renderHook(() =>
        useSajuCycles(2000, mockDayMaster, mockDaeunCycles)
      );

      expect(mockGetIljinCalendar).not.toHaveBeenCalled();
    });
  });

  describe('Manual selection', () => {
    it('should allow manual Daeun selection', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      act(() => {
        result.current.setSelectedDaeun(mockDaeunCycles[0]);
      });

      expect(result.current.selectedDaeun).toEqual(mockDaeunCycles[0]);
    });

    it('should allow manual Yeonun selection', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      act(() => {
        result.current.setSelectedYeonun(mockYeonunData[0]);
      });

      expect(result.current.selectedYeonun).toEqual(mockYeonunData[0]);
    });

    it('should allow manual Wolun selection', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      act(() => {
        result.current.setSelectedWolun(mockWolunData[5]); // June
      });

      expect(result.current.selectedWolun).toEqual(mockWolunData[5]);
    });
  });

  describe('Cascading updates', () => {
    it('should update Yeonun when Daeun changes', () => {
      const updatedYeonun = mockYeonunData.slice();
      mockGetAnnualCycles.mockReset();
      mockGetAnnualCycles
        .mockReturnValueOnce(mockYeonunData)
        .mockReturnValueOnce(updatedYeonun);

      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      const initialYeonun = result.current.displayedYeonun;

      act(() => {
        result.current.setSelectedDaeun(mockDaeunCycles[0]);
      });

      // Should recalculate Yeonun for new Daeun period
      expect(mockGetAnnualCycles).toHaveBeenCalledTimes(2); // Initial + manual change
      expect(result.current.displayedYeonun).not.toBe(initialYeonun);
    });

    it('should update Wolun when Yeonun changes', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      mockGetMonthlyCycles.mockClear();

      act(() => {
        result.current.setSelectedYeonun(mockYeonunData[0]);
      });

      expect(mockGetMonthlyCycles).toHaveBeenCalledWith(2024, mockDayMaster);
    });

    it('should update Iljin when Wolun changes', () => {
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      mockGetIljinCalendar.mockClear();

      act(() => {
        result.current.setSelectedWolun({
          year: 2026,
          month: 6,
          heavenlyStem: '甲',
          earthlyBranch: '子',
          element: 'Wood',
        } as any);
      });

      expect(mockGetIljinCalendar).toHaveBeenCalledWith(2026, 6, mockDayMaster);
    });
  });

  describe('Edge cases', () => {
    it('should handle birth year same as current year', () => {
      const birthYear = 2026;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      expect(result.current.selectedDaeun).toEqual(mockDaeunCycles[0]);
    });

    it('should handle very old birth year', () => {
      const birthYear = 1950; // Age 76
      const oldDaeunCycles = [
        { age: 5, heavenlyStem: '甲', earthlyBranch: '子', element: 'Wood' } as any,
        { age: 75, heavenlyStem: '乙', earthlyBranch: '丑', element: 'Wood' } as any,
      ];

      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, oldDaeunCycles)
      );

      expect(result.current.selectedDaeun).toEqual(oldDaeunCycles[1]);
    });

    it('should handle dayMaster changes', () => {
      const birthYear = 2000;
      const newDayMaster: DayMaster = {
        heavenlyStem: '丁',
        earthlyBranch: '巳',
        element: 'Fire',
      } as any;

      const { rerender } = renderHook(
        ({ dm }) => useSajuCycles(birthYear, dm, mockDaeunCycles),
        { initialProps: { dm: mockDayMaster } }
      );

      mockGetAnnualCycles.mockClear();

      rerender({ dm: newDayMaster });

      expect(mockGetAnnualCycles).toHaveBeenCalledWith(
        expect.any(Number),
        10,
        newDayMaster
      );
    });

    it('should handle Korean timezone correctly', () => {
      // Test is already using KST offset in month calculation
      const birthYear = 2000;
      const { result } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      // Current mock date is 2026-01-20, which is January in KST
      expect(result.current.selectedWolun?.month).toBe(1);
    });

    it('should return displayed arrays even when nothing selected', () => {
      const { result } = renderHook(() =>
        useSajuCycles(2000, mockDayMaster, [])
      );

      expect(Array.isArray(result.current.displayedYeonun)).toBe(true);
      expect(Array.isArray(result.current.displayedWolun)).toBe(true);
      expect(Array.isArray(result.current.displayedIljin)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should not recalculate unnecessarily', () => {
      const birthYear = 2000;
      const { rerender } = renderHook(() =>
        useSajuCycles(birthYear, mockDayMaster, mockDaeunCycles)
      );

      const initialCallCount = mockGetAnnualCycles.mock.calls.length;

      // Rerender without prop changes
      rerender();

      // Should not trigger additional calculations
      expect(mockGetAnnualCycles.mock.calls.length).toBe(initialCallCount);
    });
  });
});
