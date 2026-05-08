import type { DomainKey, MatrixSummary, TransitCycle } from './types'

export type ChecklistIntent = 'focus' | 'social' | 'organize' | 'recover'
export type ChecklistRisk = 'speech' | 'impulse' | 'conflict' | 'spend'
export type ChecklistRiskLevel = 'low' | 'mid' | 'high'
export type ChecklistConfidence = 'low' | 'mid' | 'high'

export interface ActionChecklistItem {
  id: string
  title: string
  durationMin: number
  steps: string[]
  doneWhen: string
  avoidIf?: string
  fallback?: string
  why: string
}

export interface ActionChecklistBlock {
  date: string
  windowLabel: string
  intentPrimary: ChecklistIntent
  riskPrimary?: ChecklistRisk
  riskLevel?: ChecklistRiskLevel
  confidence: ChecklistConfidence
  headline: string
  checklist: ActionChecklistItem[]
  avoid: string[]
}

export interface ActionChecklistResult {
  today: ActionChecklistBlock
  tomorrow?: ActionChecklistBlock
}

type ChecklistLocale = 'ko' | 'en'

const DOMAIN_TO_INTENT: Record<DomainKey, ChecklistIntent> = {
  career: 'focus',
  money: 'organize',
  love: 'social',
  health: 'recover',
  move: 'organize',
}

const TRANSIT_RISK_WEIGHT: Partial<Record<TransitCycle, Partial<Record<ChecklistRisk, number>>>> = {
  mercuryRetrograde: { speech: 3 },
  venusRetrograde: { spend: 2 },
  marsRetrograde: { impulse: 2, conflict: 2 },
  saturnRetrograde: { conflict: 1 },
  jupiterRetrograde: { spend: 1 },
  saturnReturn: { conflict: 1, impulse: 1 },
  uranusSquare: { impulse: 2 },
  plutoTransit: { conflict: 2 },
  nodeReturn: { speech: 1 },
}

type IntentTemplate = {
  prep: Array<Omit<ActionChecklistItem, 'id'>>
  execute: Array<Omit<ActionChecklistItem, 'id'>>
  close: Array<Omit<ActionChecklistItem, 'id'>>
}

