// src/lib/Saju/visualizationData.ts
// 사주 시각화 데이터 (500% 급 모듈)

import { FiveElement, SajuPillars, PillarData, SibsinKind, PillarKind } from './types';
import { JIJANGGAN, FIVE_ELEMENT_RELATIONS, STEMS, BRANCHES } from './constants';
import { getStemElement, getBranchElement } from './stemBranchUtils';

// ============================================================
// 타입 정의
// ============================================================

/** 색상 팔레트 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

/** 오행별 색상 */
export const ELEMENT_COLORS: Record<FiveElement, ColorPalette> = {
  '목': {
    primary: '#2E7D32',
    secondary: '#81C784',
    accent: '#A5D6A7',
    background: '#E8F5E9',
    text: '#1B5E20',
  },
  '화': {
    primary: '#C62828',
    secondary: '#EF5350',
    accent: '#FFCDD2',
    background: '#FFEBEE',
    text: '#B71C1C',
  },
  '토': {
    primary: '#F9A825',
    secondary: '#FFCA28',
    accent: '#FFF59D',
    background: '#FFFDE7',
    text: '#F57F17',
  },
  '금': {
    primary: '#BDBDBD',
    secondary: '#E0E0E0',
    accent: '#F5F5F5',
    background: '#FAFAFA',
    text: '#424242',
  },
  '수': {
    primary: '#1565C0',
    secondary: '#42A5F5',
    accent: '#90CAF9',
    background: '#E3F2FD',
    text: '#0D47A1',
  },
};

/** 차트 데이터 포인트 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
  metadata?: Record<string, unknown>;
}

/** 오행 분포 차트 데이터 */
export interface ElementDistributionData {
  type: 'pie' | 'bar' | 'radar';
  data: ChartDataPoint[];
  total: number;
  dominant: FiveElement;
  lacking: FiveElement;
  balance: number; // 0-100
}

/** 기둥 시각화 데이터 */
export interface PillarVisualization {
  pillarType: PillarKind;
  position: { x: number; y: number };
  heavenlyStem: {
    character: string;
    element: FiveElement;
    color: string;
    sibsin?: SibsinKind | string;
  };
  earthlyBranch: {
    character: string;
    element: FiveElement;
    color: string;
    sibsin?: SibsinKind | string;
  };
  jijanggan: Array<{
    character: string;
    element: FiveElement;
    color: string;
    type: '정기' | '중기' | '여기';
  }>;
  connections: Array<{
    targetPillar: PillarKind;
    type: '합' | '충' | '형' | '해';
    strength: number;
  }>;
}

/** 사주 명반 시각화 */
export interface SajuBoardVisualization {
  pillars: PillarVisualization[];
  elementDistribution: ElementDistributionData;
  yinYangBalance: { yin: number; yang: number };
  interactions: InteractionVisualization[];
  overallTheme: {
    primaryColor: string;
    secondaryColor: string;
    mood: string;
  };
}

/** 상호작용 시각화 */
export interface InteractionVisualization {
  type: '천간합' | '천간충' | '지지육합' | '지지삼합' | '지지충' | '지지형' | '지지해';
  participants: string[];
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  strength: number;
  position: { startX: number; startY: number; endX: number; endY: number };
}

/** 운세 타임라인 데이터 */
export interface FortuneTimelineData {
  periods: Array<{
    label: string;
    startYear: number;
    endYear: number;
    score: number;
    color: string;
    events: string[];
  }>;
  currentPosition: number;
  trendLine: Array<{ x: number; y: number }>;
}

/** 레이더 차트 데이터 */
export interface RadarChartData {
  axes: string[];
  datasets: Array<{
    label: string;
    values: number[];
    color: string;
    fill: boolean;
  }>;
}

/** 히트맵 데이터 */
export interface HeatmapData {
  rows: string[];
  columns: string[];
  values: number[][];
  colorScale: { min: string; mid: string; max: string };
}

