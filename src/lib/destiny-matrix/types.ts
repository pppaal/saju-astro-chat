// src/lib/destiny-matrix/types.ts
// Destiny Fusion Matrix™ - Type Definitions

import type { FiveElement, SibsinKind, TwelveStage, RelationHit } from '../Saju/types';
import type { AspectType, ZodiacKo } from '../astrology/foundation/types';

// ===========================
// Core Types
// ===========================

export type InteractionLevel = 'extreme' | 'amplify' | 'balance' | 'clash' | 'conflict';

export type InteractionCode = {
  level: InteractionLevel;
  score: number; // 1-10
  icon: string;
  colorCode: 'purple' | 'green' | 'blue' | 'yellow' | 'red';
  keyword: string;
  keywordEn: string;
};

export type WesternElement = 'fire' | 'earth' | 'air' | 'water';

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type TransitCycle =
  | 'saturnReturn' | 'jupiterReturn' | 'uranusSquare'
  | 'neptuneSquare' | 'plutoTransit' | 'nodeReturn' | 'eclipse'
  // Retrograde cycles (역행)
  | 'mercuryRetrograde' | 'venusRetrograde' | 'marsRetrograde'
  | 'jupiterRetrograde' | 'saturnRetrograde';

export type LuckCycleType = 'daeun' | 'saeun' | 'wolun' | 'ilun';

export type GeokgukType =
  // 정격 (Regular Patterns) - 8종
  | 'jeonggwan'   // 정관격 (正官格)
  | 'pyeongwan'   // 편관격 (偏官格/칠살격)
  | 'jeongin'     // 정인격 (正印格)
  | 'pyeongin'    // 편인격 (偏印格)
  | 'siksin'      // 식신격 (食神格)
  | 'sanggwan'    // 상관격 (傷官格)
  | 'jeongjae'    // 정재격 (正財格)
  | 'pyeonjae'    // 편재격 (偏財格)
  // 특수격 (Special Patterns) - 2종
  | 'geonrok'     // 건록격 (建祿格)
  | 'yangin'      // 양인격 (羊刃格)
  // 종격 (Following Patterns) - 4종
  | 'jonga'       // 종아격 (從兒格) - 식상 따름
  | 'jongjae'     // 종재격 (從財格) - 재성 따름
  | 'jongsal'     // 종살격 (從殺格) - 관성 따름
  | 'jonggang'    // 종강격 (從强格) - 비겁 따름
  // 외격 (External Patterns) - 5종
  | 'gokjik'      // 곡직격 (曲直格) - 목 일색
  | 'yeomsang'    // 염상격 (炎上格) - 화 일색
  | 'gasaek'      // 가색격 (稼穡格) - 토 일색
  | 'jonghyeok'   // 종혁격 (從革格) - 금 일색
  | 'yunha';      // 윤하격 (潤下格) - 수 일색

export type ProgressionType =
  | 'secondary' | 'solarArc' | 'solarReturn' | 'lunarReturn' | 'draconic' | 'harmonics';

export type BranchRelation =
  | 'samhap' | 'yukhap' | 'banghap'
  | 'chung' | 'hyeong' | 'pa' | 'hae' | 'wonjin';

// Layer 8: Shinsal Types
export type ShinsalKind =
  // 길신 (吉神) - 좋은 신살
  | '천을귀인' | '태극귀인' | '천덕귀인' | '월덕귀인' | '문창귀인' | '학당귀인'
  | '금여록' | '천주귀인' | '암록' | '건록' | '제왕'
  // 흉신 (凶神) - 주의가 필요한 신살
  | '도화' | '홍염살' | '양인' | '백호' | '겁살' | '재살' | '천살' | '지살' | '년살'
  | '월살' | '망신' | '고신' | '괴강' | '현침' | '귀문관'
  // 특수 신살
  | '역마' | '화개' | '장성' | '반안' | '천라지망' | '공망' | '삼재' | '원진';

// Layer 9: Asteroid Types
export type AsteroidName = 'Ceres' | 'Pallas' | 'Juno' | 'Vesta';

// Layer 10: Extra Point Types
export type ExtraPointName = 'Chiron' | 'Lilith' | 'PartOfFortune' | 'Vertex' | 'NorthNode' | 'SouthNode';

// ===========================
// Matrix Cell Types
// ===========================

export interface MatrixCell {
  interaction: InteractionCode;
  sajuBasis?: string;
  astroBasis?: string;
  advice?: string;
}

// ===========================
// Layer 1: Element Core Grid
// ===========================

export type ElementCoreGrid = {
  [sajuElement in FiveElement]: {
    [westElement in WesternElement]: InteractionCode;
  };
};

// ===========================
// Layer 2: Sibsin-Planet Matrix
// ===========================

export type SibsinPlanetMatrix = {
  [sibsin in SibsinKind]: {
    [planet in PlanetName]: InteractionCode;
  };
};

