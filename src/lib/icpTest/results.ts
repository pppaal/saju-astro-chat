import type { IcpArchetypeCode } from './types'

export interface IcpArchetypeProfile {
  code: IcpArchetypeCode
  nameKo: string
  nameEn: string
  summaryKo: string
  summaryEn: string
  strengths: string[]
  blindspots: string[]
  actions: string[]
  relationshipStyle: string
  workStyle: string
}

export const ICP_ARCHETYPE_PROFILES: Record<IcpArchetypeCode, IcpArchetypeProfile> = {
  PA: {
    code: 'PA',
    nameKo: '주도적 연결자',
    nameEn: 'Leading Connector',
    summaryKo: '사람과 목표를 동시에 움직이는 타입입니다. 방향을 잡고 팀을 묶는 힘이 있습니다.',
    summaryEn: 'You align people and goals with clear direction and social momentum.',
    strengths: ['방향 제시가 빠르다', '관계를 살리며 추진한다', '책임 회피보다 해결을 선택한다'],
    blindspots: ['속도가 빨라 타인의 처리속도를 놓칠 수 있음', '과책임으로 번아웃 위험'],
    actions: [
      '의사결정 기준을 먼저 공유하기',
      '타인 제안 1개를 의도적으로 채택하기',
      '내가 하지 않아도 되는 일 위임하기',
    ],
    relationshipStyle:
      '애정 표현과 리드가 분명합니다. 공감 문장을 먼저 두면 관계 만족도가 더 높아집니다.',
    workStyle: '목표-실행 전환이 빠릅니다. 위임 설계를 함께하면 성과 지속성이 크게 좋아집니다.',
  },
  BC: {
    code: 'BC',
    nameKo: '돌파 전략가',
    nameEn: 'Breakthrough Strategist',
    summaryKo: '승부처에서 집중력이 올라가는 타입입니다. 목표 달성 드라이브가 강합니다.',
    summaryEn: 'You thrive under pressure and push hard toward concrete outcomes.',
    strengths: ['결단과 실행이 빠르다', '경쟁 상황에서 성과가 높다', '우선순위 판단이 명확하다'],
    blindspots: ['성과 중심이 관계 피로를 만들 수 있음', '조급함이 리스크 검토를 줄일 수 있음'],
    actions: [
      '큰 결정 전 반대 근거 3개 확인',
      '성과 리뷰에 관계 지표 추가',
      '장기 목표를 2주 단위로 분해',
    ],
    relationshipStyle: '확실하고 솔직한 편입니다. 질문 비율을 늘리면 갈등 비용을 줄일 수 있습니다.',
    workStyle: '성장/보상형 과제에 강합니다. 24시간 냉각시간 규칙이 손실을 줄입니다.',
  },
  DE: {
    code: 'DE',
    nameKo: '원칙 분석가',
    nameEn: 'Principled Analyst',
    summaryKo: '감정보다 구조를 먼저 보는 타입입니다. 복잡한 상황에서 본질을 잘 잡습니다.',
    summaryEn: 'You prioritize structure and evidence, especially in complex situations.',
    strengths: ['판단 근거가 명확하다', '문제를 구조화한다', '위기 시 침착함을 유지한다'],
    blindspots: ['차가워 보인다는 피드백을 받을 수 있음', '감정 신호를 늦게 처리할 수 있음'],
    actions: [
      '사실 1개와 공감 1문장 같이 말하기',
      '의사결정 후 관계영향 점검',
      '결정 마감 시점 고정',
    ],
    relationshipStyle: '일관성과 신뢰가 강점입니다. 감정 라벨링 표현을 늘리면 친밀도가 올라갑니다.',
    workStyle:
      '분석/기획/리스크 관리에 강합니다. 정보 과잉으로 실행을 늦추지 않도록 마감 기준이 필요합니다.',
  },
  FG: {
    code: 'FG',
    nameKo: '신중 관찰자',
    nameEn: 'Careful Observer',
    summaryKo: '조용하지만 정확하게 흐름을 읽는 타입입니다. 섬세한 맥락 파악이 강점입니다.',
    summaryEn: 'You read subtle context well and make careful, grounded judgments.',
    strengths: ['디테일 포착이 뛰어나다', '섣부른 판단을 피한다', '안정적 신뢰를 만든다'],
    blindspots: ['기회를 앞에서 놓칠 수 있음', '자기표현 부족으로 과소평가될 수 있음'],
    actions: ['회의마다 의견 1회 발화', '보류 이유를 문장으로 기록', '작은 리스크 1개 실험 전환'],
    relationshipStyle:
      '느리지만 진정성 있는 관계를 만듭니다. 짧은 감정표현을 먼저 하면 오해를 줄일 수 있습니다.',
    workStyle: '정확성과 완성도가 높습니다. 80% 기준 제출 시점을 잡으면 성과 속도가 개선됩니다.',
  },
  HI: {
    code: 'HI',
    nameKo: '안정 조율자',
    nameEn: 'Stability Harmonizer',
    summaryKo: '갈등을 낮추고 분위기를 안정시키는 타입입니다. 관계의 균형을 지키는 힘이 큽니다.',
    summaryEn: 'You lower conflict and stabilize group dynamics with steady care.',
    strengths: ['충돌 완화 능력이 높다', '팀 정서 안정에 기여한다', '꾸준함과 배려가 강하다'],
    blindspots: ['자기 필요를 뒤로 미룰 수 있음', '중요한 결정을 미룰 수 있음'],
    actions: [
      '요청 수락 전 내 여유 점검',
      '주 1회 내 우선순위 공유',
      '사실-감정-요청 순서로 말하기',
    ],
    relationshipStyle: '다정하고 수용적입니다. 경계 문장을 함께 쓰면 관계가 더 오래 건강합니다.',
    workStyle: '협업/운영 안정화에 강합니다. 역할 경계 합의가 성과를 크게 높입니다.',
  },
  JK: {
    code: 'JK',
    nameKo: '협력 지원자',
    nameEn: 'Collaborative Supporter',
    summaryKo: '팀의 연결과 실행을 뒷받침하는 타입입니다. 사람을 살리며 결과를 만듭니다.',
    summaryEn: 'You support execution through trust, coordination, and practical collaboration.',
    strengths: ['협업 촉진력이 높다', '타인의 장점을 살린다', '신뢰 기반 실행이 강하다'],
    blindspots: ['과도한 배려로 피로 누적', '충돌 회피로 이슈가 늦게 드러남'],
    actions: ['역할/기대치 문서화', '부담되는 일 명시적으로 공유', '감정 신호가 오면 일정 재협상'],
    relationshipStyle:
      '상대 맞춤 배려가 뛰어납니다. 원하는 점을 구체적으로 말하면 균형이 좋아집니다.',
    workStyle:
      '운영/고객소통/파트너십에 강합니다. 성과 가시화를 의도적으로 해야 손실이 줄어듭니다.',
  },
  LM: {
    code: 'LM',
    nameKo: '공감 촉진자',
    nameEn: 'Empathy Catalyst',
    summaryKo: '감정 흐름을 읽고 관계 회복을 돕는 타입입니다. 신뢰와 유대 형성이 강점입니다.',
    summaryEn: 'You read emotions well and help relationships recover and deepen.',
    strengths: ['공감적 소통 능력', '갈등 후 회복 촉진', '심리적 안전감 조성'],
    blindspots: ['타인의 감정에 과몰입 가능', '경계가 흐려져 소진 위험'],
    actions: ['공감 후 행동 제안은 1개만', '관계 피로 체크리스트 사용', '회복 루틴을 일정에 고정'],
    relationshipStyle:
      '정서적 친밀도를 중요하게 봅니다. 사실 확인 질문을 함께 쓰면 안정감이 커집니다.',
    workStyle: '사람 중심 직무에서 강합니다. 감정노동이 높은 날은 회복 시간을 먼저 배치하세요.',
  },
  NO: {
    code: 'NO',
    nameKo: '성장 멘토',
    nameEn: 'Growth Mentor',
    summaryKo:
      '사람의 가능성을 보고 성장 방향을 제시하는 타입입니다. 장기 변화를 만드는 힘이 큽니다.',
    summaryEn: 'You naturally see potential in others and orient relationships toward growth.',
    strengths: ['잠재력 발견 능력', '장기 성장 설계', '신뢰 기반 피드백 제공'],
    blindspots: ['도와주다 통제적으로 보일 수 있음', '상대 준비도보다 앞서갈 수 있음'],
    actions: ['조언 전 필요 여부 확인', '목표를 상대 언어로 재정의', '내 에너지 한도를 명시'],
    relationshipStyle: '함께 성장하는 관계를 선호합니다. 상대 속도를 존중하면 만족도가 높아집니다.',
    workStyle: '리딩/코칭/육성 역할에 강합니다. 팀의 자립지표를 성과로 추적하면 영향력이 커집니다.',
  },
}