const TEMPLATES_KO: Record<ChecklistIntent, IntentTemplate> = {
  focus: {
    prep: [
      {
        title: '이번 블록의 단일 목표 1개를 문장으로 적기',
        durationMin: 5,
        steps: ['메모 앱을 열기', '목표를 동사형 한 문장으로 작성'],
        doneWhen: '목표 문장 1개가 저장됨',
        fallback: '목표가 모호하면 오늘 끝내야 할 산출물 이름으로 대체',
        why: '집중 블록의 성공률은 시작 목표의 명확도에 가장 크게 좌우됩니다.',
      },
      {
        title: '방해요소 2개를 먼저 차단하기',
        durationMin: 5,
        steps: ['알림 일시중지', '불필요 탭/앱 닫기'],
        doneWhen: '집중에 불필요한 알림/탭이 정리됨',
        fallback: '완전 차단이 어렵다면 방해 앱을 최소화 모드로 전환',
        why: '초반 잡음을 줄이면 실제 몰입 시간이 늘어납니다.',
      },
    ],
    execute: [
      {
        title: '딥워크 50분 1세트 실행',
        durationMin: 50,
        steps: ['타이머 50분 설정', '핵심 작업만 진행'],
        doneWhen: '중단 없이 50분 작업을 완료',
        fallback: '집중 유지가 어렵다면 25분 2세트로 분할',
        why: '집중 에너지가 높은 구간은 긴 단위 몰입에서 성과가 큽니다.',
      },
      {
        title: '중간 점검 10분: 산출물 기준으로 진행률 확인',
        durationMin: 10,
        steps: ['완료/미완료 항목 표시', '남은 작업 재배치'],
        doneWhen: '진행률이 숫자 또는 항목 수로 표시됨',
        fallback: '진행률이 애매하면 완료 항목 개수로 단순화',
        why: '중간 점검은 집중의 방향 이탈을 줄입니다.',
      },
      {
        title: '의사결정이 필요한 항목 1개만 확정',
        durationMin: 10,
        steps: ['의사결정 후보 나열', '영향도 가장 큰 1개 선택'],
        doneWhen: '결정 1개가 명시됨',
        fallback: '확정이 어렵다면 의사결정 기준 2개를 먼저 고정',
        why: '집중 블록의 핵심은 결정 피로를 줄이는 것입니다.',
      },
      {
        title: '지연된 작은 일 3개를 15분 내 처리',
        durationMin: 15,
        steps: ['2분 이내 작업만 추림', '연속으로 처리'],
        doneWhen: '소규모 작업 3개 완료',
        fallback: '3개가 어렵다면 2개로 축소 후 다음 블록 이월',
        why: '작은 병목 제거가 후속 집중 품질을 올립니다.',
      },
      {
        title: '핵심 결과물을 공유 가능한 형태로 정리',
        durationMin: 15,
        steps: ['결과 요약 3줄 작성', '파일/링크 정리'],
        doneWhen: '공유 가능한 결과 요약이 준비됨',
        fallback: '완성도가 낮으면 현재 상태+다음 액션만 공유',
        why: '정리된 결과는 다음 블록 전환 비용을 낮춥니다.',
      },
    ],
    close: [
      {
        title: '다음 블록 첫 작업 1개 예약',
        durationMin: 5,
        steps: ['다음 시작 작업 1개 메모', '시작 시각 고정'],
        doneWhen: '다음 블록 시작점이 기록됨',
        fallback: '시각 확정이 어렵다면 시작 조건만 정의',
        why: '마감 예약은 재시작 마찰을 줄입니다.',
      },
    ],
  },
  social: {
    prep: [
      {
        title: '오늘 대화 목표 2개를 짧게 정의',
        durationMin: 5,
        steps: ['전달할 핵심 1개', '확인할 질문 1개'],
        doneWhen: '핵심/질문이 각각 1개 이상 정리됨',
        fallback: '목표가 없다면 관계 유지 메시지 1개를 목표로 설정',
        why: '사교 블록은 의도 없는 대화보다 목적 있는 대화가 효율적입니다.',
      },
      {
        title: '민감 주제 금지선 1개 정하기',
        durationMin: 3,
        steps: ['오늘 피할 주제 1개 선택'],
        doneWhen: '피할 주제가 명확히 지정됨',
        fallback: '모호하면 금전/관계정의 대화를 기본 금지선으로 설정',
        why: '사전 경계선은 불필요한 갈등을 줄입니다.',
      },
    ],
    execute: [
      {
        title: '안부/팔로업 메시지 3건 전송',
        durationMin: 15,
        steps: ['대상 3명 선정', '짧은 근황+질문 포함 전송'],
        doneWhen: '메시지 3건 발송 완료',
        fallback: '부담되면 2건으로 축소하고 1건은 내일 예약',
        why: '관계 에너지가 높은 구간은 접점 확대에 유리합니다.',
      },
      {
        title: '미팅/약속 후보 2개 시간 제안',
        durationMin: 10,
        steps: ['가능 시간 2개 제시', '확정 대신 조율 표현 사용'],
        doneWhen: '시간 제안이 2개 이상 전달됨',
        fallback: '실시간 조율이 어렵다면 캘린더 링크 제공',
        why: '유연한 제안은 일정 확정 성공률을 높입니다.',
      },
      {
        title: '대화 중 확인 질문 2회 사용',
        durationMin: 20,
        steps: ['핵심 내용 반복 확인', '상대 의도 재확인'],
        doneWhen: '확인 질문을 최소 2회 수행',
        fallback: '질문이 어렵다면 요약 문장으로 확인 대체',
        why: '확인 질문은 오해 비용을 낮춥니다.',
      },
      {
        title: '합의/요청 사항을 3문장 이내로 정리',
        durationMin: 10,
        steps: ['요청 1개', '기한 1개', '다음 행동 1개 작성'],
        doneWhen: '3문장 요약이 작성됨',
        fallback: '복잡하면 항목형 3줄로 변환',
        why: '짧은 정리는 커뮤니케이션 정확도를 올립니다.',
      },
      {
        title: '협업/소개 연결 1건 만들기',
        durationMin: 10,
        steps: ['연결 가치가 있는 2인 선정', '소개 문구 전송'],
        doneWhen: '연결 메시지 1건 발송',
        fallback: '즉시 연결이 어려우면 소개 메모 초안 작성',
        why: '사교 에너지는 네트워크 확장에 가장 효과적입니다.',
      },
    ],
    close: [
      {
        title: '오늘 대화 요약 5줄 남기기',
        durationMin: 5,
        steps: ['결정사항/보류사항/다음 액션 기록'],
        doneWhen: '대화 로그 1건 이상 기록 완료',
        fallback: '시간이 없으면 결정사항 2줄만 기록',
        why: '요약 기록은 후속 실행 누락을 줄입니다.',
      },
    ],
  },
  organize: {
    prep: [
      {
        title: '정리 대상 영역 1개만 선택',
        durationMin: 5,
        steps: ['메일/파일/일정 중 1개 선택'],
        doneWhen: '정리 대상이 1개로 고정됨',
        fallback: '선택이 어렵다면 메일부터 시작',
        why: '정리 블록은 범위 축소가 성과에 직결됩니다.',
      },
      {
        title: '정리 기준 2개 정하기',
        durationMin: 5,
        steps: ['보관 기준', '삭제 기준 정의'],
        doneWhen: '기준 2개가 문장으로 정리됨',
        fallback: '기준이 애매하면 최근 30일 기준 적용',
        why: '기준 없이 정리하면 재혼잡이 빨라집니다.',
      },
    ],
    execute: [
      {
        title: '메일/메시지 20개 일괄 분류',
        durationMin: 20,
        steps: ['즉시처리/보류/삭제 3분류', '보류는 기한 부여'],
        doneWhen: '20개 이상 분류 완료',
        fallback: '20개가 어렵다면 10개 단위로 2회 진행',
        why: '일괄 분류는 맥락 전환 비용을 줄입니다.',
      },
      {
        title: '다음 72시간 일정 재배치',
        durationMin: 15,
        steps: ['고정 일정 확인', '핵심 작업 슬롯 확보'],
        doneWhen: '72시간 캘린더가 재정렬됨',
        fallback: '전체 조정이 어렵다면 내일 오전 슬롯만 확보',
        why: '단기 일정 안정화가 실행률을 높입니다.',
      },
      {
        title: '반복 업무 1개 자동화 또는 템플릿화',
        durationMin: 20,
        steps: ['반복 업무 선택', '체크리스트/템플릿 작성'],
        doneWhen: '재사용 가능한 템플릿 1개 생성',
        fallback: '완전 자동화가 어렵다면 체크리스트만 먼저 작성',
        why: '반복 업무 표준화는 누수 시간을 줄입니다.',
      },
      {
        title: '지출/구독 항목 3개 점검',
        durationMin: 10,
        steps: ['고정비 목록 확인', '불필요 항목 표시'],
        doneWhen: '점검 항목 3개 이상 기록',
        fallback: '데이터 부족 시 카드 내역 최근 7일만 점검',
        why: '정리 블록의 재무 점검은 누적 리스크를 낮춥니다.',
      },
      {
        title: '문서/파일 명명 규칙 1개 통일',
        durationMin: 10,
        steps: ['규칙 선택', '최근 파일 5개 적용'],
        doneWhen: '파일 5개 이상 규칙 적용 완료',
        fallback: '전체 적용이 어렵다면 오늘 생성 파일부터 적용',
        why: '명명 규칙 통일은 검색 시간을 줄입니다.',
      },
    ],
    close: [
      {
        title: '정리 결과와 남은 항목을 3줄로 기록',
        durationMin: 5,
        steps: ['완료 1줄', '미완료 1줄', '다음 액션 1줄'],
        doneWhen: '정리 로그 3줄 완료',
        fallback: '시간 부족 시 다음 액션 1줄만 작성',
        why: '마감 로그는 정리 효과를 유지시킵니다.',
      },
    ],
  },
  recover: {
    prep: [
      {
        title: '회복 목표 1개 설정(수면/스트레스/에너지)',
        durationMin: 5,
        steps: ['회복 지표 1개 선택', '현재 상태 1줄 기록'],
        doneWhen: '회복 지표와 기준이 정의됨',
        fallback: '지표 선택이 어렵다면 수면 기준으로 고정',
        why: '회복 블록은 측정 가능한 목표가 있어야 효과가 지속됩니다.',
      },
      {
        title: '자극 줄이기: 화면/알림/카페인 조정',
        durationMin: 5,
        steps: ['알림 감소', '카페인 시간 제한 설정'],
        doneWhen: '자극 완화 설정 2개 적용',
        fallback: '완전 제한이 어렵다면 한 가지만 적용',
        why: '과자극 감소가 회복 속도를 높입니다.',
      },
    ],
    execute: [
      {
        title: '호흡 또는 명상 10분 수행',
        durationMin: 10,
        steps: ['타이머 10분', '호흡 카운트 유지'],
        doneWhen: '중단 없이 10분 수행 완료',
        fallback: '10분이 어렵다면 5분 2회로 분할',
        why: '신경계 안정화는 회복 블록의 핵심입니다.',
      },
      {
        title: '가벼운 신체 활성 15분(걷기/스트레칭)',
        durationMin: 15,
        steps: ['실내 또는 실외 이동', '호흡 가능한 강도로 유지'],
        doneWhen: '15분 활동 기록 완료',
        fallback: '외출이 어렵다면 실내 스트레칭 10분',
        why: '저강도 활동은 피로 누적을 줄입니다.',
      },
      {
        title: '수분/식사 리듬 점검 1회',
        durationMin: 10,
        steps: ['물 섭취', '과식/공복 상태 확인'],
        doneWhen: '섭취 상태 점검 완료',
        fallback: '식사가 어렵다면 수분 섭취 우선',
        why: '기본 리듬 회복이 에너지 안정에 직접적입니다.',
      },
      {
        title: '감정 로그 3줄 기록',
        durationMin: 10,
        steps: ['현재 감정', '원인', '완화 행동 1개 작성'],
        doneWhen: '감정 로그 3줄 작성 완료',
        fallback: '3줄이 어렵다면 감정 단어 2개만 기록',
        why: '감정 명료화는 충동 반응을 줄입니다.',
      },
      {
        title: '저녁 수면 준비 루틴 예약',
        durationMin: 5,
        steps: ['취침 1시간 전 알람', '화면 오프 계획 설정'],
        doneWhen: '수면 루틴 예약 완료',
        fallback: '완전 루틴이 어렵다면 화면 오프 시간만 예약',
        why: '회복 품질은 다음날 실행력을 결정합니다.',
      },
    ],
    close: [
      {
        title: '오늘 회복 점수(1~10) 기록',
        durationMin: 3,
        steps: ['점수 기록', '내일 조정 1개 메모'],
        doneWhen: '점수와 조정안이 기록됨',
        fallback: '점수만 먼저 기록하고 조정안은 내일 작성',
        why: '짧은 회고가 회복 루틴의 지속성을 만듭니다.',
      },
    ],
  },
}

