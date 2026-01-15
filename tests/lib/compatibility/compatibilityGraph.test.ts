/**
 * Compatibility Graph Tests
 *
 * Tests for graph-based compatibility analysis
 */


import {
  buildCompatibilityGraph,
  analyzeCompatibilityGraph,
  generateVisualizationData,
  type GraphNode,
  type GraphEdge,
  type CompatibilityGraph,
  type NodeType,
  type RelationType,
} from "@/lib/compatibility/compatibilityGraph";
import type { SajuProfile, AstrologyProfile } from "@/lib/compatibility/cosmicCompatibility";

// Test fixtures
const person1Saju: SajuProfile = {
  dayMaster: {
    element: "wood",
    yin_yang: "yang",
    name: "甲",
  },
  pillars: {
    year: { stem: "甲", branch: "子" },
    month: { stem: "丙", branch: "寅" },
    day: { stem: "甲", branch: "午" },
    time: { stem: "庚", branch: "申" },
  },
  elements: {
    wood: 3,
    fire: 2,
    earth: 1,
    metal: 1,
    water: 1,
  },
};

const person2Saju: SajuProfile = {
  dayMaster: {
    element: "fire",
    yin_yang: "yin",
    name: "丁",
  },
  pillars: {
    year: { stem: "乙", branch: "丑" },
    month: { stem: "丁", branch: "卯" },
    day: { stem: "丁", branch: "巳" },
    time: { stem: "辛", branch: "酉" },
  },
  elements: {
    wood: 2,
    fire: 3,
    earth: 1,
    metal: 1,
    water: 1,
  },
};

const person1Astro: AstrologyProfile = {
  sun: { sign: "Aries", element: "fire" },
  moon: { sign: "Cancer", element: "water" },
  venus: { sign: "Taurus", element: "earth" },
  mars: { sign: "Leo", element: "fire" },
};

const person2Astro: AstrologyProfile = {
  sun: { sign: "Libra", element: "air" },
  moon: { sign: "Pisces", element: "water" },
  venus: { sign: "Scorpio", element: "water" },
  mars: { sign: "Sagittarius", element: "fire" },
};

describe("buildCompatibilityGraph", () => {
  it("returns a graph with nodes and edges", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    expect(graph).toHaveProperty("nodes");
    expect(graph).toHaveProperty("edges");
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
  });

  it("creates person nodes", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const personNodes = graph.nodes.filter((n) => n.type === "PERSON");
    expect(personNodes).toHaveLength(2);

    const person1 = personNodes.find((n) => n.id === "person1");
    expect(person1).toBeDefined();
    expect(person1!.properties.dayMaster).toBe("甲");
    expect(person1!.properties.element).toBe("wood");
    expect(person1!.properties.sunSign).toBe("Aries");

    const person2 = personNodes.find((n) => n.id === "person2");
    expect(person2).toBeDefined();
    expect(person2!.properties.dayMaster).toBe("丁");
  });

  it("creates element nodes for all five elements", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const elementNodes = graph.nodes.filter((n) => n.type === "ELEMENT");
    expect(elementNodes).toHaveLength(5);

    const elements = ["wood", "fire", "earth", "metal", "water"];
    for (const el of elements) {
      const node = elementNodes.find((n) => n.id === `element_${el}`);
      expect(node).toBeDefined();
      expect(node!.label).toBe(el.toUpperCase());
    }
  });

  it("creates planet nodes for key planets", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const planetNodes = graph.nodes.filter((n) => n.type === "PLANET");
    expect(planetNodes.length).toBeGreaterThanOrEqual(8); // 4 planets x 2 people
  });

  it("creates yin-yang nodes", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const yinYangNodes = graph.nodes.filter((n) => n.type === "YINYANG");
    expect(yinYangNodes.length).toBeGreaterThanOrEqual(1);
  });

  it("creates pillar nodes for all four pillars", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const pillarNodes = graph.nodes.filter((n) => n.type === "PILLAR");
    expect(pillarNodes).toHaveLength(8); // 4 pillars x 2 people
  });

  it("creates element relationship edges (generates/controls)", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const generatesEdges = graph.edges.filter((e) => e.type === "GENERATES");
    const controlsEdges = graph.edges.filter((e) => e.type === "CONTROLS");

    expect(generatesEdges).toHaveLength(5); // 5 element pairs
    expect(controlsEdges).toHaveLength(5); // 5 element pairs
  });

  it("creates HAS_ELEMENT edges connecting persons to elements", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const hasElementEdges = graph.edges.filter((e) => e.type === "HAS_ELEMENT");
    expect(hasElementEdges.length).toBeGreaterThan(0);
  });

  it("creates complementary edges for opposite yin-yang", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    // Person1 is yang, Person2 is yin - should have COMPLEMENTS edge
    const complementsEdges = graph.edges.filter((e) => e.type === "COMPLEMENTS");
    expect(complementsEdges.length).toBeGreaterThanOrEqual(1);
  });
});

