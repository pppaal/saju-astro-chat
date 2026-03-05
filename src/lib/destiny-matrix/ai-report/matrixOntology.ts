export type MatrixSignalDomain =
  | 'career'
  | 'relationship'
  | 'wealth'
  | 'health'
  | 'timing'
  | 'personality'
  | 'spirituality'
  | 'move'
export type MatrixTheme = 'love' | 'career' | 'wealth' | 'health' | 'family'

interface DomainSemantic {
  focusKo: string
  focusEn: string
  riskKo: string
  riskEn: string
}

interface LayerOntology {
  layer: number
  meaningKo: string
  meaningEn: string
  domains: Partial<Record<MatrixSignalDomain, DomainSemantic>>
}

const DEFAULT_DOMAIN_SEMANTIC: DomainSemantic = {
  focusKo: '핵심 흐름의 방향을 좁혀 실행력을 높이세요.',
  focusEn: 'Narrow the core flow and raise execution quality.',
  riskKo: '확정 전 조건 재확인 단계를 분리해 변동 비용을 줄이세요.',
  riskEn: 'Separate a pre-commit recheck step to reduce volatility cost.',
}

export const MATRIX_LAYER_ONTOLOGY: Record<number, LayerOntology> = {
  1: {
    layer: 1,
    meaningKo: '기질 기반 레이어: 오행 균형과 기본 반응 속도를 해석합니다.',
    meaningEn: 'Temperament layer: interprets element balance and baseline reaction speed.',
    domains: {
      personality: {
        focusKo: '판단 기준을 명확히 두면 일관성이 빠르게 올라갑니다.',
        focusEn: 'Clear judgment criteria quickly improve consistency.',
        riskKo: '감정 속도와 실행 속도를 분리해야 오판을 줄일 수 있습니다.',
        riskEn: 'Separate emotional speed from execution speed to reduce misjudgment.',
      },
      health: {
        focusKo: '수면·수분·회복 루틴이 성과의 바닥을 지켜줍니다.',
        focusEn: 'Sleep, hydration, and recovery routines protect your baseline output.',
        riskKo: '과속 루틴은 반동 피로를 키우므로 강도보다 리듬을 우선하세요.',
        riskEn: 'Overspeed routines amplify rebound fatigue; prioritize rhythm over intensity.',
      },
    },
  },
  2: {
    layer: 2,
    meaningKo: '십성 역할 레이어: 동기 구조와 행동 패턴의 우선순위를 해석합니다.',
    meaningEn: 'Ten-star role layer: interprets motivation structure and action priorities.',
    domains: {
      career: {
        focusKo: '역할·책임·마감 기준을 고정하면 성과 재현성이 올라갑니다.',
        focusEn: 'Lock role, ownership, and deadline to raise performance repeatability.',
        riskKo: '역할 경계가 흐려지면 협업 마찰 비용이 커질 수 있습니다.',
        riskEn: 'If role boundaries blur, collaboration friction cost can increase.',
      },
      wealth: {
        focusKo: '수익보다 현금흐름 가시화가 장기 누적 성과를 만듭니다.',
        focusEn: 'Cashflow visibility beats raw upside for long-term compounding.',
        riskKo: '조건 확인 없이 확정하면 손실 상한이 커질 수 있습니다.',
        riskEn: 'Committing without term checks can widen downside exposure.',
      },
    },
  },
  3: {
    layer: 3,
    meaningKo: '상호작용 레이어: 관계/협업에서 나타나는 마찰과 시너지를 해석합니다.',
    meaningEn: 'Interaction layer: interprets friction and synergy in relationships/collaboration.',
    domains: {
      relationship: {
        focusKo: '질문-요약-확인의 대화 루프가 신뢰 누적에 유리합니다.',
        focusEn: 'Question-summary-confirm loops are favorable for trust accumulation.',
        riskKo: '해석 오차가 커지면 감정 비용이 빠르게 증가할 수 있습니다.',
        riskEn: 'If interpretation drift grows, emotional cost can escalate quickly.',
      },
      career: {
        focusKo: '협업은 속도보다 인터페이스 정의가 성과를 지킵니다.',
        focusEn: 'In collaboration, interface clarity protects delivery better than speed.',
        riskKo: '핵심 의사결정에 합의 포맷이 없으면 재작업이 늘어납니다.',
        riskEn: 'Without a decision format, rework tends to increase.',
      },
    },
  },
  4: {
    layer: 4,
    meaningKo: '타이밍 레이어: 대운·세운·월운·일진 활성도를 해석합니다.',
    meaningEn: 'Timing layer: interprets activation across Daeun/Seun/Wolun/Iljin.',
    domains: {
      timing: {
        focusKo: '결정과 확정 시점을 분리하면 체감 오류가 줄어듭니다.',
        focusEn: 'Separating decision from commitment timing reduces practical errors.',
        riskKo: '당일 확정은 커뮤니케이션 누락 리스크를 키울 수 있습니다.',
        riskEn: 'Same-day commitment can increase communication omission risk.',
      },
      move: {
        focusKo: '이동/변화는 단계 검증 방식으로 진행할 때 안정성이 높습니다.',
        focusEn: 'Move/change is safer when run through staged validation.',
        riskKo: '한 번에 큰 전환을 확정하면 복구 비용이 커질 수 있습니다.',
        riskEn: 'One-shot transitions can carry high rollback costs.',
      },
    },
  },
  5: {
    layer: 5,
    meaningKo: '충돌 패턴 레이어: 긴장 구간의 트리거와 완충 전략을 해석합니다.',
    meaningEn: 'Conflict pattern layer: interprets triggers and buffers in high-tension windows.',
    domains: {
      relationship: {
        focusKo: '속도 조절과 표현 명료화가 갈등 비용을 낮춥니다.',
        focusEn: 'Pace control and clearer expression reduce conflict cost.',
        riskKo: '감정 피크에서 즉시 확정하면 오해가 고착될 수 있습니다.',
        riskEn: 'Immediate commitment at emotional peak can lock in misunderstandings.',
      },
      timing: {
        focusKo: '주의 창에서는 재확인 슬롯 확보가 우선입니다.',
        focusEn: 'In caution windows, securing a recheck slot comes first.',
        riskKo: '경고 신호 무시는 작은 실수를 큰 손실로 키울 수 있습니다.',
        riskEn: 'Ignoring warning signals can amplify minor errors into larger losses.',
      },
    },
  },
  6: {
    layer: 6,
    meaningKo: '국면 전환 레이어: 확장 신호와 리셋 신호의 동시성을 해석합니다.',
    meaningEn: 'Phase transition layer: interprets coexistence of expansion and reset signals.',
    domains: {
      career: {
        focusKo: '상승 구간에서도 범위·책임·기한을 고정하면 성장 효율이 높습니다.',
        focusEn: 'Even in growth windows, fixed scope/ownership/deadline improves efficiency.',
        riskKo: '확장과 재정의가 겹칠 때 무리하면 성과 변동이 커질 수 있습니다.',
        riskEn: 'When expansion overlaps reset, overreach can increase performance variance.',
      },
      wealth: {
        focusKo: '수익 기회와 통제 규율을 함께 설계하면 누적 수익률이 안정됩니다.',
        focusEn: 'Designing upside with control rules stabilizes compounded returns.',
        riskKo: '레버리지성 결정은 검증 없이 진행하면 하방 변동이 확대됩니다.',
        riskEn: 'Leverage-like decisions can widen downside swings without verification.',
      },
    },
  },
  7: {
    layer: 7,
    meaningKo: '장기축 레이어: 사명/가치/지속가능성의 방향성을 해석합니다.',
    meaningEn: 'Long-horizon layer: interprets direction of mission/value/sustainability.',
    domains: {
      spirituality: {
        focusKo: '가치 기준을 문서화하면 장기 방향의 흔들림이 줄어듭니다.',
        focusEn: 'Documented value criteria reduce long-term directional drift.',
        riskKo: '단기 성과 압박만 따르면 방향성 피로가 커질 수 있습니다.',
        riskEn: 'Following only short-term pressure can create directional fatigue.',
      },
      personality: {
        focusKo: '의미 기반 우선순위가 결정 피로를 줄입니다.',
        focusEn: 'Meaning-based priorities reduce decision fatigue.',
        riskKo: '기준이 없으면 선택 과부하로 실행이 느려질 수 있습니다.',
        riskEn: 'Without criteria, choice overload can slow execution.',
      },
    },
  },
  8: {
    layer: 8,
    meaningKo: '확장 자원 레이어: 외부 기회/지원 네트워크 활용도를 해석합니다.',
    meaningEn: 'Expansion resource layer: interprets leverage of external opportunity/support.',
    domains: {
      career: {
        focusKo: '조력자/네트워크 활용은 타이밍보다 준비도에 좌우됩니다.',
        focusEn: 'Mentor/network leverage depends more on readiness than timing alone.',
        riskKo: '준비 없는 기회 수용은 운영 과부하를 만들 수 있습니다.',
        riskEn: 'Taking opportunities without readiness can create operating overload.',
      },
      wealth: {
        focusKo: '기회형 수익은 분할 진입과 회수 계획이 핵심입니다.',
        focusEn: 'Opportunity-driven gains require staged entry and planned exits.',
        riskKo: '확신 편향은 회수 타이밍 누락으로 이어질 수 있습니다.',
        riskEn: 'Overconfidence can lead to missed exit timing.',
      },
    },
  },
  9: {
    layer: 9,
    meaningKo: '관계 구조 레이어: 친밀도·경계·협력 규칙을 해석합니다.',
    meaningEn:
      'Relationship structure layer: interprets intimacy, boundaries, and collaboration rules.',
    domains: {
      relationship: {
        focusKo: '경계가 명확할수록 친밀도와 안정성이 함께 올라갑니다.',
        focusEn: 'Clear boundaries improve both intimacy and stability.',
        riskKo: '기대치 불일치가 누적되면 관계 피로가 커질 수 있습니다.',
        riskEn: 'Accumulated expectation mismatch can increase relationship fatigue.',
      },
      personality: {
        focusKo: '역할 합의와 반복 가능한 규칙이 생활 갈등을 줄입니다.',
        focusEn: 'Role agreements and repeatable rules reduce daily friction.',
        riskKo: '암묵적 기대만으로 운영하면 오해 비용이 커질 수 있습니다.',
        riskEn: 'Relying on implicit expectations can raise misunderstanding cost.',
      },
    },
  },
  10: {
    layer: 10,
    meaningKo: '통합 레이어: 전체 패턴을 실행 가능한 전략으로 압축합니다.',
    meaningEn: 'Integration layer: compresses full pattern into executable strategy.',
    domains: {
      timing: {
        focusKo: '공격/방어 비율을 명확히 두면 실행 일관성이 높아집니다.',
        focusEn: 'Explicit offense/defense ratios improve execution consistency.',
        riskKo: '모든 신호를 동시에 따르려 하면 실행력이 분산될 수 있습니다.',
        riskEn: 'Trying to follow all signals at once can dilute execution power.',
      },
      personality: {
        focusKo: '한 번에 한 축씩 해결하는 방식이 복잡도를 낮춥니다.',
        focusEn: 'Solving one axis at a time reduces system complexity.',
        riskKo: '과잉 최적화는 결정을 늦추고 피로를 누적시킬 수 있습니다.',
        riskEn: 'Over-optimization can slow decisions and accumulate fatigue.',
      },
    },
  },
}