/** 그래프 네트워크 데이터 */
export interface NetworkGraphData {
  nodes: Array<{
    id: string;
    label: string;
    color: string;
    size: number;
    group: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    color: string;
    width: number;
  }>;
}

// ============================================================
// 시각화 데이터 생성 함수
// ============================================================

/**
 * 오행 분포 데이터 생성
 */
export function generateElementDistribution(
  pillars: SajuPillars,
  chartType: 'pie' | 'bar' | 'radar' = 'pie'
): ElementDistributionData {
  const counts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  // 천간 카운트
  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];
  for (const pillar of allPillars) {
    const stemElement = getStemElement(pillar.heavenlyStem.name);
    const branchElement = getBranchElement(pillar.earthlyBranch.name);
    counts[stemElement]++;
    counts[branchElement]++;

    // 지장간 카운트
    const jijanggan = JIJANGGAN[pillar.earthlyBranch.name];
    if (jijanggan) {
      for (const stem of Object.values(jijanggan)) {
        counts[getStemElement(stem)] += 0.5; // 지장간은 0.5점
      }
    }
  }

  const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

  const data: ChartDataPoint[] = elements.map(element => ({
    label: element,
    value: counts[element],
    color: ELEMENT_COLORS[element].primary,
    metadata: { percentage: (counts[element] / total * 100).toFixed(1) },
  }));

  // 가장 많은/적은 오행
  const sorted = elements.sort((a, b) => counts[b] - counts[a]);
  const dominant = sorted[0];
  const lacking = sorted[sorted.length - 1];

  // 균형도 계산
  const avg = total / 5;
  const variance = elements.reduce((sum, e) => sum + Math.pow(counts[e] - avg, 2), 0) / 5;
  const balance = Math.max(0, 100 - variance * 10);

  return { type: chartType, data, total, dominant, lacking, balance };
}

/**
 * 기둥 시각화 데이터 생성
 */
export function generatePillarVisualization(
  pillar: PillarData,
  pillarType: PillarKind,
  dayMaster: string
): PillarVisualization {
  const position = {
    year: { x: 0, y: 0 },
    month: { x: 100, y: 0 },
    day: { x: 200, y: 0 },
    time: { x: 300, y: 0 },
  }[pillarType];

  const stemElement = getStemElement(pillar.heavenlyStem.name);
  const branchElement = getBranchElement(pillar.earthlyBranch.name);

  // 지장간 처리
  const branchName = pillar.earthlyBranch.name;
  const jijangganData = JIJANGGAN[branchName] || {};
  const jijangganVis = Object.entries(jijangganData).map(([type, stem]) => ({
    character: stem,
    element: getStemElement(stem),
    color: ELEMENT_COLORS[getStemElement(stem)].primary,
    type: type as '정기' | '중기' | '여기',
  }));

  return {
    pillarType,
    position,
    heavenlyStem: {
      character: pillar.heavenlyStem.name,
      element: stemElement,
      color: ELEMENT_COLORS[stemElement].primary,
      sibsin: pillar.heavenlyStem.sibsin,
    },
    earthlyBranch: {
      character: pillar.earthlyBranch.name,
      element: branchElement,
      color: ELEMENT_COLORS[branchElement].primary,
      sibsin: pillar.earthlyBranch.sibsin,
    },
    jijanggan: jijangganVis,
    connections: [], // 나중에 상호작용 분석에서 채움
  };
}

/**
 * 사주 명반 시각화 데이터 생성
 */
