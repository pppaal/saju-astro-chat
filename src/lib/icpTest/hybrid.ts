import type { IcpHybridResult, IcpResult } from './types'
import type { PersonaAnalysis } from '@/lib/persona/types'

const HYBRID_CATALOG: Record<string, Omit<IcpHybridResult, 'fallback'>> = {
  HX01: {
    id: 'HX01',
    nameKo: '추진 코치형',
    descriptionKo: '사람을 움직이며 성장을 설계하는 하이브리드입니다.',
    guidance: [
      '목표를 사람 언어로 번역하기',
      '코칭 전에 합의 질문하기',
      '성과와 관계 지표를 같이 추적하기',
    ],
    blindspots: ['리드가 과해 통제로 보일 수 있음', '상대 속도보다 앞서갈 수 있음'],
  },
  HX02: {
    id: 'HX02',
    nameKo: '전략 추진형',
    descriptionKo: '빠른 판단과 실행으로 결과를 만드는 하이브리드입니다.',
    guidance: ['결정 전 반대근거 확인', '실험 단위로 리스크 분할', '공유 기준 문서화'],
    blindspots: ['관계 피로 누적', '조급한 실행'],
  },
  HX03: {
    id: 'HX03',
    nameKo: '안정 운영형',
    descriptionKo: '구조와 신뢰를 통해 팀의 지속성을 높이는 하이브리드입니다.',
    guidance: ['역할 경계 먼저 합의', '운영 리듬 고정', '예외 규칙을 미리 정의'],
    blindspots: ['변화 반응이 늦어질 수 있음', '자기희생적 운영'],
  },
  HX04: {
    id: 'HX04',
    nameKo: '공감 중재형',
    descriptionKo: '감정과 논리를 이어 갈등을 전환시키는 하이브리드입니다.',
    guidance: ['사실-감정-요청 순서 사용', '중재 후 합의사항 문서화', '회복 시간 확보'],
    blindspots: ['감정 과부하', '결정 지연'],
  },
  HX05: {
    id: 'HX05',
    nameKo: '분석 설계형',
    descriptionKo: '정확한 구조화와 설계력으로 복잡한 문제를 다루는 하이브리드입니다.',
    guidance: ['결정 마감시점 고정', '가설-검증 루프 짧게', '핵심지표 3개만 유지'],
    blindspots: ['과분석', '정서 신호 누락'],
  },
  HX06: {
    id: 'HX06',
    nameKo: '조용한 리더형',
    descriptionKo: '드러나지 않지만 핵심 순간에 방향을 바꾸는 하이브리드입니다.',
    guidance: ['핵심회의 발화 슬롯 확보', '의견을 문서로 선공유', '실험 결과를 빠르게 공개'],
    blindspots: ['가시성 부족', '기회 보류'],
  },
  HX07: {
    id: 'HX07',
    nameKo: '관계 성장형',
    descriptionKo: '정서적 신뢰를 바탕으로 장기 성장을 만드는 하이브리드입니다.',
    guidance: ['공감 뒤 행동 1개 제안', '기대치 합의 확인', '관계 피로 주기 점검'],
    blindspots: ['경계 희석', '타인 과몰입'],
  },
  HX08: {
    id: 'HX08',
    nameKo: '기준 수호형',
    descriptionKo: '원칙과 성과를 함께 지키는 하이브리드입니다.',
    guidance: ['원칙-예외 기준 동시 명시', '합의 없는 확장 금지', '사후 회고 규칙화'],
    blindspots: ['유연성 저하', '관계 온도 하락'],
  },
  HX09: {
    id: 'HX09',
    nameKo: '유연 실험형',
    descriptionKo: '아이디어를 빠르게 시도하고 학습하는 하이브리드입니다.',
    guidance: ['작은 실험을 주 단위로 운영', '학습 로그 남기기', '중단 기준을 먼저 정하기'],
    blindspots: ['우선순위 흔들림', '완성도 저하'],
  },
  HX10: {
    id: 'HX10',
    nameKo: '신뢰 빌더형',
    descriptionKo: '안정감 있는 소통으로 관계 자본을 쌓는 하이브리드입니다.',
    guidance: ['약속 범위를 명확히 말하기', '리스크를 사전에 공유', '회복 루틴을 업무에 포함'],
    blindspots: ['갈등 회피', '지나친 조율'],
  },
  HX11: {
    id: 'HX11',
    nameKo: '성과 균형형',
    descriptionKo: '성과와 사람을 동시에 관리하는 밸런스형 하이브리드입니다.',
    guidance: ['성과지표+관계지표 동시 추적', '역할 위임 표준화', '분기마다 전략 리셋'],
    blindspots: ['멀티목표 과부하', '결정 피로'],
  },
  HX12: {
    id: 'HX12',
    nameKo: '장기 멘토형',
    descriptionKo: '긴 호흡으로 사람과 시스템을 같이 키우는 하이브리드입니다.',
    guidance: ['성장단계별 목표 설계', '자립지표 중심 피드백', '조언 전 준비도 확인'],
    blindspots: ['개입 과다', '속도 불일치'],
  },
}