const RISK_GUARD_KO: Record<ChecklistRisk, Array<Omit<ActionChecklistItem, 'id'>>> = {
  speech: [
    {
      title: '확정 발언 전 3초 멈춤 규칙 적용',
      durationMin: 3,
      steps: ['중요 발언 전 짧은 멈춤', '표현 완곡화'],
      doneWhen: '확정 발언 전 멈춤을 1회 이상 수행',
      avoidIf: '감정이 올라와 즉답하고 싶을 때',
      fallback: '즉답 대신 “확인 후 답변” 문장 사용',
      why: '말실수 리스크 구간에서는 속도보다 정확도가 우선입니다.',
    },
    {
      title: '합의 내용은 문자/메모로 재확인',
      durationMin: 5,
      steps: ['결정사항 3줄 요약', '상대 확인 요청'],
      doneWhen: '요약 메시지 1건 전송 완료',
      avoidIf: '구두 합의만으로 종료하려 할 때',
      fallback: '최소한 본인 메모라도 즉시 저장',
      why: '문서화는 커뮤니케이션 오차를 줄입니다.',
    },
  ],
  impulse: [
    {
      title: '즉시 결정 금지: 10분 유예 규칙 적용',
      durationMin: 10,
      steps: ['결정 후보 기록', '10분 후 재판단'],
      doneWhen: '충동 결정 1건을 유예 처리',
      avoidIf: '흥분/분노 상태',
      fallback: '결정을 내일로 이월',
      why: '충동 리스크 구간은 시간 지연이 품질을 올립니다.',
    },
    {
      title: '큰 선택은 체크리스트 3항목 확인 후 진행',
      durationMin: 5,
      steps: ['비용', '되돌리기 가능성', '대안 존재 여부 확인'],
      doneWhen: '3항목 점검 완료',
      avoidIf: '확증 편향 상태',
      fallback: '신뢰하는 1명에게 짧은 검토 요청',
      why: '충동 판단을 구조화된 점검으로 완화할 수 있습니다.',
    },
  ],
  conflict: [
    {
      title: '갈등 신호 감지 시 논점 1개만 다루기',
      durationMin: 10,
      steps: ['핵심 논점 하나로 제한', '감정 표현 최소화'],
      doneWhen: '단일 논점으로 대화 유지',
      avoidIf: '과거 이슈까지 확장하고 싶을 때',
      fallback: '논의 중단 후 일정 재잡기',
      why: '갈등 구간에서는 논점 축소가 손실을 줄입니다.',
    },
    {
      title: '반박 전에 상대 요지 1문장 복기',
      durationMin: 5,
      steps: ['상대 요지 반복', '동의 가능한 부분 먼저 확인'],
      doneWhen: '복기 문장 1회 이상 사용',
      avoidIf: '바로 반박하고 싶을 때',
      fallback: '질문형으로 전환',
      why: '복기 기반 대화는 충돌 강도를 낮춥니다.',
    },
  ],
  spend: [
    {
      title: '비예정 지출은 24시간 보류',
      durationMin: 5,
      steps: ['장바구니 저장', '내일 재검토 예약'],
      doneWhen: '즉시 결제 1건 이상 보류',
      avoidIf: '할인/마감 문구에 급해질 때',
      fallback: '예산 범위 내 소액만 허용',
      why: '지출 리스크 구간은 지연이 최선의 방어입니다.',
    },
    {
      title: '결제 전 필요성 체크 3문항 적용',
      durationMin: 5,
      steps: ['오늘 꼭 필요한가', '대체 가능한가', '예산 내인가 확인'],
      doneWhen: '3문항 체크 후 결제 여부 확정',
      avoidIf: '감정 보상 소비를 느낄 때',
      fallback: '필요성 점수 2점 이하 항목은 취소',
      why: '구조화된 점검은 후회 비용을 줄입니다.',
    },
  ],
}