export const THEME_DOMAIN_ONTOLOGY: Record<
  MatrixTheme,
  {
    primary: MatrixSignalDomain[]
    support: MatrixSignalDomain[]
    timing: MatrixSignalDomain[]
  }
> = {
  love: {
    primary: ['relationship'],
    support: ['personality'],
    timing: ['timing', 'relationship'],
  },
  career: {
    primary: ['career'],
    support: ['wealth'],
    timing: ['timing', 'career'],
  },
  wealth: {
    primary: ['wealth'],
    support: ['career'],
    timing: ['timing', 'wealth'],
  },
  health: {
    primary: ['health'],
    support: ['personality'],
    timing: ['timing', 'health'],
  },
  family: {
    primary: ['relationship'],
    support: ['personality'],
    timing: ['timing', 'relationship'],
  },
}

function fallbackLayerMeaning(layer: number, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return `레이어 ${layer} 신호는 해당 구간의 실행 조건을 조정하라는 의미를 가집니다.`
  }
  return `Layer ${layer} signals indicate that execution conditions should be adjusted in this window.`
}

export function getLayerMeaning(layer: number, lang: 'ko' | 'en'): string {
  const ontology = MATRIX_LAYER_ONTOLOGY[layer]
  if (!ontology) return fallbackLayerMeaning(layer, lang)
  return lang === 'ko' ? ontology.meaningKo : ontology.meaningEn
}

export function getDomainSemantic(layer: number, domain: MatrixSignalDomain): DomainSemantic {
  const ontology = MATRIX_LAYER_ONTOLOGY[layer]
  if (!ontology) return DEFAULT_DOMAIN_SEMANTIC
  return ontology.domains[domain] || DEFAULT_DOMAIN_SEMANTIC
}