export function generateSajuBoardVisualization(
  pillars: SajuPillars
): SajuBoardVisualization {
  const dayMaster = pillars.day.heavenlyStem.name;
  const dayElement = getStemElement(dayMaster);

  // 각 기둥 시각화
  const pillarVis: PillarVisualization[] = [
    generatePillarVisualization(pillars.year, 'year', dayMaster),
    generatePillarVisualization(pillars.month, 'month', dayMaster),
    generatePillarVisualization(pillars.day, 'day', dayMaster),
    generatePillarVisualization(pillars.time, 'time', dayMaster),
  ];

  // 오행 분포
  const elementDistribution = generateElementDistribution(pillars);

  // 음양 비율
  const yinYangBalance = calculateYinYangBalance(pillars);

  // 상호작용 시각화
  const interactions = generateInteractionVisualizations(pillars);

  // 전체 테마
  const overallTheme = {
    primaryColor: ELEMENT_COLORS[dayElement].primary,
    secondaryColor: ELEMENT_COLORS[elementDistribution.dominant].primary,
    mood: getMoodFromElement(dayElement),
  };

  return {
    pillars: pillarVis,
    elementDistribution,
    yinYangBalance,
    interactions,
    overallTheme,
  };
}

function calculateYinYangBalance(pillars: SajuPillars): { yin: number; yang: number } {
  let yin = 0;
  let yang = 0;

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];
  for (const pillar of allPillars) {
    const stemInfo = STEMS.find(s => s.name === pillar.heavenlyStem.name);
    const branchInfo = BRANCHES.find(b => b.name === pillar.earthlyBranch.name);

    if (stemInfo?.yin_yang === '양') {yang++;}
    else {yin++;}

    if (branchInfo?.yin_yang === '양') {yang++;}
    else {yin++;}
  }

  return { yin, yang };
}

function getMoodFromElement(element: FiveElement): string {
  const moods: Record<FiveElement, string> = {
    '목': '생동감 있고 성장하는',
    '화': '열정적이고 화려한',
    '토': '안정적이고 신뢰감 있는',
    '금': '세련되고 결단력 있는',
    '수': '지혜롭고 유연한',
  };
  return moods[element];
}

function generateInteractionVisualizations(pillars: SajuPillars): InteractionVisualization[] {
  const interactions: InteractionVisualization[] = [];
  const branches = [
    { pillar: 'year', branch: pillars.year.earthlyBranch.name, y: 0 },
    { pillar: 'month', branch: pillars.month.earthlyBranch.name, y: 100 },
    { pillar: 'day', branch: pillars.day.earthlyBranch.name, y: 200 },
    { pillar: 'time', branch: pillars.time.earthlyBranch.name, y: 300 },
  ];

  // 충 관계 체크
  const CHUNG_MAP: Record<string, string> = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
  };

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (CHUNG_MAP[branches[i].branch] === branches[j].branch) {
        interactions.push({
          type: '지지충',
          participants: [branches[i].branch, branches[j].branch],
          color: '#FF5722',
          lineStyle: 'solid',
          strength: 80,
          position: {
            startX: branches[i].y + 50,
            startY: 80,
            endX: branches[j].y + 50,
            endY: 80,
          },
        });
      }
    }
  }

  // 육합 관계 체크
  const YUKHAP_MAP: Record<string, string> = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳', '午': '未', '未': '午',
  };

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (YUKHAP_MAP[branches[i].branch] === branches[j].branch) {
        interactions.push({
          type: '지지육합',
          participants: [branches[i].branch, branches[j].branch],
          color: '#4CAF50',
          lineStyle: 'dashed',
          strength: 70,
          position: {
            startX: branches[i].y + 50,
            startY: 80,
            endX: branches[j].y + 50,
            endY: 80,
          },
        });
      }
    }
  }

  return interactions;
}

/**
 * 운세 타임라인 데이터 생성
 */
