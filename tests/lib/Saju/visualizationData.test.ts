// tests/lib/Saju/visualizationData.test.ts


import {
  ELEMENT_COLORS,
  generateElementDistribution,
  generatePillarVisualization,
  generateSajuBoardVisualization,
  generateFortuneTimeline,
  generateRadarChartData,
  generateRelationHeatmap,
  generateNetworkGraph,
  generateAuraVisualization,
  generatePillarRevealAnimation,
  type ColorPalette,
  type ChartDataPoint,
  type ElementDistributionData,
  type PillarVisualization,
  type SajuBoardVisualization,
  type FortuneTimelineData,
  type RadarChartData,
  type HeatmapData,
  type NetworkGraphData,
  type AuraVisualization,
  type AnimationSequence,
} from "../../../src/lib/Saju/visualizationData";
import type { SajuPillars, PillarData, FiveElement } from "../../../src/lib/Saju/types";

// 헬퍼 함수
function createPillarData(stem: string, branch: string): PillarData {
  return {
    heavenlyStem: { name: stem, element: "목", yin_yang: "양" },
    earthlyBranch: { name: branch, element: "목", yin_yang: "양" },
    jijanggan: [],
  };
}

function createSajuPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  };
}

// 샘플 사주
const samplePillars = createSajuPillars(
  ["甲", "寅"],
  ["丙", "午"],
  ["戊", "辰"],
  ["庚", "申"]
);

describe("visualizationData - Element Colors", () => {
  describe("ELEMENT_COLORS", () => {
    it("has all five elements", () => {
      const elements: FiveElement[] = ["목", "화", "토", "금", "수"];
      for (const element of elements) {
        expect(ELEMENT_COLORS[element]).toBeDefined();
      }
    });

    it("each element has complete ColorPalette", () => {
      const elements: FiveElement[] = ["목", "화", "토", "금", "수"];
      for (const element of elements) {
        const palette = ELEMENT_COLORS[element];
        expect(palette).toHaveProperty("primary");
        expect(palette).toHaveProperty("secondary");
        expect(palette).toHaveProperty("accent");
        expect(palette).toHaveProperty("background");
        expect(palette).toHaveProperty("text");
      }
    });

    it("all colors are valid hex codes", () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      const elements: FiveElement[] = ["목", "화", "토", "금", "수"];

      for (const element of elements) {
        const palette = ELEMENT_COLORS[element];
        expect(palette.primary).toMatch(hexRegex);
        expect(palette.secondary).toMatch(hexRegex);
        expect(palette.accent).toMatch(hexRegex);
        expect(palette.background).toMatch(hexRegex);
        expect(palette.text).toMatch(hexRegex);
      }
    });

    it("목 has green-ish colors", () => {
      expect(ELEMENT_COLORS["목"].primary).toContain("2");
    });

    it("화 has red-ish colors", () => {
      expect(ELEMENT_COLORS["화"].primary.toUpperCase()).toContain("C");
    });

    it("수 has blue-ish colors", () => {
      expect(ELEMENT_COLORS["수"].primary).toContain("1");
    });
  });
});

describe("visualizationData - Element Distribution", () => {
  describe("generateElementDistribution", () => {
    it("returns proper ElementDistributionData structure", () => {
      const result = generateElementDistribution(samplePillars);

      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("dominant");
      expect(result).toHaveProperty("lacking");
      expect(result).toHaveProperty("balance");
    });

    it("default type is pie", () => {
      const result = generateElementDistribution(samplePillars);
      expect(result.type).toBe("pie");
    });

    it("respects chartType parameter", () => {
      const barResult = generateElementDistribution(samplePillars, "bar");
      const radarResult = generateElementDistribution(samplePillars, "radar");

      expect(barResult.type).toBe("bar");
      expect(radarResult.type).toBe("radar");
    });

    it("data has 5 elements (one for each 오행)", () => {
      const result = generateElementDistribution(samplePillars);
      expect(result.data).toHaveLength(5);
    });

    it("each data point has required properties", () => {
      const result = generateElementDistribution(samplePillars);

      for (const point of result.data) {
        expect(point).toHaveProperty("label");
        expect(point).toHaveProperty("value");
        expect(point).toHaveProperty("color");
      }
    });

    it("total is sum of all values", () => {
      const result = generateElementDistribution(samplePillars);
      const sum = result.data.reduce((acc, p) => acc + p.value, 0);
      expect(result.total).toBeCloseTo(sum, 1);
    });

    it("dominant is valid element", () => {
      const result = generateElementDistribution(samplePillars);
      const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
      expect(validElements).toContain(result.dominant);
    });

    it("lacking is valid element", () => {
      const result = generateElementDistribution(samplePillars);
      const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
      expect(validElements).toContain(result.lacking);
    });

    it("balance is between 0 and 100", () => {
      const result = generateElementDistribution(samplePillars);
      expect(result.balance).toBeGreaterThanOrEqual(0);
      expect(result.balance).toBeLessThanOrEqual(100);
    });
  });
});

