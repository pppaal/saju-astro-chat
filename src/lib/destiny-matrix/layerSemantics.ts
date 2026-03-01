import type { DestinyFusionMatrixComputed } from './types'

export type LayerId =
  | 'layer1'
  | 'layer2'
  | 'layer3'
  | 'layer4'
  | 'layer5'
  | 'layer6'
  | 'layer7'
  | 'layer8'
  | 'layer9'
  | 'layer10'

export interface LayerSemanticDefinition {
  id: LayerId
  nameKo: string
  nameEn: string
  meaningKo: string
  meaningEn: string
  answersKo: string[]
  answersEn: string[]
  evidenceSources: string[]
  confidenceRule: string
  conflictRule: string
  actionPolicy: {
    allowIrreversible: boolean
    allowedActions: string[]
    blockedActions: string[]
  }
}

export interface LayerSemanticState extends LayerSemanticDefinition {
  matchedCells: number
  active: boolean
  signalStrength: 'high' | 'medium' | 'low'
}

export interface MatrixSemanticContract {
  version: '1.0'
  interpretationOrder: LayerId[]
  globalConflictPolicy: string
  lowConfidencePolicy: string
  layers: LayerSemanticState[]
}

export const LAYER_SEMANTICS: LayerSemanticDefinition[] = [
  {
    id: 'layer1',
    nameKo: '기운 핵심',
    nameEn: 'Element Core',
    meaningKo: '사주 오행과 서양 원소의 기본 체질 정합성',
    meaningEn: 'Core constitution alignment between Saju elements and Western elements',
    answersKo: ['타고난 기본 에너지 구조는?', '과열/고갈이 어디서 시작되는가?'],
    answersEn: ['What is the innate energy baseline?', 'Where does overload or depletion begin?'],
    evidenceSources: ['dayMasterElement', 'pillarElements', 'dominantWesternElement'],
    confidenceRule: 'Need day master + pillar elements + dominant western element',
    conflictRule:
      'When layer1 conflicts with higher timing layers, treat as baseline not immediate action trigger',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['rhythm adjustment', 'habit tuning'],
      blockedActions: ['immediate commitment'],
    },
  },
  {
    id: 'layer2',
    nameKo: '십신-행성',
    nameEn: 'Sibsin-Planet',
    meaningKo: '역할 성향(십신)과 행성 기능의 결합',
    meaningEn: 'Role tendencies (Sibsin) mapped to planetary functions',
    answersKo: ['현재 행동 스타일의 강점/약점은?', '의사결정 기질은 어떤가?'],
    answersEn: [
      'What are current behavioral strengths/weaknesses?',
      'How is decision style shaped?',
    ],
    evidenceSources: ['sibsinDistribution', 'planetHouses', 'planetSigns'],
    confidenceRule: 'Need non-empty sibsin distribution and major planets',
    conflictRule:
      'If layer2 contradicts layer4 risk, keep strategy but delay irreversible execution',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['draft', 'strategy', 'review'],
      blockedActions: ['sign now', 'finalize now'],
    },
  },
  {
    id: 'layer3',
    nameKo: '십신-하우스',
    nameEn: 'Sibsin-House',
    meaningKo: '삶의 영역별(하우스) 에너지 배치',
    meaningEn: 'Life-domain allocation via house placements',
    answersKo: ['어느 생활영역을 우선해야 하나?', '에너지가 분산되는 지점은?'],
    answersEn: ['Which life domain should be prioritized?', 'Where is energy scattered?'],
    evidenceSources: ['sibsinDistribution', 'planetHouses'],
    confidenceRule: 'Need valid house coverage across personal planets',
    conflictRule: 'Use as priority map; do not override timing warnings',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['priority setting', 'scope control'],
      blockedActions: ['overexpansion'],
    },
  },
  {
    id: 'layer4',
    nameKo: '타이밍',
    nameEn: 'Timing Overlay',
    meaningKo: '지금 시점의 실행 리스크/가속 신호',
    meaningEn: 'Immediate execution risk/acceleration signals',
    answersKo: ['지금 해도 되는가?', '오늘/이번주 리스크는?'],
    answersEn: ['Is this executable now?', 'What is the immediate risk this week?'],
    evidenceSources: ['activeTransits', 'currentDaeunElement', 'currentSaeunElement'],
    confidenceRule: 'Need current transit cycles plus at least one luck-cycle signal',
    conflictRule: 'Timing risk has precedence over opportunity layers for irreversible actions',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['verify', 'delay 24h', 'double-check'],
      blockedActions: ['contract signing', 'final booking', 'public launch'],
    },
  },
  {
    id: 'layer5',
    nameKo: '관계-애스펙트',
    nameEn: 'Relation-Aspect',
    meaningKo: '관계 역학과 상호작용 긴장/조화',
    meaningEn: 'Relational dynamics from branch relations and aspects',
    answersKo: ['갈등 원인은 어디인가?', '협업/연애에서 조화 포인트는?'],
    answersEn: ['Where does friction come from?', 'Where is relational harmony available?'],
    evidenceSources: ['relations', 'aspects'],
    confidenceRule: 'Need validated relation hits and major aspect mapping',
    conflictRule: 'When clash/conflict cells dominate, require communication safeguards',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['expectation alignment', 'written recap'],
      blockedActions: ['ultimatum', 'same-day hard commitment'],
    },
  },
  {
    id: 'layer6',
    nameKo: '십이운성-하우스',
    nameEn: 'Stage-House',
    meaningKo: '생명력/성장단계가 영역별로 드러나는 패턴',
    meaningEn: 'Vitality and growth-stage pattern by life domain',
    answersKo: ['현재 성장 단계는?', '소모되는 영역은 어디인가?'],
    answersEn: ['What growth stage is active?', 'Which domain is draining?'],
    evidenceSources: ['twelveStages', 'planetHouses'],
    confidenceRule: 'Need valid twelve-stage extraction from pillars',
    conflictRule: 'Low-stage conflict requires load reduction before expansion',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['load balancing', 'recovery block'],
      blockedActions: ['overcommitment'],
    },
  },
  {
    id: 'layer7',
    nameKo: '고급 분석',
    nameEn: 'Advanced Analysis',
    meaningKo: '격국/용신과 고급 점성(프로그레션·리턴)의 교차',
    meaningEn: 'Cross of Geokguk/Yongsin with advanced astrology (progressions/returns)',
    answersKo: ['중장기 방향은?', '구조적 전환 포인트는?'],
    answersEn: ['What is the mid-long term direction?', 'Where are structural turning points?'],
    evidenceSources: ['geokguk', 'yongsin', 'advancedAstroSignals'],
    confidenceRule: 'Need geokguk or yongsin plus at least one advanced astrology signal',
    conflictRule: 'Use for direction-setting, not same-day execution override',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['roadmap update', 'milestone planning'],
      blockedActions: ['instant pivot'],
    },
  },
  {
    id: 'layer8',
    nameKo: '신살-행성',
    nameEn: 'Shinsal-Planet',
    meaningKo: '특수기운(신살)의 증폭/경고 신호',
    meaningEn: 'Amplification/warning from special Shinsal signatures',
    answersKo: ['예외적 기회/위험은?', '과잉반응 포인트는?'],
    answersEn: ['Where are exceptional opportunities/risks?', 'Where is overreaction likely?'],
    evidenceSources: ['shinsalList', 'planetHouses'],
    confidenceRule: 'Need normalized shinsal list mapped to matrix set',
    conflictRule: 'Treat as amplifier; must be gated by timing and confidence',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['risk buffer', 'guardrail setup'],
      blockedActions: ['all-in decisions'],
    },
  },
  {
    id: 'layer9',
    nameKo: '소행성-하우스',
    nameEn: 'Asteroid-House',
    meaningKo: '세부 관계/전략 성향의 미세 조정',
    meaningEn: 'Fine-grained relationship/strategy tuning via asteroids',
    answersKo: ['세부 조정 포인트는?', '관계 계약 조건에서 무엇을 보완할까?'],
    answersEn: ['What fine adjustments are needed?', 'What should be tightened in agreements?'],
    evidenceSources: ['asteroidHouses', 'dayMasterElement'],
    confidenceRule: 'Need asteroid house coverage (Ceres/Pallas/Juno/Vesta)',
    conflictRule: 'Supportive detail layer; cannot overrule layer4 risk gates',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['term negotiation', 'detail refinement'],
      blockedActions: ['blind acceptance'],
    },
  },
  {
    id: 'layer10',
    nameKo: '엑스트라포인트',
    nameEn: 'Extra Points',
    meaningKo: '심층 심리/의미 축(Chiron/Lilith/Fortune/Vertex/Nodes)',
    meaningEn: 'Deep psychological/meaning axis via extra points',
    answersKo: ['반복되는 내적 패턴은?', '의미/치유 축은 어디인가?'],
    answersEn: ['What inner patterns keep repeating?', 'Where is the meaning-healing axis?'],
    evidenceSources: ['extraPointSigns', 'sibsinDistribution', 'dayMasterElement'],
    confidenceRule: 'Need extra point signs with stable base layers',
    conflictRule: 'Interpretive depth layer; actions must remain reversible under low confidence',
    actionPolicy: {
      allowIrreversible: false,
      allowedActions: ['reflection', 'message draft', 'boundary statement'],
      blockedActions: ['emotion-driven final decisions'],
    },
  },
]