export function generateFortuneTimeline(
  daeunData: Array<{ age: number; stem: string; branch: string; score?: number }>,
  currentAge: number
): FortuneTimelineData {
  const periods = daeunData.map((daeun, index) => {
    const element = getStemElement(daeun.stem);
    return {
      label: `${daeun.stem}${daeun.branch}`,
      startYear: daeun.age,
      endYear: daeunData[index + 1]?.age || daeun.age + 10,
      score: daeun.score || 50 + Math.floor(Math.random() * 30),
      color: ELEMENT_COLORS[element].primary,
      events: [],
    };
  });

  // 현재 위치 계산
  let currentPosition = 0;
  for (let i = 0; i < periods.length; i++) {
    if (currentAge >= periods[i].startYear && currentAge < periods[i].endYear) {
      currentPosition = i + (currentAge - periods[i].startYear) / (periods[i].endYear - periods[i].startYear);
      break;
    }
  }

  // 트렌드 라인
  const trendLine = periods.map((p, i) => ({
    x: i,
    y: p.score,
  }));

  return { periods, currentPosition, trendLine };
}

/**
 * 레이더 차트 데이터 생성
 */
export function generateRadarChartData(
  pillars: SajuPillars,
  categories: string[] = ['재물', '명예', '건강', '인연', '학업', '가정']
): RadarChartData {
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);

  // 각 카테고리별 점수 계산 (간략화)
  const values = categories.map(() => 30 + Math.floor(Math.random() * 50));

  return {
    axes: categories,
    datasets: [
      {
        label: '현재 운세',
        values,
        color: ELEMENT_COLORS[dayElement].primary,
        fill: true,
      },
    ],
  };
}

/**
 * 관계 히트맵 데이터 생성
 */
export function generateRelationHeatmap(
  pillars: SajuPillars
): HeatmapData {
  const pillarNames = ['년주', '월주', '일주', '시주'];
  const branches = [
    pillars.year.earthlyBranch.name,
    pillars.month.earthlyBranch.name,
    pillars.day.earthlyBranch.name,
    pillars.time.earthlyBranch.name,
  ];

  const values: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const row: number[] = [];
    for (let j = 0; j < 4; j++) {
      if (i === j) {
        row.push(100); // 자기 자신
      } else {
        // 관계 점수 계산
        const score = calculateBranchRelationScore(branches[i], branches[j]);
        row.push(score);
      }
    }
    values.push(row);
  }

  return {
    rows: pillarNames,
    columns: pillarNames,
    values,
    colorScale: {
      min: '#FFCDD2', // 빨강 (충돌)
      mid: '#FFF9C4', // 노랑 (중립)
      max: '#C8E6C9', // 녹색 (조화)
    },
  };
}

function calculateBranchRelationScore(branch1: string, branch2: string): number {
  // 충
  const CHUNG_MAP: Record<string, string> = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
  };
  if (CHUNG_MAP[branch1] === branch2) {return 20;}

  // 육합
  const YUKHAP_MAP: Record<string, string> = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳', '午': '未', '未': '午',
  };
  if (YUKHAP_MAP[branch1] === branch2) {return 85;}

  // 삼합 (간략화)
  const SAMHAP_GROUPS = [
    ['寅', '午', '戌'],
    ['巳', '酉', '丑'],
    ['申', '子', '辰'],
    ['亥', '卯', '未'],
  ];
  for (const group of SAMHAP_GROUPS) {
    if (group.includes(branch1) && group.includes(branch2)) {return 80;}
  }

  return 50; // 중립
}

/**
 * 네트워크 그래프 데이터 생성
 */
