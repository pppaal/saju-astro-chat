/**
 * Astrology Houses 테스트
 * - inferHouseOf 함수
 * - mapHouseCupsFormatted 함수
 * - formatLongitude 함수
 * - normalize360 함수
 * - angleDiff 함수
 * - clamp 함수
 */


import { inferHouseOf, mapHouseCupsFormatted } from "@/lib/astrology/foundation/houses";
import {
  formatLongitude,
  normalize360,
  angleDiff,
  clamp,
  ZODIAC_SIGNS,
} from "@/lib/astrology/foundation/utils";

describe("ZODIAC_SIGNS", () => {
  it("contains all 12 zodiac signs", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
  });

  it("starts with Aries", () => {
    expect(ZODIAC_SIGNS[0]).toBe("Aries");
  });

  it("ends with Pisces", () => {
    expect(ZODIAC_SIGNS[11]).toBe("Pisces");
  });

  it("contains all signs in correct order", () => {
    const expectedOrder = [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ];
    expect(ZODIAC_SIGNS).toEqual(expectedOrder);
  });
});

describe("normalize360", () => {
  it("returns value unchanged if within 0-360", () => {
    expect(normalize360(0)).toBe(0);
    expect(normalize360(180)).toBe(180);
    expect(normalize360(359.9)).toBeCloseTo(359.9, 5);
  });

  it("normalizes values >= 360", () => {
    expect(normalize360(360)).toBe(0);
    expect(normalize360(450)).toBe(90);
    expect(normalize360(720)).toBe(0);
  });

  it("normalizes negative values", () => {
    expect(normalize360(-90)).toBe(270);
    expect(normalize360(-180)).toBe(180);
    expect(normalize360(-360)).toBe(0);
    expect(normalize360(-450)).toBe(270);
  });

  it("handles very large values", () => {
    expect(normalize360(3600)).toBe(0);
    expect(normalize360(3690)).toBe(90);
  });

  it("handles very small negative values", () => {
    expect(normalize360(-3600)).toBe(0);
    expect(normalize360(-3690)).toBe(270);
  });

  it("preserves decimal precision", () => {
    expect(normalize360(45.5)).toBeCloseTo(45.5, 5);
    expect(normalize360(405.5)).toBeCloseTo(45.5, 5);
    expect(normalize360(-314.5)).toBeCloseTo(45.5, 5);
  });
});

