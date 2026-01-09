/**
 * Saju Calculation Logic Tests
 * - 사주 팔자 계산 정확성
 * - 대운 계산
 * - 십성 판정
 * - 오행 분석
 */

import { describe, it, expect } from "vitest";
import { calculateSajuData, getAnnualCycles, getMonthlyCycles } from "../src/lib/Saju/saju";
import type { CalculateSajuDataResult } from "../src/lib/Saju/types";

describe("Saju Calculation: Basic Pillar Calculation", () => {
  it("calculates correct pillars for a known date", () => {
    // 1990년 5월 15일 10:30 (양력) - 경오년 신사월 병인일 계사시
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.yearPillar).toBeDefined();
    expect(result.monthPillar).toBeDefined();
    expect(result.dayPillar).toBeDefined();
    expect(result.timePillar).toBeDefined();

    // Verify structure
    expect(result.yearPillar.heavenlyStem).toHaveProperty("name");
    expect(result.yearPillar.heavenlyStem).toHaveProperty("element");
    expect(result.yearPillar.earthlyBranch).toHaveProperty("name");
  });

  it("handles midnight (00:00) correctly", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "00:00",
      "female",
      "solar",
      "Asia/Seoul"
    );

    // 자시는 23:30-01:30
    expect(result.timePillar.earthlyBranch.name).toBe("子");
  });

  it("handles noon (12:00) correctly", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "12:00",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 오시는 11:30-13:30
    expect(result.timePillar.earthlyBranch.name).toBe("午");
  });

  it("handles boundary time (23:30) correctly", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "23:30",
      "female",
      "solar",
      "Asia/Seoul"
    );

    // 23:30부터 다음날 자시 시작
    expect(result.timePillar.earthlyBranch.name).toBe("子");
  });
});

describe("Saju Calculation: Lunar Calendar Support", () => {
  it("converts lunar date to solar correctly", () => {
    // 음력 1990년 4월 21일 = 양력 1990년 5월 15일
    const lunar = calculateSajuData(
      "1990-04-21",
      "10:30",
      "male",
      "lunar",
      "Asia/Seoul",
      false
    );

    const solar = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 양력 변환 후 같은 사주여야 함
    expect(lunar.yearPillar.heavenlyStem.name).toBe(solar.yearPillar.heavenlyStem.name);
    expect(lunar.dayPillar.heavenlyStem.name).toBe(solar.dayPillar.heavenlyStem.name);
  });

  it("handles leap month flag", () => {
    // 윤달 테스트 (예: 2023년 윤2월)
    const result = calculateSajuData(
      "2023-02-15",
      "12:00",
      "male",
      "lunar",
      "Asia/Seoul",
      true // 윤달
    );

    expect(result).toBeDefined();
    expect(result.yearPillar).toBeDefined();
  });
});

describe("Saju Calculation: Day Master (일간)", () => {
  it("identifies day master correctly", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.dayMaster).toBeDefined();
    expect(result.dayMaster.name).toBeTruthy();
    expect(result.dayMaster.element).toMatch(/^(목|화|토|금|수)$/);
    expect(result.dayMaster.yin_yang).toMatch(/^(양|음)$/);
  });

  it("day master matches day pillar heavenly stem", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.dayMaster.name).toBe(result.dayPillar.heavenlyStem.name);
    expect(result.dayMaster.element).toBe(result.dayPillar.heavenlyStem.element);
  });
});

describe("Saju Calculation: Daeun (대운)", () => {
  it("calculates daeun start age", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.daeWoon.startAge).toBeGreaterThanOrEqual(1);
    expect(result.daeWoon.startAge).toBeLessThanOrEqual(10);
  });

  it("male born in yang year follows forward daeun", () => {
    const result = calculateSajuData(
      "1990-05-15", // 경오년 (경=양금)
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.daeWoon.isForward).toBe(true);
  });

  it("female born in yang year follows backward daeun", () => {
    const result = calculateSajuData(
      "1990-05-15", // 경오년 (경=양금)
      "10:30",
      "female",
      "solar",
      "Asia/Seoul"
    );

    expect(result.daeWoon.isForward).toBe(false);
  });

  it("generates 10 daeun cycles", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.daeWoon.list).toHaveLength(10);

    result.daeWoon.list.forEach((cycle, i) => {
      expect(cycle.age).toBe(i * 10 + result.daeWoon.startAge);
      expect(cycle.heavenlyStem).toBeTruthy();
      expect(cycle.earthlyBranch).toBeTruthy();
      expect(cycle.sibsin).toHaveProperty("cheon");
      expect(cycle.sibsin).toHaveProperty("ji");
    });
  });
});