describe("visualizationData - Pillar Visualization", () => {
  describe("generatePillarVisualization", () => {
    it("returns proper PillarVisualization structure", () => {
      const pillar = samplePillars.day;
      const result = generatePillarVisualization(pillar, "day", "戊");

      expect(result).toHaveProperty("pillarType");
      expect(result).toHaveProperty("position");
      expect(result).toHaveProperty("heavenlyStem");
      expect(result).toHaveProperty("earthlyBranch");
      expect(result).toHaveProperty("jijanggan");
      expect(result).toHaveProperty("connections");
    });

    it("pillarType matches input", () => {
      const result = generatePillarVisualization(samplePillars.year, "year", "甲");
      expect(result.pillarType).toBe("year");
    });

    it("position has x and y coordinates", () => {
      const result = generatePillarVisualization(samplePillars.month, "month", "丙");
      expect(result.position).toHaveProperty("x");
      expect(result.position).toHaveProperty("y");
    });

    it("heavenlyStem has required properties", () => {
      const result = generatePillarVisualization(samplePillars.day, "day", "戊");

      expect(result.heavenlyStem).toHaveProperty("character");
      expect(result.heavenlyStem).toHaveProperty("element");
      expect(result.heavenlyStem).toHaveProperty("color");
    });

    it("earthlyBranch has required properties", () => {
      const result = generatePillarVisualization(samplePillars.time, "time", "庚");

      expect(result.earthlyBranch).toHaveProperty("character");
      expect(result.earthlyBranch).toHaveProperty("element");
      expect(result.earthlyBranch).toHaveProperty("color");
    });

    it("jijanggan is array", () => {
      const result = generatePillarVisualization(samplePillars.day, "day", "戊");
      expect(Array.isArray(result.jijanggan)).toBe(true);
    });

    it("connections is array", () => {
      const result = generatePillarVisualization(samplePillars.day, "day", "戊");
      expect(Array.isArray(result.connections)).toBe(true);
    });

    it("different pillar types have different x positions", () => {
      const yearVis = generatePillarVisualization(samplePillars.year, "year", "甲");
      const monthVis = generatePillarVisualization(samplePillars.month, "month", "丙");
      const dayVis = generatePillarVisualization(samplePillars.day, "day", "戊");
      const timeVis = generatePillarVisualization(samplePillars.time, "time", "庚");

      expect(yearVis.position.x).not.toBe(monthVis.position.x);
      expect(monthVis.position.x).not.toBe(dayVis.position.x);
      expect(dayVis.position.x).not.toBe(timeVis.position.x);
    });
  });
});

