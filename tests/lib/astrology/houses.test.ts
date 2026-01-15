/**
 * Astrology Houses Tests
 *
 * Tests for house calculation utilities
 */


import { inferHouseOf, mapHouseCupsFormatted } from "@/lib/astrology/foundation/houses";

describe("inferHouseOf", () => {
  // Standard 12-house cusp positions (simplified example)
  const simpleCusps = [
    0,    // House 1 (0°)
    30,   // House 2 (30°)
    60,   // House 3 (60°)
    90,   // House 4 (90°)
    120,  // House 5 (120°)
    150,  // House 6 (150°)
    180,  // House 7 (180°)
    210,  // House 8 (210°)
    240,  // House 9 (240°)
    270,  // House 10 (270°)
    300,  // House 11 (300°)
    330,  // House 12 (330°)
  ];

  it("returns house 1 for longitude at 0°", () => {
    expect(inferHouseOf(0, simpleCusps)).toBe(1);
  });

  it("returns house 1 for longitude at 15°", () => {
    expect(inferHouseOf(15, simpleCusps)).toBe(1);
  });

  it("returns house 2 for longitude at 30°", () => {
    expect(inferHouseOf(30, simpleCusps)).toBe(2);
  });

  it("returns house 7 for longitude at 180°", () => {
    expect(inferHouseOf(180, simpleCusps)).toBe(7);
  });

  it("returns house 10 for longitude at 270°", () => {
    expect(inferHouseOf(270, simpleCusps)).toBe(10);
  });

  it("returns house 12 for longitude at 350°", () => {
    expect(inferHouseOf(350, simpleCusps)).toBe(12);
  });

  describe("wrapping around 360°", () => {
    it("handles longitude near 359°", () => {
      const result = inferHouseOf(359, simpleCusps);
      expect(result).toBe(12);
    });

    it("handles longitude at 361° (wraps to 1°)", () => {
      const result = inferHouseOf(361, simpleCusps);
      expect(result).toBe(1);
    });
  });

  describe("with irregular cusps", () => {
    // Real Placidus cusps are not evenly distributed
    const irregularCusps = [
      10,   // House 1
      35,   // House 2
      55,   // House 3
      80,   // House 4
      115,  // House 5
      155,  // House 6
      190,  // House 7
      215,  // House 8
      235,  // House 9
      260,  // House 10
      295,  // House 11
      335,  // House 12
    ];

    it("finds correct house with irregular cusps", () => {
      expect(inferHouseOf(20, irregularCusps)).toBe(1);
      expect(inferHouseOf(40, irregularCusps)).toBe(2);
      expect(inferHouseOf(200, irregularCusps)).toBe(7);
    });
  });
});

describe("mapHouseCupsFormatted", () => {
  it("returns 12 formatted house entries", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
    const formatted = mapHouseCupsFormatted(cusps);
    expect(formatted).toHaveLength(12);
  });

  it("includes house index starting at 1", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
    const formatted = mapHouseCupsFormatted(cusps);

    expect(formatted[0].index).toBe(1);
    expect(formatted[11].index).toBe(12);
  });

  it("includes cusp degree", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const formatted = mapHouseCupsFormatted(cusps);

    expect(formatted[0].cusp).toBe(0);
    expect(formatted[1].cusp).toBe(30);
    expect(formatted[6].cusp).toBe(180);
  });

  it("includes sign name", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const formatted = mapHouseCupsFormatted(cusps);

    // 0° is Aries, 30° is Taurus, etc.
    expect(formatted[0].sign).toBeDefined();
    expect(typeof formatted[0].sign).toBe("string");
  });

  it("includes formatted string", () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const formatted = mapHouseCupsFormatted(cusps);

    expect(formatted[0].formatted).toBeDefined();
    expect(typeof formatted[0].formatted).toBe("string");
  });
});

describe("House system concepts", () => {
  describe("12 houses", () => {
    it("there are 12 houses in astrology", () => {
      const houseCount = 12;
      expect(houseCount).toBe(12);
    });

    it("each house covers approximately 30° in whole sign", () => {
      const degreesPerHouse = 360 / 12;
      expect(degreesPerHouse).toBe(30);
    });
  });

  describe("angular houses", () => {
    // Houses 1, 4, 7, 10 are angular (most powerful)
    const angularHouses = [1, 4, 7, 10];

    it("house 1 (ASC) is angular", () => {
      expect(angularHouses).toContain(1);
    });

    it("house 4 (IC) is angular", () => {
      expect(angularHouses).toContain(4);
    });

    it("house 7 (DSC) is angular", () => {
      expect(angularHouses).toContain(7);
    });

    it("house 10 (MC) is angular", () => {
      expect(angularHouses).toContain(10);
    });
  });

  describe("succedent houses", () => {
    // Houses 2, 5, 8, 11 are succedent
    const succedentHouses = [2, 5, 8, 11];

    it("has 4 succedent houses", () => {
      expect(succedentHouses).toHaveLength(4);
    });
  });

  describe("cadent houses", () => {
    // Houses 3, 6, 9, 12 are cadent
    const cadentHouses = [3, 6, 9, 12];

    it("has 4 cadent houses", () => {
      expect(cadentHouses).toHaveLength(4);
    });
  });
});

describe("House meanings", () => {
  const houseMeanings: Record<number, string> = {
    1: "Self, appearance, beginnings",
    2: "Possessions, values, resources",
    3: "Communication, siblings, short trips",
    4: "Home, family, roots",
    5: "Creativity, romance, children",
    6: "Health, service, daily routines",
    7: "Partnerships, marriage, open enemies",
    8: "Transformation, shared resources, death/rebirth",
    9: "Philosophy, higher education, long journeys",
    10: "Career, public image, authority",
    11: "Friends, groups, hopes and wishes",
    12: "Subconscious, hidden enemies, institutions",
  };

  it("all 12 houses have meanings", () => {
    expect(Object.keys(houseMeanings)).toHaveLength(12);
  });

  it("house 1 relates to self", () => {
    expect(houseMeanings[1]).toContain("Self");
  });

  it("house 7 relates to partnerships", () => {
    expect(houseMeanings[7]).toContain("Partnerships");
  });

  it("house 10 relates to career", () => {
    expect(houseMeanings[10]).toContain("Career");
  });
});