export const EXPLORING_HYBRID: IcpHybridResult = {
  id: 'HX00',
  nameKo: '혼합형(탐색 중)',
  descriptionKo: '현재 응답 신뢰도가 낮거나 신호가 혼합되어 탐색 결과로 제시됩니다.',
  guidance: [
    '며칠 뒤 재측정하기',
    '응답 속도를 늦추고 직관적으로 선택하기',
    '최근 상태가 아닌 평소 패턴 기준으로 답하기',
  ],
  blindspots: ['상황 반응이 과도하게 반영될 수 있음', '현재 결과를 고정 성향으로 해석할 위험'],
  fallback: true,
}

function pickHybridId(icp: IcpResult, persona?: PersonaAnalysis | null): string {
  if (!persona) {
    return 'HX11'
  }

  const code = persona.typeCode || 'RSLA'
  const second = code[1] || 'S'
  const third = code[2] || 'L'
  const fourth = code[3] || 'A'

  if ((icp.primaryStyle === 'PA' || icp.primaryStyle === 'NO') && third === 'H') return 'HX01'
  if ((icp.primaryStyle === 'PA' || icp.primaryStyle === 'BC') && second === 'V' && third === 'L')
    return 'HX02'
  if ((icp.primaryStyle === 'HI' || icp.primaryStyle === 'JK') && second === 'S' && fourth === 'A')
    return 'HX03'
  if ((icp.primaryStyle === 'LM' || icp.primaryStyle === 'JK') && third === 'H') return 'HX04'
  if ((icp.primaryStyle === 'DE' || icp.primaryStyle === 'FG') && second === 'S' && third === 'L')
    return 'HX05'
  if ((icp.primaryStyle === 'FG' || icp.primaryStyle === 'DE') && code[0] === 'G' && second === 'V')
    return 'HX06'
  if (
    (icp.primaryStyle === 'LM' || icp.primaryStyle === 'NO') &&
    code[0] === 'R' &&
    third === 'H' &&
    fourth === 'F'
  )
    return 'HX07'
  if (
    (icp.primaryStyle === 'BC' || icp.primaryStyle === 'DE') &&
    second === 'S' &&
    third === 'L' &&
    fourth === 'A'
  )
    return 'HX08'
  if ((icp.primaryStyle === 'PA' || icp.primaryStyle === 'LM') && second === 'V' && fourth === 'F')
    return 'HX09'
  if (
    (icp.primaryStyle === 'HI' || icp.primaryStyle === 'JK') &&
    code[0] === 'G' &&
    third === 'H' &&
    fourth === 'A'
  )
    return 'HX10'
  if ((icp.primaryStyle === 'BC' || icp.primaryStyle === 'PA') && code === 'RSLA') return 'HX11'
  if ((icp.primaryStyle === 'NO' || icp.primaryStyle === 'HI') && code === 'GVHA') return 'HX12'

  return 'HX11'
}

export function resolveHybridArchetype(
  icp: IcpResult,
  persona?: PersonaAnalysis | null
): IcpHybridResult {
  if (icp.confidence < 45) {
    return EXPLORING_HYBRID
  }
  const id = pickHybridId(icp, persona)
  const hybrid = HYBRID_CATALOG[id] ?? HYBRID_CATALOG.HX11
  return { ...hybrid, fallback: false }
}