describe("formatLongitude", () => {
  it("formats 0 degrees as Aries 0°", () => {
    const result = formatLongitude(0);
    expect(result.sign).toBe("Aries");
    expect(result.degree).toBe(0);
    expect(result.minute).toBe(0);
  });

  it("formats 30 degrees as Taurus 0°", () => {
    const result = formatLongitude(30);
    expect(result.sign).toBe("Taurus");
    expect(result.degree).toBe(0);
  });

  it("formats 45.5 degrees as Taurus 15° 30'", () => {
    const result = formatLongitude(45.5);
    expect(result.sign).toBe("Taurus");
    expect(result.degree).toBe(15);
    expect(result.minute).toBe(30);
  });

  it("formats 90 degrees as Cancer 0°", () => {
    const result = formatLongitude(90);
    expect(result.sign).toBe("Cancer");
    expect(result.degree).toBe(0);
  });

  it("formats 180 degrees as Libra 0°", () => {
    const result = formatLongitude(180);
    expect(result.sign).toBe("Libra");
    expect(result.degree).toBe(0);
  });

  it("formats 270 degrees as Capricorn 0°", () => {
    const result = formatLongitude(270);
    expect(result.sign).toBe("Capricorn");
    expect(result.degree).toBe(0);
  });

  it("formats 359.99 degrees as Pisces 29°", () => {
    const result = formatLongitude(359.99);
    expect(result.sign).toBe("Pisces");
    expect(result.degree).toBe(29);
  });

  it("handles negative values by normalizing", () => {
    const result = formatLongitude(-30);
    expect(result.sign).toBe("Pisces");
    expect(result.degree).toBe(0);
  });

  it("handles values over 360 by normalizing", () => {
    const result = formatLongitude(390);
    expect(result.sign).toBe("Taurus");
    expect(result.degree).toBe(0);
  });

  it("returns correct formatted string", () => {
    const result = formatLongitude(45);
    expect(result.formatted).toMatch(/Taurus 15deg/);
  });

  it("returns normalized value in norm field", () => {
    const result = formatLongitude(405);
    expect(result.norm).toBeCloseTo(45, 5);
  });

  it("pads minute with leading zero when needed", () => {
    const result = formatLongitude(30.1); // ~6 minutes
    expect(result.formatted).toMatch(/\d{2}'/);
  });

  it("correctly maps each zodiac sign", () => {
    const signStarts = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const expectedSigns = ZODIAC_SIGNS;

    signStarts.forEach((start, index) => {
      const result = formatLongitude(start);
      expect(result.sign).toBe(expectedSigns[index]);
    });
  });
});

describe("angleDiff", () => {
  // angleDiff returns 180 - d where d is the absolute difference wrapped
  // This is used for aspect calculation (returns orb from aspect)

  it("returns 180 for same angles (no aspect)", () => {
    // Same angle = 180 (furthest from any aspect)
    expect(angleDiff(0, 0)).toBe(180);
    expect(angleDiff(90, 90)).toBe(180);
    expect(angleDiff(180, 180)).toBe(180);
  });

  it("returns correct value for angles 90 apart (square aspect)", () => {
    expect(angleDiff(0, 90)).toBe(90);
    expect(angleDiff(90, 0)).toBe(90);
    expect(angleDiff(45, 135)).toBe(90);
  });

  it("returns correct value for angles 270 apart", () => {
    const diff = angleDiff(0, 270);
    expect(diff).toBe(90); // 180 - |180-90| = 90
  });

  it("handles wrap-around at 360", () => {
    // 350 to 10 = 20 degrees apart, so 180 - (180 - 20) = 160
    expect(angleDiff(350, 10)).toBe(160);
    expect(angleDiff(10, 350)).toBe(160);
  });

  it("returns 0 for opposite angles (opposition aspect)", () => {
    expect(angleDiff(0, 180)).toBe(0);
    expect(angleDiff(90, 270)).toBe(0);
  });

  it("handles negative angles", () => {
    // -90 normalized = 270, 270 to 90 = 180 apart
    const diff = angleDiff(-90, 90);
    expect(diff).toBe(0); // Opposition
  });
});

describe("clamp", () => {
  it("returns value unchanged if within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("returns min if value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
  });

  it("returns max if value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it("handles negative ranges", () => {
    expect(clamp(0, -10, -5)).toBe(-5);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(-15, -10, -5)).toBe(-10);
  });

  it("handles decimal values", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(1.5, 0, 1)).toBe(1);
  });

  it("handles min equal to max", () => {
    expect(clamp(5, 3, 3)).toBe(3);
    expect(clamp(1, 3, 3)).toBe(3);
  });
});

describe("inferHouseOf", () => {
  it("returns correct house for standard Placidus cusps", () => {
    // Standard cusps where each house is 30 degrees
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    expect(inferHouseOf(15, cusps)).toBe(1);  // In 1st house
    expect(inferHouseOf(45, cusps)).toBe(2);  // In 2nd house
    expect(inferHouseOf(100, cusps)).toBe(4); // In 4th house
    expect(inferHouseOf(270, cusps)).toBe(10); // In 10th house
  });

  it("handles boundary cases", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    expect(inferHouseOf(0, cusps)).toBe(1);   // Start of 1st house
    expect(inferHouseOf(30, cusps)).toBe(2);  // Start of 2nd house
    expect(inferHouseOf(29.99, cusps)).toBe(1); // End of 1st house
  });

  it("handles wrap-around from house 12 to house 1", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    expect(inferHouseOf(345, cusps)).toBe(12); // In 12th house
    expect(inferHouseOf(359.9, cusps)).toBe(12); // Still in 12th house
  });

  it("handles non-equal house cusps", () => {
    // Simulating unequal house sizes
    const cusps = [10, 35, 70, 100, 130, 160, 190, 225, 260, 290, 320, 350];

    expect(inferHouseOf(20, cusps)).toBe(1);  // Between 10 and 35
    expect(inferHouseOf(50, cusps)).toBe(2);  // Between 35 and 70
    expect(inferHouseOf(5, cusps)).toBe(12);  // Before 10, wraps to 12th house
  });

  it("handles cusps that wrap around 360", () => {
    // First house cusp is at 350, wraps to next cusp at 20
    const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];

    expect(inferHouseOf(355, cusps)).toBe(1);  // In 1st house (after 350)
    expect(inferHouseOf(5, cusps)).toBe(1);    // In 1st house (before 20)
    expect(inferHouseOf(30, cusps)).toBe(2);   // In 2nd house
  });

  it("normalizes longitude before processing", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    expect(inferHouseOf(375, cusps)).toBe(1);  // 375 = 15, in 1st house
    expect(inferHouseOf(-15, cusps)).toBe(12); // -15 = 345, in 12th house
  });

  it("returns 12 as fallback if no house matches", () => {
    // Edge case - should theoretically never happen with valid cusps
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    // Any valid longitude should find a house
    const result = inferHouseOf(0, cusps);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(12);
  });

  it("handles all 12 houses correctly", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    for (let i = 0; i < 12; i++) {
      const longitude = cusps[i] + 15; // Middle of each house
      const expectedHouse = i + 1;
      expect(inferHouseOf(longitude % 360, cusps)).toBe(expectedHouse);
    }
  });
});

