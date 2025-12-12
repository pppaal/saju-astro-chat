/**
 * Compatibility Graph RAG
 * 사주+점성학 관계를 그래프로 표현하고 패턴 분석
 */

import { SajuProfile, AstrologyProfile } from './cosmicCompatibility';

// ============================================================
// 그래프 노드 및 엣지 타입
// ============================================================

export type NodeType =
  | 'PERSON'
  | 'ELEMENT'
  | 'PLANET'
  | 'ZODIAC'
  | 'PILLAR'
  | 'YINYANG'
  | 'ASPECT';

export type RelationType =
  | 'HAS_ELEMENT'
  | 'HAS_PLANET'
  | 'HAS_ZODIAC'
  | 'HAS_PILLAR'
  | 'HAS_YINYANG'
  | 'GENERATES'      // 상생
  | 'CONTROLS'       // 상극
  | 'HARMONIZES'     // 조화
  | 'CONFLICTS'      // 충돌
  | 'COMPLEMENTS'    // 보완
  | 'ASPECTS_WITH'   // 행성 각도
  | 'RESONATES';     // 공명

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  score?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: RelationType;
  weight: number;
  properties: Record<string, any>;
}

export interface CompatibilityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================
// 그래프 구축
// ============================================================

export function buildCompatibilityGraph(
  person1Saju: SajuProfile,
  person1Astro: AstrologyProfile,
  person2Saju: SajuProfile,
  person2Astro: AstrologyProfile
): CompatibilityGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 1. Person 노드 생성
  nodes.push({
    id: 'person1',
    type: 'PERSON',
    label: 'Person 1',
    properties: {
      dayMaster: person1Saju.dayMaster.name,
      element: person1Saju.dayMaster.element,
      yinYang: person1Saju.dayMaster.yin_yang,
      sunSign: person1Astro.sun.sign,
      moonSign: person1Astro.moon.sign,
    },
  });

  nodes.push({
    id: 'person2',
    type: 'PERSON',
    label: 'Person 2',
    properties: {
      dayMaster: person2Saju.dayMaster.name,
      element: person2Saju.dayMaster.element,
      yinYang: person2Saju.dayMaster.yin_yang,
      sunSign: person2Astro.sun.sign,
      moonSign: person2Astro.moon.sign,
    },
  });

  // 2. 오행 노드 및 관계
  addElementNodes(nodes, edges, person1Saju, person2Saju);

  // 3. 행성 노드 및 관계
  addPlanetNodes(nodes, edges, person1Astro, person2Astro);

  // 4. 음양 노드 및 관계
  addYinYangNodes(nodes, edges, person1Saju, person2Saju);

  // 5. 사주 기둥 노드 및 관계
  addPillarNodes(nodes, edges, person1Saju, person2Saju);

  // 6. 크로스 관계 (사주-점성학 융합)
  addCrossRelations(nodes, edges, person1Saju, person1Astro, person2Saju, person2Astro);

  return { nodes, edges };
}

// ============================================================
// 오행 노드 생성
// ============================================================

function addElementNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  p1: SajuProfile,
  p2: SajuProfile
) {
  const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

  for (const el of elements) {
    const count1 = p1.elements[el];
    const count2 = p2.elements[el];

    // 오행 노드 생성
    nodes.push({
      id: `element_${el}`,
      type: 'ELEMENT',
      label: el.toUpperCase(),
      properties: {
        person1Count: count1,
        person2Count: count2,
        total: count1 + count2,
      },
      score: calculateElementScore(count1, count2),
    });

    // Person과 Element 연결
    if (count1 > 0) {
      edges.push({
        source: 'person1',
        target: `element_${el}`,
        type: 'HAS_ELEMENT',
        weight: count1,
        properties: { strength: count1 },
      });
    }

    if (count2 > 0) {
      edges.push({
        source: 'person2',
        target: `element_${el}`,
        type: 'HAS_ELEMENT',
        weight: count2,
        properties: { strength: count2 },
      });
    }
  }

  // 오행 간 상생상극 관계 추가
  const elementRelations = {
    wood: { generates: 'fire', controls: 'earth' },
    fire: { generates: 'earth', controls: 'metal' },
    earth: { generates: 'metal', controls: 'water' },
    metal: { generates: 'water', controls: 'wood' },
    water: { generates: 'wood', controls: 'fire' },
  };

  for (const [source, rels] of Object.entries(elementRelations)) {
    edges.push({
      source: `element_${source}`,
      target: `element_${rels.generates}`,
      type: 'GENERATES',
      weight: 1.0,
      properties: { type: 'sheng', positive: true },
    });

    edges.push({
      source: `element_${source}`,
      target: `element_${rels.controls}`,
      type: 'CONTROLS',
      weight: -0.5,
      properties: { type: 'ke', challenging: true },
    });
  }
}