describe("Saju Calculation: Five Elements (오행)", () => {
  it("counts five elements correctly", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.fiveElements).toBeDefined();
    expect(result.fiveElements.wood).toBeGreaterThanOrEqual(0);
    expect(result.fiveElements.fire).toBeGreaterThanOrEqual(0);
    expect(result.fiveElements.earth).toBeGreaterThanOrEqual(0);
    expect(result.fiveElements.metal).toBeGreaterThanOrEqual(0);
    expect(result.fiveElements.water).toBeGreaterThanOrEqual(0);

    // Total should be 8 (4 pillars × 2 stems/branches)
    const total = Object.values(result.fiveElements).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(8);
  });

  it("identifies dominant element", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    const elements = result.fiveElements;
    const dominant = Object.entries(elements).reduce((max, [element, count]) =>
      count > max.count ? { element, count } : max
    , { element: '', count: 0 });

    expect(dominant.count).toBeGreaterThan(0);
    expect(dominant.element).toBeTruthy();
  });
});

describe("Saju Calculation: Sibsin (십성)", () => {
  it("assigns sibsin to all stems", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    const sibsinTypes = [
      '비견', '겁재', '식신', '상관',
      '편재', '정재', '편관', '정관',
      '편인', '정인'
    ];

    expect(result.yearPillar.heavenlyStem.sibsin).toBeTruthy();
    expect(sibsinTypes).toContain(result.yearPillar.heavenlyStem.sibsin);

    expect(result.monthPillar.heavenlyStem.sibsin).toBeTruthy();
    expect(sibsinTypes).toContain(result.monthPillar.heavenlyStem.sibsin);

    expect(result.dayPillar.heavenlyStem.sibsin).toBeTruthy();
    expect(sibsinTypes).toContain(result.dayPillar.heavenlyStem.sibsin);

    expect(result.timePillar.heavenlyStem.sibsin).toBeTruthy();
    expect(sibsinTypes).toContain(result.timePillar.heavenlyStem.sibsin);
  });

  it("day master is always 비견", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 일간(day master)은 항상 자기 자신이므로 비견
    expect(result.dayPillar.heavenlyStem.sibsin).toBe("비견");
  });
});

describe("Saju Calculation: Jijanggan (지장간)", () => {
  it("calculates jijanggan for all branches", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // 모든 지지는 지장간을 가져야 함
    expect(result.yearPillar.jijanggan).toBeDefined();
    expect(result.monthPillar.jijanggan).toBeDefined();
    expect(result.dayPillar.jijanggan).toBeDefined();
    expect(result.timePillar.jijanggan).toBeDefined();
  });

  it("jijanggan slots have correct structure", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    const jijanggan = result.yearPillar.jijanggan;

    // At least one slot should exist
    const hasSlot = jijanggan.chogi || jijanggan.junggi || jijanggan.jeonggi;
    expect(hasSlot).toBeTruthy();

    if (jijanggan.chogi) {
      expect(jijanggan.chogi.name).toBeTruthy();
      expect(jijanggan.chogi.sibsin).toBeTruthy();
    }
  });
});

describe("Saju Calculation: Unse (운세)", () => {
  it("generates annual cycles", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.unse.annual).toBeDefined();
    expect(result.unse.annual.length).toBeGreaterThan(0);

    result.unse.annual.forEach(cycle => {
      expect(cycle.year).toBeGreaterThan(0);
      expect(cycle.ganji).toBeTruthy();
      expect(cycle.element).toBeTruthy();
      expect(cycle.sibsin).toHaveProperty("cheon");
      expect(cycle.sibsin).toHaveProperty("ji");
    });
  });

  it("generates monthly cycles", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(result.unse.monthly).toBeDefined();
    expect(result.unse.monthly.length).toBe(12);

    result.unse.monthly.forEach(cycle => {
      expect(cycle.year).toBeGreaterThan(0);
      expect(cycle.month).toBeGreaterThanOrEqual(1);
      expect(cycle.month).toBeLessThanOrEqual(12);
      expect(cycle.ganji).toBeTruthy();
      expect(cycle.element).toMatch(/^(목|화|토|금|수)$/);
    });
  });
});