function toConfidenceLabel(value: number | undefined): ChecklistConfidence {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'mid'
  }
  if (value >= 0.7) return 'high'
  if (value >= 0.4) return 'mid'
  return 'low'
}

function pickIntent(summary: MatrixSummary): ChecklistIntent {
  const scores = summary.domainScores
  if (!scores) {
    return 'focus'
  }
  const top = (Object.entries(scores) as Array<[DomainKey, { finalScoreAdjusted: number }]>)
    .sort((a, b) => (b[1]?.finalScoreAdjusted || 0) - (a[1]?.finalScoreAdjusted || 0))[0]
  if (!top) {
    return 'focus'
  }
  return DOMAIN_TO_INTENT[top[0]] || 'focus'
}

function inferRiskFromSignals(
  transits: TransitCycle[],
  summary: MatrixSummary
): { risk?: ChecklistRisk; level?: ChecklistRiskLevel } {
  const score: Record<ChecklistRisk, number> = {
    speech: 0,
    impulse: 0,
    conflict: 0,
    spend: 0,
  }

  for (const transit of transits) {
    const weights = TRANSIT_RISK_WEIGHT[transit]
    if (!weights) continue
    for (const [risk, value] of Object.entries(weights) as Array<[ChecklistRisk, number]>) {
      score[risk] += value
    }
  }

  const cautionSignals = summary.calendarSignals?.filter((signal) => signal.level === 'caution') || []
  for (const signal of cautionSignals) {
    const trigger = signal.trigger.toLowerCase()
    if (trigger.includes('retrograde') || trigger.includes('communication')) {
      score.speech += 1
    }
    if (trigger.includes('clash') || trigger.includes('conflict')) {
      score.conflict += 1
    }
  }

  const sorted = (Object.entries(score) as Array<[ChecklistRisk, number]>).sort(
    (a, b) => b[1] - a[1]
  )
  const [risk, value] = sorted[0]
  if (!risk || value <= 0) {
    return {}
  }
  const level: ChecklistRiskLevel = value >= 4 ? 'high' : value >= 2 ? 'mid' : 'low'
  return { risk, level }
}