describe("analyzeCompatibilityGraph", () => {
  it("returns analysis result with all required fields", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(analysis).toHaveProperty("strongestPaths");
    expect(analysis).toHaveProperty("weakestPaths");
    expect(analysis).toHaveProperty("clusterScore");
    expect(analysis).toHaveProperty("harmonyIndex");
    expect(analysis).toHaveProperty("criticalNodes");
    expect(analysis).toHaveProperty("insights");
  });

  it("returns paths as arrays", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(Array.isArray(analysis.strongestPaths)).toBe(true);
    expect(Array.isArray(analysis.weakestPaths)).toBe(true);
  });

  it("returns clusterScore between 0 and 1", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(analysis.clusterScore).toBeGreaterThanOrEqual(0);
    expect(analysis.clusterScore).toBeLessThanOrEqual(1);
  });

  it("returns harmonyIndex between 0 and 1", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(analysis.harmonyIndex).toBeGreaterThanOrEqual(0);
    expect(analysis.harmonyIndex).toBeLessThanOrEqual(1);
  });

  it("returns critical nodes as array of GraphNode", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(Array.isArray(analysis.criticalNodes)).toBe(true);
    for (const node of analysis.criticalNodes) {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("label");
    }
  });

  it("returns insights as array of strings", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const analysis = analyzeCompatibilityGraph(graph);

    expect(Array.isArray(analysis.insights)).toBe(true);
  });
});

describe("generateVisualizationData", () => {
  it("returns visualization data with nodes and edges", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const visData = generateVisualizationData(graph);

    expect(visData).toHaveProperty("nodes");
    expect(visData).toHaveProperty("edges");
    expect(Array.isArray(visData.nodes)).toBe(true);
    expect(Array.isArray(visData.edges)).toBe(true);
  });

  it("visualization nodes have required visual properties", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const visData = generateVisualizationData(graph);

    for (const node of visData.nodes) {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("label");
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("color");
      expect(node).toHaveProperty("size");
      expect(typeof node.color).toBe("string");
      expect(typeof node.size).toBe("number");
    }
  });

  it("visualization edges have required visual properties", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const visData = generateVisualizationData(graph);

    for (const edge of visData.edges) {
      expect(edge).toHaveProperty("source");
      expect(edge).toHaveProperty("target");
      expect(edge).toHaveProperty("label");
      expect(edge).toHaveProperty("color");
      expect(edge).toHaveProperty("width");
      expect(typeof edge.color).toBe("string");
      expect(typeof edge.width).toBe("number");
    }
  });

  it("node colors are valid hex colors", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const visData = generateVisualizationData(graph);

    for (const node of visData.nodes) {
      expect(node.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("Graph type definitions", () => {
  it("NodeType includes all expected types", () => {
    const nodeTypes: NodeType[] = [
      "PERSON",
      "ELEMENT",
      "PLANET",
      "ZODIAC",
      "PILLAR",
      "YINYANG",
      "ASPECT",
    ];
    expect(nodeTypes).toHaveLength(7);
  });

  it("RelationType includes all expected types", () => {
    const relationTypes: RelationType[] = [
      "HAS_ELEMENT",
      "HAS_PLANET",
      "HAS_ZODIAC",
      "HAS_PILLAR",
      "HAS_YINYANG",
      "GENERATES",
      "CONTROLS",
      "HARMONIZES",
      "CONFLICTS",
      "COMPLEMENTS",
      "ASPECTS_WITH",
      "RESONATES",
    ];
    expect(relationTypes).toHaveLength(12);
  });
});

describe("Element score calculation", () => {
  it("creates element nodes with score property", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const elementNodes = graph.nodes.filter((n) => n.type === "ELEMENT");

    for (const node of elementNodes) {
      expect(node.score).toBeDefined();
      expect(typeof node.score).toBe("number");
    }
  });

  it("element nodes track person counts", () => {
    const graph = buildCompatibilityGraph(
      person1Saju,
      person1Astro,
      person2Saju,
      person2Astro
    );

    const woodNode = graph.nodes.find((n) => n.id === "element_wood");
    expect(woodNode!.properties.person1Count).toBe(3); // person1Saju.elements.wood
    expect(woodNode!.properties.person2Count).toBe(2); // person2Saju.elements.wood
    expect(woodNode!.properties.total).toBe(5);
  });
});

describe("Cross-system analysis", () => {
  it("creates resonance edges for matching elements between systems", () => {
    // Person1 has fire sun, Person2 day master is fire
    const p1Saju: SajuProfile = {
      ...person1Saju,
      dayMaster: { element: "fire", yin_yang: "yang", name: "丙" },
    };
    const p2Astro: AstrologyProfile = {
      ...person2Astro,
      sun: { sign: "Aries", element: "fire" },
    };

    const graph = buildCompatibilityGraph(p1Saju, person1Astro, person2Saju, p2Astro);

    const resonatesEdges = graph.edges.filter((e) => e.type === "RESONATES");
    expect(resonatesEdges.length).toBeGreaterThan(0);
  });
});