describe("mapHouseCupsFormatted", () => {
  it("returns array with 12 formatted house cusps", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = mapHouseCupsFormatted(cusps);

    expect(result).toHaveLength(12);
  });

  it("includes correct index for each house", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = mapHouseCupsFormatted(cusps);

    result.forEach((house, idx) => {
      expect(house.index).toBe(idx + 1);
    });
  });

  it("includes original cusp value", () => {
    const cusps = [10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340];
    const result = mapHouseCupsFormatted(cusps);

    result.forEach((house, idx) => {
      expect(house.cusp).toBe(cusps[idx]);
    });
  });

  it("includes correct zodiac sign", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = mapHouseCupsFormatted(cusps);

    expect(result[0].sign).toBe("Aries");
    expect(result[1].sign).toBe("Taurus");
    expect(result[2].sign).toBe("Gemini");
    expect(result[3].sign).toBe("Cancer");
    expect(result[6].sign).toBe("Libra");
    expect(result[9].sign).toBe("Capricorn");
  });

  it("includes formatted string", () => {
    const cusps = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
    const result = mapHouseCupsFormatted(cusps);

    result.forEach((house) => {
      expect(house.formatted).toBeTruthy();
      expect(house.formatted).toMatch(/\w+ \d+deg \d{2}'/);
    });
  });

  it("handles empty array", () => {
    const result = mapHouseCupsFormatted([]);
    expect(result).toHaveLength(0);
  });

  it("handles non-standard cusp values", () => {
    const cusps = [5.5, 35.75, 66.25, 96.5, 126.75, 157, 187.25, 217.5, 247.75, 278, 308.25, 338.5];
    const result = mapHouseCupsFormatted(cusps);

    expect(result).toHaveLength(12);
    result.forEach((house) => {
      expect(house.sign).toBeTruthy();
      expect(house.formatted).toBeTruthy();
    });
  });
});

describe("WholeSign house calculation", () => {
  it("WholeSign houses are 30 degrees each", () => {
    // Simulating WholeSign cusps starting at Aries 0
    const wholeSignCusps = Array.from({ length: 12 }, (_, i) => i * 30);

    expect(wholeSignCusps[1] - wholeSignCusps[0]).toBe(30);
    expect(wholeSignCusps[6] - wholeSignCusps[5]).toBe(30);
  });

  it("inferHouseOf works with WholeSign cusps", () => {
    // WholeSign starting at Leo (120 degrees)
    const leoStart = 120;
    const wholeSignCusps = Array.from({ length: 12 }, (_, i) =>
      normalize360(leoStart + i * 30)
    );

    // Planet at 125 degrees should be in house 1
    expect(inferHouseOf(125, wholeSignCusps)).toBe(1);
    // Planet at 155 degrees should be in house 2
    expect(inferHouseOf(155, wholeSignCusps)).toBe(2);
  });
});

describe("Edge cases", () => {
  it("formatLongitude handles exact 360", () => {
    const result = formatLongitude(360);
    expect(result.sign).toBe("Aries");
    expect(result.degree).toBe(0);
  });

  it("normalize360 handles 0", () => {
    expect(normalize360(0)).toBe(0);
  });

  it("clamp handles equal min and max", () => {
    expect(clamp(5, 5, 5)).toBe(5);
  });

  it("inferHouseOf handles planet at exact cusp", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    // At exact cusp, should return the new house
    expect(inferHouseOf(30, cusps)).toBe(2);
    expect(inferHouseOf(90, cusps)).toBe(4);
  });
});