function buildChecklistItems(intent: ChecklistIntent, risk?: ChecklistRisk): ActionChecklistItem[] {
  const template = TEMPLATES_KO[intent]
  const baseItems = [...template.prep, ...template.execute]
  const closeItems = [...template.close]
  const riskItems = risk ? RISK_GUARD_KO[risk] : []

  const assembled = [...baseItems.slice(0, 7), ...riskItems.slice(0, 2), ...closeItems.slice(0, 1)]
  return assembled.slice(0, 10).map((item, index) => ({
    id: `${intent}-${risk || 'none'}-${index + 1}`,
    ...item,
  }))
}

function buildAvoidList(risk?: ChecklistRisk): string[] {
  if (!risk) {
    return ['즉흥적인 큰 결정은 재확인 후 진행']
  }
  const map: Record<ChecklistRisk, string[]> = {
    speech: ['확정 발언/계약성 코멘트 즉시 확정 금지', '감정 상태에서 장문 답변 금지'],
    impulse: ['충동 결제/충동 퇴사/충동 메시지 전송 금지', '근거 없는 즉시 결정 금지'],
    conflict: ['과거 이슈 동시 제기 금지', '상대 의도 단정 금지'],
    spend: ['비예정 결제 즉시 진행 금지', '할인 문구만 보고 구매 금지'],
  }
  return map[risk]
}