function toSignalStrength(matchedCells: number): 'high' | 'medium' | 'low' {
  if (matchedCells >= 20) return 'high'
  if (matchedCells >= 8) return 'medium'
  return 'low'
}

export function buildMatrixSemanticContract(
  matrix: DestinyFusionMatrixComputed
): MatrixSemanticContract {
  const counts: Record<LayerId, number> = {
    layer1: Object.keys(matrix.layer1_elementCore).length,
    layer2: Object.keys(matrix.layer2_sibsinPlanet).length,
    layer3: Object.keys(matrix.layer3_sibsinHouse).length,
    layer4: Object.keys(matrix.layer4_timing).length,
    layer5: Object.keys(matrix.layer5_relationAspect).length,
    layer6: Object.keys(matrix.layer6_stageHouse).length,
    layer7: Object.keys(matrix.layer7_advanced).length,
    layer8: Object.keys(matrix.layer8_shinsalPlanet).length,
    layer9: Object.keys(matrix.layer9_asteroidHouse).length,
    layer10: Object.keys(matrix.layer10_extraPointElement).length,
  }

  const layers: LayerSemanticState[] = LAYER_SEMANTICS.map((base) => {
    const matchedCells = counts[base.id] || 0
    return {
      ...base,
      matchedCells,
      active: matchedCells > 0,
      signalStrength: toSignalStrength(matchedCells),
    }
  })

  return {
    version: '1.0',
    interpretationOrder: [
      'layer4',
      'layer5',
      'layer2',
      'layer3',
      'layer7',
      'layer6',
      'layer8',
      'layer9',
      'layer10',
      'layer1',
    ],
    globalConflictPolicy:
      'If risk signals (timing/communication/conflict) are active, block irreversible recommendations and switch to verification-first actions.',
    lowConfidencePolicy:
      'When confidence is low, provide reversible steps only and include explicit recheck checkpoints.',
    layers,
  }
}