export function getAxisInterpretation(
  axis: 'agency' | 'warmth' | 'boundary' | 'resilience',
  score: number
): string {
  const high = score >= 60
  const low = score <= 40
  if (axis === 'agency') {
    if (high) return '주도성 높음: 의견 표현과 의사결정 리드가 분명합니다.'
    if (low) return '주도성 낮음: 신중하지만 자기표현이 늦어질 수 있습니다.'
    return '주도성 중간: 상황에 맞춰 리드와 협조를 조절합니다.'
  }
  if (axis === 'warmth') {
    if (high) return '관계온도 높음: 정서적 신뢰와 협력 형성이 빠릅니다.'
    if (low) return '관계온도 낮음: 거리 조절이 강점이지만 차갑게 보일 수 있습니다.'
    return '관계온도 중간: 관계 속도와 경계를 비교적 균형 있게 조절합니다.'
  }
  if (axis === 'boundary') {
    if (high) return '경계유연성 높음: 기준을 지키면서도 조정이 가능합니다.'
    if (low) return '경계유연성 낮음: 과잉양보 또는 과잉통제로 흔들릴 수 있습니다.'
    return '경계유연성 중간: 큰 무리 없이 경계를 조절하는 편입니다.'
  }
  if (high) return '회복탄력 높음: 갈등/피드백 이후 회복 전환이 빠릅니다.'
  if (low) return '회복탄력 낮음: 스트레스 잔류 시간이 길어질 수 있습니다.'
  return '회복탄력 중간: 보통 수준의 회복 패턴을 보입니다.'
}