function buildHeadline(
  intent: ChecklistIntent,
  risk: ChecklistRisk | undefined,
  level: ChecklistRiskLevel | undefined
): string {
  const intentText: Record<ChecklistIntent, string> = {
    focus: '집중 실행',
    social: '관계/소통',
    organize: '정리/정돈',
    recover: '회복/리셋',
  }
  if (!risk || !level) {
    return `${intentText[intent]} 우선 블록: 실행 밀도를 높이세요.`
  }
  const riskText: Record<ChecklistRisk, string> = {
    speech: '말실수',
    impulse: '충동',
    conflict: '갈등',
    spend: '지출',
  }
  return `${intentText[intent]} 우세, ${riskText[risk]} 리스크 ${level} 구간입니다.`
}

function buildBlock(params: {
  date: string
  windowLabel: string
  summary: MatrixSummary
  transits: TransitCycle[]
}): ActionChecklistBlock {
  const intentPrimary = pickIntent(params.summary)
  const confidence = toConfidenceLabel(params.summary.confidenceScore)
  const inferredRisk = inferRiskFromSignals(params.transits, params.summary)

  return {
    date: params.date,
    windowLabel: params.windowLabel,
    intentPrimary,
    riskPrimary: inferredRisk.risk,
    riskLevel: inferredRisk.level,
    confidence,
    headline: buildHeadline(intentPrimary, inferredRisk.risk, inferredRisk.level),
    checklist: buildChecklistItems(intentPrimary, inferredRisk.risk),
    avoid: buildAvoidList(inferredRisk.risk),
  }
}

export function buildPremiumActionChecklist(params: {
  summary: MatrixSummary
  locale?: ChecklistLocale
  todayDate: string
  todayTransits: TransitCycle[]
  tomorrowDate?: string
  tomorrowTransits?: TransitCycle[]
}): ActionChecklistResult {
  const locale = params.locale || 'ko'
  const today = buildBlock({
    date: params.todayDate,
    windowLabel: locale === 'ko' ? '오늘 핵심 실행 블록' : 'Today execution block',
    summary: params.summary,
    transits: params.todayTransits,
  })

  const tomorrow =
    params.tomorrowDate && params.tomorrowTransits
      ? buildBlock({
          date: params.tomorrowDate,
          windowLabel: locale === 'ko' ? '내일 선행 준비 블록' : 'Tomorrow prep block',
          summary: params.summary,
          transits: params.tomorrowTransits,
        })
      : undefined

  return {
    today,
    ...(tomorrow ? { tomorrow } : {}),
  }
}