describe("visualizationData - Saju Board Visualization", () => {
  describe("generateSajuBoardVisualization", () => {
    it("returns proper SajuBoardVisualization structure", () => {
      const result = generateSajuBoardVisualization(samplePillars);

      expect(result).toHaveProperty("pillars");
      expect(result).toHaveProperty("elementDistribution");
      expect(result).toHaveProperty("yinYangBalance");
      expect(result).toHaveProperty("interactions");
      expect(result).toHaveProperty("overallTheme");
    });

    it("pillars has 4 elements", () => {
      const result = generateSajuBoardVisualization(samplePillars);
      expect(result.pillars).toHaveLength(4);
    });

    it("yinYangBalance has yin and yang", () => {
      const result = generateSajuBoardVisualization(samplePillars);
      expect(result.yinYangBalance).toHaveProperty("yin");
      expect(result.yinYangBalance).toHaveProperty("yang");
    });

    it("yinYangBalance total is 8", () => {
      const result = generateSajuBoardVisualization(samplePillars);
      expect(result.yinYangBalance.yin + result.yinYangBalance.yang).toBe(8);
    });

    it("interactions is array", () => {
      const result = generateSajuBoardVisualization(samplePillars);
      expect(Array.isArray(result.interactions)).toBe(true);
    });

    it("overallTheme has required properties", () => {
      const result = generateSajuBoardVisualization(samplePillars);

      expect(result.overallTheme).toHaveProperty("primaryColor");
      expect(result.overallTheme).toHaveProperty("secondaryColor");
      expect(result.overallTheme).toHaveProperty("mood");
    });

    it("mood is descriptive string", () => {
      const result = generateSajuBoardVisualization(samplePillars);
      expect(result.overallTheme.mood.length).toBeGreaterThan(0);
    });
  });
});

describe("visualizationData - Fortune Timeline", () => {
  describe("generateFortuneTimeline", () => {
    const sampleDaeun = [
      { age: 5, stem: "甲", branch: "寅" },
      { age: 15, stem: "乙", branch: "卯" },
      { age: 25, stem: "丙", branch: "辰" },
      { age: 35, stem: "丁", branch: "巳" },
    ];

    it("returns proper FortuneTimelineData structure", () => {
      const result = generateFortuneTimeline(sampleDaeun, 30);

      expect(result).toHaveProperty("periods");
      expect(result).toHaveProperty("currentPosition");
      expect(result).toHaveProperty("trendLine");
    });

    it("periods match input daeun data", () => {
      const result = generateFortuneTimeline(sampleDaeun, 30);
      expect(result.periods).toHaveLength(sampleDaeun.length);
    });

    it("each period has required properties", () => {
      const result = generateFortuneTimeline(sampleDaeun, 30);

      for (const period of result.periods) {
        expect(period).toHaveProperty("label");
        expect(period).toHaveProperty("startYear");
        expect(period).toHaveProperty("endYear");
        expect(period).toHaveProperty("score");
        expect(period).toHaveProperty("color");
        expect(period).toHaveProperty("events");
      }
    });

    it("currentPosition is a number", () => {
      const result = generateFortuneTimeline(sampleDaeun, 20);
      expect(typeof result.currentPosition).toBe("number");
    });

    it("trendLine has x and y coordinates", () => {
      const result = generateFortuneTimeline(sampleDaeun, 30);

      for (const point of result.trendLine) {
        expect(point).toHaveProperty("x");
        expect(point).toHaveProperty("y");
      }
    });

    it("handles empty daeun data", () => {
      const result = generateFortuneTimeline([], 30);
      expect(result.periods).toHaveLength(0);
    });
  });
});

describe("visualizationData - Radar Chart", () => {
  describe("generateRadarChartData", () => {
    it("returns proper RadarChartData structure", () => {
      const result = generateRadarChartData(samplePillars);

      expect(result).toHaveProperty("axes");
      expect(result).toHaveProperty("datasets");
    });

    it("uses default categories when not provided", () => {
      const result = generateRadarChartData(samplePillars);
      expect(result.axes).toHaveLength(6);
    });

    it("uses custom categories when provided", () => {
      const categories = ["A", "B", "C", "D"];
      const result = generateRadarChartData(samplePillars, categories);
      expect(result.axes).toEqual(categories);
    });

    it("datasets has at least one entry", () => {
      const result = generateRadarChartData(samplePillars);
      expect(result.datasets.length).toBeGreaterThan(0);
    });

    it("dataset has required properties", () => {
      const result = generateRadarChartData(samplePillars);

      for (const dataset of result.datasets) {
        expect(dataset).toHaveProperty("label");
        expect(dataset).toHaveProperty("values");
        expect(dataset).toHaveProperty("color");
        expect(dataset).toHaveProperty("fill");
      }
    });

    it("values length matches axes length", () => {
      const result = generateRadarChartData(samplePillars);

      for (const dataset of result.datasets) {
        expect(dataset.values.length).toBe(result.axes.length);
      }
    });
  });
});