// ===========================
// Layer 3: Sibsin-House Matrix
// ===========================

export type SibsinHouseMatrix = {
  [sibsin in SibsinKind]: {
    [house in HouseNumber]: InteractionCode;
  };
};

// ===========================
// Layer 4: Timing Overlay Matrix
// ===========================

export type TimingCycleRow = 'daeunTransition' | FiveElement | 'shortTerm' | 'wolun' | 'ilun';

export type TimingOverlayMatrix = {
  [row in TimingCycleRow]: {
    [transit in TransitCycle]: InteractionCode;
  };
};

// ===========================
// Layer 5: Relations-Aspects Matrix
// ===========================

export type RelationAspectMatrix = {
  [relation in BranchRelation]: {
    [aspect in AspectType]: InteractionCode;
  };
};

// ===========================
// Layer 6: TwelveStage-House Matrix
// ===========================

export type TwelveStageHouseMatrix = {
  [stage in TwelveStage]: {
    [house in HouseNumber]: InteractionCode;
  };
};

// ===========================
// Layer 7: Advanced Analysis Matrix
// ===========================

export type AdvancedAnalysisRow = GeokgukType | `yongsin_${FiveElement}`;

export type AdvancedAnalysisMatrix = {
  [row in AdvancedAnalysisRow]: {
    [progression in ProgressionType]: InteractionCode;
  };
};

// ===========================
// Layer 8: Shinsal-Planet Matrix
// ===========================

export type ShinsalPlanetMatrix = {
  [shinsal in ShinsalKind]: {
    [planet in PlanetName]: InteractionCode;
  };
};

// ===========================
// Layer 9: Asteroid-House Matrix
// ===========================

export type AsteroidHouseMatrix = {
  [asteroid in AsteroidName]: {
    [house in HouseNumber]: InteractionCode;
  };
};

export type AsteroidElementMatrix = {
  [asteroid in AsteroidName]: {
    [element in FiveElement]: InteractionCode;
  };
};

// ===========================
// Layer 10: ExtraPoint-Element/Sibsin Matrix
// ===========================

export type ExtraPointElementMatrix = {
  [point in ExtraPointName]: {
    [element in FiveElement]: InteractionCode;
  };
};

export type ExtraPointSibsinMatrix = {
  [point in ExtraPointName]: Partial<{
    [sibsin in SibsinKind]: InteractionCode;
  }>;
};

// ===========================
// Complete Matrix Output
// ===========================

export interface DestinyFusionMatrix {
  layer1_elementCore: ElementCoreGrid;
  layer2_sibsinPlanet: SibsinPlanetMatrix;
  layer3_sibsinHouse: SibsinHouseMatrix;
  layer4_timing: TimingOverlayMatrix;
  layer5_relationAspect: RelationAspectMatrix;
  layer6_stageHouse: TwelveStageHouseMatrix;
  layer7_advanced: AdvancedAnalysisMatrix;
  layer8_shinsalPlanet: ShinsalPlanetMatrix;
  layer9_asteroidHouse: AsteroidHouseMatrix;
  layer10_extraPointElement: ExtraPointElementMatrix;

  // Summary
  summary: MatrixSummary;
}

export interface MatrixSummary {
  totalScore: number;
  strengthPoints: MatrixHighlight[];
  balancePoints: MatrixHighlight[];
  cautionPoints: MatrixHighlight[];
  topSynergies: MatrixSynergy[];
}

export interface MatrixHighlight {
  layer: number;
  rowKey: string;
  colKey: string;
  cell: MatrixCell;
}

export interface MatrixSynergy {
  layers: number[];
  description: string;
  score: number;
}

// ===========================
// Input Types for Calculation
// ===========================

export interface MatrixCalculationInput {
  // Saju data
  dayMasterElement: FiveElement;
  pillarElements: FiveElement[];
  sibsinDistribution: Partial<Record<SibsinKind, number>>;
  twelveStages: Partial<Record<TwelveStage, number>>;
  relations: RelationHit[];
  geokguk?: GeokgukType;
  yongsin?: FiveElement;
  currentDaeunElement?: FiveElement;
  currentSaeunElement?: FiveElement;

  // Shinsal data (Layer 8)
  shinsalList?: ShinsalKind[];

  // Astrology data
  dominantWesternElement?: WesternElement;
  planetHouses: Partial<Record<PlanetName, HouseNumber>>;
  planetSigns: Partial<Record<PlanetName, ZodiacKo>>;
  aspects: Array<{
    planet1: PlanetName;
    planet2: PlanetName;
    type: AspectType;
  }>;
  activeTransits?: TransitCycle[];

  // Asteroid data (Layer 9)
  asteroidHouses?: Partial<Record<AsteroidName, HouseNumber>>;

  // Extra Point data (Layer 10)
  extraPointSigns?: Partial<Record<ExtraPointName, ZodiacKo>>;

  // Options
  lang?: 'ko' | 'en';
}