function calculateElementScore(count1: number, count2: number): number {
  // 균형: 한쪽이 부족하고 다른쪽이 풍부하면 보완 관계
  if ((count1 === 0 && count2 >= 2) || (count2 === 0 && count1 >= 2)) {
    return 90; // 완벽한 보완
  }

  // 둘 다 적절: 중립
  if (count1 >= 1 && count1 <= 2 && count2 >= 1 && count2 <= 2) {
    return 70;
  }

  // 둘 다 과다: 불균형
  if (count1 >= 3 && count2 >= 3) {
    return 40;
  }

  return 60;
}

// ============================================================
// 행성 노드 생성
// ============================================================

function addPlanetNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  p1: AstrologyProfile,
  p2: AstrologyProfile
) {
  const planets = [
    { name: 'Sun', p1: p1.sun, p2: p2.sun },
    { name: 'Moon', p1: p1.moon, p2: p2.moon },
    { name: 'Venus', p1: p1.venus, p2: p2.venus },
    { name: 'Mars', p1: p1.mars, p2: p2.mars },
  ];

  for (const planet of planets) {
    // Person1의 행성
    const id1 = `planet_${planet.name.toLowerCase()}_p1`;
    nodes.push({
      id: id1,
      type: 'PLANET',
      label: `${planet.name} (P1)`,
      properties: {
        sign: planet.p1.sign,
        element: planet.p1.element,
        person: 1,
      },
    });

    edges.push({
      source: 'person1',
      target: id1,
      type: 'HAS_PLANET',
      weight: 1.0,
      properties: { planet: planet.name },
    });

    // Person2의 행성
    const id2 = `planet_${planet.name.toLowerCase()}_p2`;
    nodes.push({
      id: id2,
      type: 'PLANET',
      label: `${planet.name} (P2)`,
      properties: {
        sign: planet.p2.sign,
        element: planet.p2.element,
        person: 2,
      },
    });

    edges.push({
      source: 'person2',
      target: id2,
      type: 'HAS_PLANET',
      weight: 1.0,
      properties: { planet: planet.name },
    });

    // 행성 간 상호작용
    const harmony = calculatePlanetHarmony(planet.p1.element, planet.p2.element);

    edges.push({
      source: id1,
      target: id2,
      type: harmony > 0.5 ? 'HARMONIZES' : 'ASPECTS_WITH',
      weight: harmony,
      properties: {
        p1Sign: planet.p1.sign,
        p2Sign: planet.p2.sign,
        harmonyScore: harmony,
      },
    });
  }

  // 특별 관계: Venus-Mars (로맨틱)
  const venusP1 = `planet_venus_p1`;
  const marsP2 = `planet_mars_p2`;
  const venusP2 = `planet_venus_p2`;
  const marsP1 = `planet_mars_p1`;

  edges.push({
    source: venusP1,
    target: marsP2,
    type: 'RESONATES',
    weight: 0.9,
    properties: { type: 'romantic', special: true },
  });

  edges.push({
    source: venusP2,
    target: marsP1,
    type: 'RESONATES',
    weight: 0.9,
    properties: { type: 'romantic', special: true },
  });
}

function calculatePlanetHarmony(element1: string, element2: string): number {
  if (element1 === element2) return 0.8;

  const compatible = {
    fire: ['air', 'fire'],
    earth: ['water', 'earth'],
    air: ['fire', 'air'],
    water: ['earth', 'water'],
  };

  if (compatible[element1 as keyof typeof compatible]?.includes(element2)) {
    return 0.7;
  }

  return 0.4;
}

// ============================================================
// 음양 노드 생성
// ============================================================

function addYinYangNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  p1: SajuProfile,
  p2: SajuProfile
) {
  const yy1 = p1.dayMaster.yin_yang;
  const yy2 = p2.dayMaster.yin_yang;

  // 음양 노드
  if (!nodes.find(n => n.id === `yinyang_${yy1}`)) {
    nodes.push({
      id: `yinyang_${yy1}`,
      type: 'YINYANG',
      label: yy1.toUpperCase(),
      properties: { polarity: yy1 },
    });
  }

  if (!nodes.find(n => n.id === `yinyang_${yy2}`)) {
    nodes.push({
      id: `yinyang_${yy2}`,
      type: 'YINYANG',
      label: yy2.toUpperCase(),
      properties: { polarity: yy2 },
    });
  }

  edges.push({
    source: 'person1',
    target: `yinyang_${yy1}`,
    type: 'HAS_YINYANG',
    weight: 1.0,
    properties: {},
  });

  edges.push({
    source: 'person2',
    target: `yinyang_${yy2}`,
    type: 'HAS_YINYANG',
    weight: 1.0,
    properties: {},
  });

  // 음양 조화
  if (yy1 !== yy2) {
    edges.push({
      source: `yinyang_${yy1}`,
      target: `yinyang_${yy2}`,
      type: 'COMPLEMENTS',
      weight: 1.0,
      properties: { balance: 'perfect' },
    });
  }
}