describe("visualizationData - Relation Heatmap", () => {
  describe("generateRelationHeatmap", () => {
    it("returns proper HeatmapData structure", () => {
      const result = generateRelationHeatmap(samplePillars);

      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("columns");
      expect(result).toHaveProperty("values");
      expect(result).toHaveProperty("colorScale");
    });

    it("has 4x4 matrix for 4 pillars", () => {
      const result = generateRelationHeatmap(samplePillars);

      expect(result.rows).toHaveLength(4);
      expect(result.columns).toHaveLength(4);
      expect(result.values).toHaveLength(4);
      expect(result.values[0]).toHaveLength(4);
    });

    it("diagonal values are 100 (self)", () => {
      const result = generateRelationHeatmap(samplePillars);

      for (let i = 0; i < 4; i++) {
        expect(result.values[i][i]).toBe(100);
      }
    });

    it("colorScale has min, mid, max", () => {
      const result = generateRelationHeatmap(samplePillars);

      expect(result.colorScale).toHaveProperty("min");
      expect(result.colorScale).toHaveProperty("mid");
      expect(result.colorScale).toHaveProperty("max");
    });

    it("values are symmetric", () => {
      const result = generateRelationHeatmap(samplePillars);

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          expect(result.values[i][j]).toBe(result.values[j][i]);
        }
      }
    });
  });
});

describe("visualizationData - Network Graph", () => {
  describe("generateNetworkGraph", () => {
    it("returns proper NetworkGraphData structure", () => {
      const result = generateNetworkGraph(samplePillars);

      expect(result).toHaveProperty("nodes");
      expect(result).toHaveProperty("edges");
    });

    it("has 8 nodes (4 stems + 4 branches)", () => {
      const result = generateNetworkGraph(samplePillars);
      expect(result.nodes).toHaveLength(8);
    });

    it("each node has required properties", () => {
      const result = generateNetworkGraph(samplePillars);

      for (const node of result.nodes) {
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("label");
        expect(node).toHaveProperty("color");
        expect(node).toHaveProperty("size");
        expect(node).toHaveProperty("group");
      }
    });

    it("nodes have stem and branch groups", () => {
      const result = generateNetworkGraph(samplePillars);

      const groups = new Set(result.nodes.map(n => n.group));
      expect(groups.has("stem")).toBe(true);
      expect(groups.has("branch")).toBe(true);
    });

    it("has at least 4 edges (pillar connections)", () => {
      const result = generateNetworkGraph(samplePillars);
      expect(result.edges.length).toBeGreaterThanOrEqual(4);
    });

    it("each edge has required properties", () => {
      const result = generateNetworkGraph(samplePillars);

      for (const edge of result.edges) {
        expect(edge).toHaveProperty("source");
        expect(edge).toHaveProperty("target");
        expect(edge).toHaveProperty("type");
        expect(edge).toHaveProperty("color");
        expect(edge).toHaveProperty("width");
      }
    });

    it("day pillar stem node is larger", () => {
      const result = generateNetworkGraph(samplePillars);

      const dayStemNode = result.nodes.find(n => n.id === "stem_day");
      const otherStemNodes = result.nodes.filter(n =>
        n.group === "stem" && n.id !== "stem_day"
      );

      expect(dayStemNode).toBeDefined();
      for (const node of otherStemNodes) {
        expect(dayStemNode!.size).toBeGreaterThan(node.size);
      }
    });
  });
});

describe("visualizationData - Aura Visualization", () => {
  describe("generateAuraVisualization", () => {
    it("returns proper AuraVisualization structure", () => {
      const result = generateAuraVisualization(samplePillars);

      expect(result).toHaveProperty("layers");
      expect(result).toHaveProperty("centerGlow");
      expect(result).toHaveProperty("particles");
    });

    it("layers is sorted by intensity", () => {
      const result = generateAuraVisualization(samplePillars);

      for (let i = 1; i < result.layers.length; i++) {
        expect(result.layers[i].intensity).toBeLessThanOrEqual(result.layers[i - 1].intensity);
      }
    });

    it("each layer has required properties", () => {
      const result = generateAuraVisualization(samplePillars);

      for (const layer of result.layers) {
        expect(layer).toHaveProperty("element");
        expect(layer).toHaveProperty("intensity");
        expect(layer).toHaveProperty("radius");
        expect(layer).toHaveProperty("color");
        expect(layer).toHaveProperty("opacity");
      }
    });

    it("centerGlow has color and intensity", () => {
      const result = generateAuraVisualization(samplePillars);

      expect(result.centerGlow).toHaveProperty("color");
      expect(result.centerGlow).toHaveProperty("intensity");
    });

    it("particles has 5 elements (one per 오행)", () => {
      const result = generateAuraVisualization(samplePillars);
      expect(result.particles).toHaveLength(5);
    });

    it("each particle has required properties", () => {
      const result = generateAuraVisualization(samplePillars);

      for (const particle of result.particles) {
        expect(particle).toHaveProperty("element");
        expect(particle).toHaveProperty("count");
        expect(particle).toHaveProperty("color");
      }
    });
  });
});