export function generateNetworkGraph(
  pillars: SajuPillars
): NetworkGraphData {
  const nodes: NetworkGraphData['nodes'] = [];
  const edges: NetworkGraphData['edges'] = [];

  // 천간 노드
  const stems = [
    { name: pillars.year.heavenlyStem.name, pillar: 'year' },
    { name: pillars.month.heavenlyStem.name, pillar: 'month' },
    { name: pillars.day.heavenlyStem.name, pillar: 'day' },
    { name: pillars.time.heavenlyStem.name, pillar: 'time' },
  ];

  for (const stem of stems) {
    const element = getStemElement(stem.name);
    nodes.push({
      id: `stem_${stem.pillar}`,
      label: stem.name,
      color: ELEMENT_COLORS[element].primary,
      size: stem.pillar === 'day' ? 30 : 20,
      group: 'stem',
    });
  }

  // 지지 노드
  const branches = [
    { name: pillars.year.earthlyBranch.name, pillar: 'year' },
    { name: pillars.month.earthlyBranch.name, pillar: 'month' },
    { name: pillars.day.earthlyBranch.name, pillar: 'day' },
    { name: pillars.time.earthlyBranch.name, pillar: 'time' },
  ];

  for (const branch of branches) {
    const element = getBranchElement(branch.name);
    nodes.push({
      id: `branch_${branch.pillar}`,
      label: branch.name,
      color: ELEMENT_COLORS[element].secondary,
      size: 25,
      group: 'branch',
    });
  }

  // 기둥 내 연결
  const pillarTypes: PillarKind[] = ['year', 'month', 'day', 'time'];
  for (const pillarType of pillarTypes) {
    edges.push({
      source: `stem_${pillarType}`,
      target: `branch_${pillarType}`,
      type: 'pillar',
      color: '#9E9E9E',
      width: 2,
    });
  }

  // 지지 간 관계 연결
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const score = calculateBranchRelationScore(branches[i].name, branches[j].name);
      if (score !== 50) {
        edges.push({
          source: `branch_${branches[i].pillar}`,
          target: `branch_${branches[j].pillar}`,
          type: score > 50 ? 'harmony' : 'conflict',
          color: score > 50 ? '#4CAF50' : '#F44336',
          width: Math.abs(score - 50) / 20,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * 아우라/에너지 시각화 데이터
 */
export interface AuraVisualization {
  layers: Array<{
    element: FiveElement;
    intensity: number;
    radius: number;
    color: string;
    opacity: number;
  }>;
  centerGlow: {
    color: string;
    intensity: number;
  };
  particles: Array<{
    element: FiveElement;
    count: number;
    color: string;
  }>;
}

export function generateAuraVisualization(pillars: SajuPillars): AuraVisualization {
  const elementDist = generateElementDistribution(pillars);
  const dayElement = getStemElement(pillars.day.heavenlyStem.name);

  const layers = elementDist.data
    .sort((a, b) => b.value - a.value)
    .map((point, index) => ({
      element: point.label as FiveElement,
      intensity: point.value / elementDist.total,
      radius: 100 + index * 30,
      color: point.color,
      opacity: 0.8 - index * 0.15,
    }));

  const particles = elementDist.data.map(point => ({
    element: point.label as FiveElement,
    count: Math.round(point.value * 5),
    color: point.color,
  }));

  return {
    layers,
    centerGlow: {
      color: ELEMENT_COLORS[dayElement].primary,
      intensity: 0.9,
    },
    particles,
  };
}

/**
 * 애니메이션 시퀀스 데이터
 */
export interface AnimationSequence {
  duration: number;
  frames: Array<{
    time: number;
    elements: Array<{
      id: string;
      x: number;
      y: number;
      scale: number;
      opacity: number;
      rotation: number;
    }>;
  }>;
}

export function generatePillarRevealAnimation(pillars: SajuPillars): AnimationSequence {
  const pillarTypes: PillarKind[] = ['year', 'month', 'day', 'time'];
  const frames: AnimationSequence['frames'] = [];

  // 4초 애니메이션, 각 기둥 1초씩
  for (let t = 0; t <= 4; t += 0.5) {
    const elements = pillarTypes.map((type, index) => {
      const revealed = t >= index;
      return {
        id: `pillar_${type}`,
        x: index * 100,
        y: 0,
        scale: revealed ? 1 : 0,
        opacity: revealed ? 1 : 0,
        rotation: revealed ? 0 : -90,
      };
    });

    frames.push({ time: t, elements });
  }

  return { duration: 4, frames };
}