describe("Saju Calculation: Helper Functions", () => {
  it("getAnnualCycles generates correct count", () => {
    const dayMaster = { name: "甲", element: "목" as const, yin_yang: "양" as const };
    const cycles = getAnnualCycles(2024, 10, dayMaster);

    expect(cycles).toHaveLength(10);
    cycles.forEach((cycle, i) => {
      expect(cycle.year).toBe(2024 + i);
    });
  });

  it("getMonthlyCycles generates 12 months", () => {
    const dayMaster = { name: "甲", element: "목" as const, yin_yang: "양" as const };
    const cycles = getMonthlyCycles(2024, dayMaster);

    expect(cycles).toHaveLength(12);
    cycles.forEach((cycle, i) => {
      expect(cycle.month).toBe(i + 1);
    });
  });
});

describe("Saju Calculation: Return Format Compatibility", () => {
  it("returns both legacy and new pillar formats", () => {
    const result = calculateSajuData(
      "1990-05-15",
      "10:30",
      "male",
      "solar",
      "Asia/Seoul"
    );

    // Legacy format (spread properties)
    expect(result.yearPillar).toBeDefined();
    expect(result.monthPillar).toBeDefined();
    expect(result.dayPillar).toBeDefined();
    expect(result.timePillar).toBeDefined();

    // New format (nested)
    expect(result.pillars).toBeDefined();
    expect(result.pillars.year).toBeDefined();
    expect(result.pillars.month).toBeDefined();
    expect(result.pillars.day).toBeDefined();
    expect(result.pillars.time).toBeDefined();

    // Both should reference same data
    expect(result.yearPillar).toBe(result.pillars.year);
    expect(result.monthPillar).toBe(result.pillars.month);
    expect(result.dayPillar).toBe(result.pillars.day);
    expect(result.timePillar).toBe(result.pillars.time);
  });
});

describe("Saju Calculation: Edge Cases", () => {
  it("handles year boundaries correctly", () => {
    const newYear = calculateSajuData(
      "2024-01-01",
      "00:00",
      "male",
      "solar",
      "Asia/Seoul"
    );

    expect(newYear.yearPillar).toBeDefined();
    expect(newYear.monthPillar).toBeDefined();
  });

  it("handles leap year (Feb 29)", () => {
    const leapDay = calculateSajuData(
      "2024-02-29",
      "12:00",
      "female",
      "solar",
      "Asia/Seoul"
    );

    expect(leapDay).toBeDefined();
    expect(leapDay.dayPillar).toBeDefined();
  });

  it("handles different timezones", () => {
    const seoul = calculateSajuData(
      "1990-05-15",
      "12:00",
      "male",
      "solar",
      "Asia/Seoul"
    );

    const newyork = calculateSajuData(
      "1990-05-15",
      "12:00",
      "male",
      "solar",
      "America/New_York"
    );

    // Different timezones may result in different solar terms
    expect(seoul).toBeDefined();
    expect(newyork).toBeDefined();
  });

  it("handles very old dates (1900s) - throws error for unsupported range", () => {
    // 1940-2050 범위 밖의 날짜는 에러를 발생시켜야 함
    expect(() => calculateSajuData(
      "1900-01-01",
      "12:00",
      "male",
      "solar",
      "Asia/Seoul"
    )).toThrow("Supported solar-term year range is 1940–2050");
  });

  it("handles recent dates (2024)", () => {
    const recent = calculateSajuData(
      "2024-12-31",
      "23:59",
      "female",
      "solar",
      "Asia/Seoul"
    );

    expect(recent).toBeDefined();
    expect(recent.yearPillar).toBeDefined();
  });
});