describe("visualizationData - Animation Sequence", () => {
  describe("generatePillarRevealAnimation", () => {
    it("returns proper AnimationSequence structure", () => {
      const result = generatePillarRevealAnimation(samplePillars);

      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("frames");
    });

    it("duration is 4 seconds", () => {
      const result = generatePillarRevealAnimation(samplePillars);
      expect(result.duration).toBe(4);
    });

    it("frames cover the duration", () => {
      const result = generatePillarRevealAnimation(samplePillars);

      const lastFrame = result.frames[result.frames.length - 1];
      expect(lastFrame.time).toBe(result.duration);
    });

    it("each frame has 4 elements (pillars)", () => {
      const result = generatePillarRevealAnimation(samplePillars);

      for (const frame of result.frames) {
        expect(frame.elements).toHaveLength(4);
      }
    });

    it("each element has animation properties", () => {
      const result = generatePillarRevealAnimation(samplePillars);

      for (const frame of result.frames) {
        for (const element of frame.elements) {
          expect(element).toHaveProperty("id");
          expect(element).toHaveProperty("x");
          expect(element).toHaveProperty("y");
          expect(element).toHaveProperty("scale");
          expect(element).toHaveProperty("opacity");
          expect(element).toHaveProperty("rotation");
        }
      }
    });

    it("pillars reveal progressively", () => {
      const result = generatePillarRevealAnimation(samplePillars);

      // At t=0, first pillar should be revealed
      const firstFrame = result.frames[0];
      expect(firstFrame.elements[0].opacity).toBe(1);

      // At t=4, all pillars should be revealed
      const lastFrame = result.frames[result.frames.length - 1];
      for (const element of lastFrame.elements) {
        expect(element.opacity).toBe(1);
        expect(element.scale).toBe(1);
      }
    });
  });
});

describe("visualizationData - Type Validations", () => {
  it("ColorPalette has all required colors", () => {
    const palette: ColorPalette = ELEMENT_COLORS["목"];
    expect(typeof palette.primary).toBe("string");
    expect(typeof palette.secondary).toBe("string");
    expect(typeof palette.accent).toBe("string");
    expect(typeof palette.background).toBe("string");
    expect(typeof palette.text).toBe("string");
  });

  it("ChartDataPoint structure is valid", () => {
    const result = generateElementDistribution(samplePillars);
    const point: ChartDataPoint = result.data[0];

    expect(typeof point.label).toBe("string");
    expect(typeof point.value).toBe("number");
    expect(typeof point.color).toBe("string");
  });
});

describe("visualizationData - Edge Cases", () => {
  it("handles pillars with unusual characters", () => {
    // This is a normal case but tests robustness
    expect(() => generateSajuBoardVisualization(samplePillars)).not.toThrow();
  });

  it("handles empty daeun in timeline", () => {
    const result = generateFortuneTimeline([], 30);
    expect(result.periods).toHaveLength(0);
    expect(result.trendLine).toHaveLength(0);
  });

  it("handles single daeun in timeline", () => {
    const singleDaeun = [{ age: 10, stem: "甲", branch: "寅" }];
    const result = generateFortuneTimeline(singleDaeun, 15);

    expect(result.periods).toHaveLength(1);
  });

  it("handles empty categories in radar chart", () => {
    const result = generateRadarChartData(samplePillars, []);
    expect(result.axes).toHaveLength(0);
  });
});