// ============================================================
// 사주 기둥 노드 생성
// ============================================================

function addPillarNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  p1: SajuProfile,
  p2: SajuProfile
) {
  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const pillarName of pillars) {
    const p1Pillar = p1.pillars[pillarName];
    const p2Pillar = p2.pillars[pillarName];

    // Person1 기둥
    const id1 = `pillar_${pillarName}_p1`;
    nodes.push({
      id: id1,
      type: 'PILLAR',
      label: `${pillarName} (P1)`,
      properties: {
        stem: p1Pillar.stem,
        branch: p1Pillar.branch,
        person: 1,
      },
    });

    edges.push({
      source: 'person1',
      target: id1,
      type: 'HAS_PILLAR',
      weight: 1.0,
      properties: { position: pillarName },
    });

    // Person2 기둥
    const id2 = `pillar_${pillarName}_p2`;
    nodes.push({
      id: id2,
      type: 'PILLAR',
      label: `${pillarName} (P2)`,
      properties: {
        stem: p2Pillar.stem,
        branch: p2Pillar.branch,
        person: 2,
      },
    });

    edges.push({
      source: 'person2',
      target: id2,
      type: 'HAS_PILLAR',
      weight: 1.0,
      properties: { position: pillarName },
    });

    // 기둥 간 조화 (같은 지지면 강한 연결)
    if (p1Pillar.branch === p2Pillar.branch) {
      edges.push({
        source: id1,
        target: id2,
        type: 'RESONATES',
        weight: 1.0,
        properties: { match: 'branch', value: p1Pillar.branch },
      });
    }

    if (p1Pillar.stem === p2Pillar.stem) {
      edges.push({
        source: id1,
        target: id2,
        type: 'RESONATES',
        weight: 0.8,
        properties: { match: 'stem', value: p1Pillar.stem },
      });
    }
  }
}

// ============================================================
// 크로스 관계 (사주-점성학 융합)
// ============================================================

function addCrossRelations(
  nodes: GraphNode[],
  edges: GraphEdge[],
  p1Saju: SajuProfile,
  p1Astro: AstrologyProfile,
  p2Saju: SajuProfile,
  p2Astro: AstrologyProfile
) {
  // 사주 일간 오행 <-> 점성학 태양 원소
  const westernToEastern: Record<string, string> = {
    fire: 'fire',
    earth: 'earth',
    air: 'wood',
    water: 'water',
  };

  const p1SunElement = westernToEastern[p1Astro.sun.element];
  const p2SunElement = westernToEastern[p2Astro.sun.element];

  // Person1 사주 일간 <-> Person2 태양
  if (p1Saju.dayMaster.element === p2SunElement) {
    edges.push({
      source: 'person1',
      target: 'person2',
      type: 'RESONATES',
      weight: 0.85,
      properties: {
        type: 'cross_element_match',
        sajuElement: p1Saju.dayMaster.element,
        sunElement: p2SunElement,
      },
    });
  }

  // Person2 사주 일간 <-> Person1 태양
  if (p2Saju.dayMaster.element === p1SunElement) {
    edges.push({
      source: 'person2',
      target: 'person1',
      type: 'RESONATES',
      weight: 0.85,
      properties: {
        type: 'cross_element_match',
        sajuElement: p2Saju.dayMaster.element,
        sunElement: p1SunElement,
      },
    });
  }
}

// ============================================================
// 그래프 분석 알고리즘
// ============================================================

export interface GraphAnalysisResult {
  strongestPaths: Path[];
  weakestPaths: Path[];
  clusterScore: number;
  harmonyIndex: number;
  criticalNodes: GraphNode[];
  insights: string[];
}

export interface Path {
  nodes: string[];
  edges: GraphEdge[];
  score: number;
  type: 'positive' | 'negative' | 'neutral';
}

export function analyzeCompatibilityGraph(graph: CompatibilityGraph): GraphAnalysisResult {
  const insights: string[] = [];

  // 1. 최강 경로 찾기 (positive relationships)
  const strongestPaths = findStrongestPaths(graph, 'positive');

  // 2. 최약 경로 찾기 (negative relationships)
  const weakestPaths = findStrongestPaths(graph, 'negative');

  // 3. 클러스터링 점수 (얼마나 연결되어 있는가)
  const clusterScore = calculateClusterScore(graph);

  // 4. 조화 지수 (positive vs negative edges 비율)
  const harmonyIndex = calculateHarmonyIndex(graph);

  // 5. 핵심 노드 (높은 연결성)
  const criticalNodes = findCriticalNodes(graph);

  // 인사이트 생성
  if (harmonyIndex > 0.7) {
    insights.push('🌟 전체적으로 매우 조화로운 관계망을 형성하고 있습니다');
  }

  if (clusterScore > 0.6) {
    insights.push('💫 사주와 점성학이 강하게 연결되어 시너지가 높습니다');
  }

  const resonanceEdges = graph.edges.filter(e => e.type === 'RESONATES');
  if (resonanceEdges.length >= 3) {
    insights.push(`✨ ${resonanceEdges.length}개의 공명 포인트가 발견되어 깊은 연결감이 있습니다`);
  }

  const conflictEdges = graph.edges.filter(e => e.type === 'CONFLICTS' || e.weight < 0);
  if (conflictEdges.length > 0) {
    insights.push(`⚠️ ${conflictEdges.length}개의 도전 영역이 있으니 이해와 조율이 필요합니다`);
  }

  return {
    strongestPaths,
    weakestPaths,
    clusterScore,
    harmonyIndex,
    criticalNodes,
    insights,
  };
}

function findStrongestPaths(
  graph: CompatibilityGraph,
  type: 'positive' | 'negative'
): Path[] {
  const paths: Path[] = [];
  const person1Edges = graph.edges.filter(e => e.source === 'person1');
  const _person2Edges = graph.edges.filter(e => e.source === 'person2');

  // Simple path finding: Person1 -> Intermediate -> Person2
  for (const e1 of person1Edges) {
    const intermediate = e1.target;
    const connectingEdges = graph.edges.filter(
      e => e.source === intermediate && e.target.startsWith('person2')
    );

    for (const e2 of connectingEdges) {
      const score = e1.weight * e2.weight;
      const isPositive = score > 0.5;

      if ((type === 'positive' && isPositive) || (type === 'negative' && !isPositive)) {
        paths.push({
          nodes: ['person1', intermediate, 'person2'],
          edges: [e1, e2],
          score: Math.abs(score),
          type: isPositive ? 'positive' : 'negative',
        });
      }
    }
  }

  return paths.sort((a, b) => b.score - a.score).slice(0, 5);
}

function calculateClusterScore(graph: CompatibilityGraph): number {
  const totalNodes = graph.nodes.length;
  const totalEdges = graph.edges.length;
  const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;

  return totalEdges / maxPossibleEdges;
}

function calculateHarmonyIndex(graph: CompatibilityGraph): number {
  const positiveEdges = graph.edges.filter(
    e => e.type === 'HARMONIZES' || e.type === 'COMPLEMENTS' || e.type === 'RESONATES' || e.type === 'GENERATES'
  );
  const negativeEdges = graph.edges.filter(
    e => e.type === 'CONFLICTS' || e.type === 'CONTROLS'
  );

  const total = positiveEdges.length + negativeEdges.length;
  if (total === 0) return 0.5;

  return positiveEdges.length / total;
}

function findCriticalNodes(graph: CompatibilityGraph): GraphNode[] {
  const nodeDegrees = new Map<string, number>();

  for (const edge of graph.edges) {
    nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
    nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
  }

  const sortedNodes = Array.from(nodeDegrees.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => graph.nodes.find(n => n.id === id)!)
    .filter(Boolean);

  return sortedNodes;
}

// ============================================================
// 그래프 시각화 데이터 생성
// ============================================================

export interface VisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: NodeType;
    color: string;
    size: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    color: string;
    width: number;
  }>;
}

export function generateVisualizationData(graph: CompatibilityGraph): VisualizationData {
  const nodeColors: Record<NodeType, string> = {
    PERSON: '#8b5cf6',
    ELEMENT: '#10b981',
    PLANET: '#f59e0b',
    ZODIAC: '#ec4899',
    PILLAR: '#3b82f6',
    YINYANG: '#6366f1',
    ASPECT: '#14b8a6',
  };

  const edgeColors: Record<string, string> = {
    HARMONIZES: '#10b981',
    COMPLEMENTS: '#10b981',
    RESONATES: '#f59e0b',
    GENERATES: '#3b82f6',
    CONFLICTS: '#ef4444',
    CONTROLS: '#f97316',
    ASPECTS_WITH: '#6366f1',
  };

  return {
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      color: nodeColors[n.type],
      size: (n.score || 50) / 10,
    })),
    edges: graph.edges.map(e => ({
      source: e.source,
      target: e.target,
      label: e.type,
      color: edgeColors[e.type] || '#94a3b8',
      width: Math.abs(e.weight) * 3,
    })),
  };
}
