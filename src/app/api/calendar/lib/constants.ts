/**
 * Calendar message constants
 */

import type { EventCategory } from '@/lib/destiny-map/destinyCalendar'

type CategoryMessages = Record<EventCategory | 'general', string>

export const KO_MESSAGES = {
  GRADE_0: {
    career: '핵심 계약과 역할 조정에 힘이 실리는 날입니다. 다만 마지막 조건 확인은 남겨 두세요.',
    wealth: '재정 판단의 주도권이 올라오는 날입니다. 확장보다 기준을 잡고 실행하는 편이 좋습니다.',
    love: '관계에서 진전을 만들기 좋은 흐름입니다. 중요한 표현은 짧고 분명하게 가져가세요.',
    health: '에너지가 올라오는 날입니다. 무리한 도전보다 리듬을 살리는 실행이 잘 맞습니다.',
    travel: '이동과 변화가 잘 붙는 날입니다. 일정과 조건을 정리한 뒤 움직이면 효율이 높습니다.',
    study: '집중력과 흡수력이 좋은 날입니다. 한 번에 많이보다 핵심 한두 가지를 끝내세요.',
    general: '실행 우선 구간입니다. 핵심 1~2개를 앞당겨 처리하면 체감 성과가 큽니다.',
  } as CategoryMessages,

  GRADE_1: {
    career: '커리어 흐름이 살아 있는 날입니다. 합의와 확인을 끼워 넣으면 성과가 안정됩니다.',
    wealth: '재정 흐름은 우호적이지만 검토를 병행할수록 결과가 좋아집니다.',
    love: '관계 흐름이 부드럽습니다. 대화 한 건을 제대로 마무리하는 데 유리합니다.',
    health: '활동성은 좋은 편입니다. 새 루틴은 가볍게 시작하고 과열만 피하세요.',
    travel: '이동은 무난하게 풀릴 가능성이 높습니다. 즉흥성보다 준비된 이동이 더 낫습니다.',
    study: '학습과 정리에 유리한 날입니다. 복습과 마감 정리를 함께 가져가세요.',
    general: '활용 우선 구간입니다. 기회를 잡되 검증 단계를 빼지 않는 편이 맞습니다.',
  } as CategoryMessages,

  GRADE_2_HIGH: {
    career: '실무형 운영에 적합한 날입니다. 새 확장보다 현재 과제를 정리하는 편이 낫습니다.',
    wealth: '돈 흐름은 무난합니다. 큰 베팅보다 관리와 비교 검토가 잘 맞습니다.',
    love: '관계는 잔잔한 흐름입니다. 기대치를 맞추고 오해를 줄이는 대화가 좋습니다.',
    health: '컨디션은 보통입니다. 강도보다 회복 리듬을 챙기면 안정적입니다.',
    travel: '짧은 이동과 일정 조정은 괜찮습니다. 변수 확인을 먼저 해두세요.',
    study: '꾸준함이 이기는 날입니다. 익숙한 루틴을 유지하는 편이 효율적입니다.',
    general: '운영 우선 구간입니다. 흐름은 무난하지만 속도보다 정리가 더 중요합니다.',
  } as CategoryMessages,

  GRADE_2_LOW:
    '운영 우선 구간입니다. 큰 확대보다 체크리스트 기반으로 정리하는 편이 좋습니다.',

  GRADE_3: {
    career: '검토 우선 구간입니다. 결정은 분할하고 전달 내용은 한 번 더 확인하세요.',
    wealth: '금전 판단은 보수적으로 가는 편이 맞습니다. 조건 검토 전 집행은 피하세요.',
    love: '관계는 예민할 수 있습니다. 반응보다 확인이 먼저입니다.',
    health: '회복 신호를 우선 봐야 합니다. 무리한 일정은 줄이는 편이 낫습니다.',
    travel: '이동 변수 점검이 필요한 날입니다. 시간과 동선을 여유 있게 잡으세요.',
    study: '집중이 흔들릴 수 있습니다. 길게 버티기보다 짧게 끊어 가세요.',
    general: '검토 우선 구간입니다. 속도보다 재확인과 리스크 관리가 중요합니다.',
  } as CategoryMessages,

  GRADE_4: {
    career: '조정 우선 구간입니다. 비가역 결정은 늦추고 조건 점검부터 하세요.',
    wealth: '재정은 지키는 운영이 맞는 날입니다. 큰 집행보다 비교와 확인을 먼저 하세요.',
    love: '감정적으로 확정하기보다 거리를 조절하고 표현을 한 번 더 확인하세요.',
    health: '회복을 먼저 챙겨야 하는 날입니다. 무리한 강행보다 리듬 조정이 낫습니다.',
    travel: '이동은 여유 있게 보는 편이 안전합니다. 변수와 일정부터 다시 확인하세요.',
    study: '성과 압박보다 리듬 회복이 먼저입니다. 분량을 줄여도 흐름을 유지하는 편이 좋습니다.',
    general: '조정 우선 구간입니다. 새로 벌이기보다 정리하고 점검하면서 가는 편이 맞습니다.',
  } as CategoryMessages,

  GRADE_5: {
    career: '강한 조정 구간입니다. 공식 확정과 큰 결정은 다른 날로 넘기는 편이 낫습니다.',
    wealth: '손실 관리가 최우선입니다. 투자, 계약, 큰 지출은 보류하는 편이 안전합니다.',
    love: '관계를 단정하기보다 감정 안정과 오해 방지가 먼저입니다.',
    health: '강행보다 휴식과 회복이 우선입니다. 경고 신호는 바로 반영하세요.',
    travel: '이동은 꼭 필요한 범위로 줄이고, 변수 대응을 먼저 준비하세요.',
    study: '무리한 목표보다 최소 루틴 유지가 더 중요합니다.',
    general: '강한 조정 구간입니다. 확정보다 보류, 확장보다 정비가 맞는 날입니다.',
  } as CategoryMessages,
} as const

export const EN_MESSAGES = {
  GRADE_0: {
    career: 'Execution window for contracts and role moves. Keep one final verification step.',
    wealth: 'Financial initiative is strong. Set criteria first, then act.',
    love: 'Relationship momentum supports progress. Keep key messages short and clear.',
    health: 'Energy is up. Favor rhythm-based action over overexertion.',
    travel: 'Movement and change are supported. Lock timing and conditions first.',
    study: 'Focus and absorption are strong. Finish one or two core items.',
    general: 'Execute-first window. Pull forward one or two priorities.',
  } as CategoryMessages,

  GRADE_1: {
    career: 'Career flow is supportive. Add checkpoints and alignment steps.',
    wealth: 'Finance is workable, but review improves outcomes.',
    love: 'Relationship flow is smoother. Good for one clear conversation.',
    health: 'Activity is supported. Start light and avoid overheating.',
    travel: 'Movement is workable. Prepared movement beats impulsive movement.',
    study: 'Good for study and cleanup. Pair review with completion.',
    general: 'Leverage-first window. Use momentum, but keep verification in place.',
  } as CategoryMessages,

  GRADE_2_HIGH: {
    career: 'A practical operating day. Prioritize completion over expansion.',
    wealth: 'Finance is neutral. Management beats risk-taking.',
    love: 'Relationship flow is steady. Align expectations first.',
    health: 'Condition is moderate. Recovery rhythm matters more than intensity.',
    travel: 'Short movement is workable. Check variables first.',
    study: 'Consistency wins today. Stay with the routine.',
    general: 'Operate-first window. Stable flow, but structure matters more than speed.',
  } as CategoryMessages,

  GRADE_2_LOW: 'Operate-first window. Use checklists and avoid over-expansion.',

  GRADE_3: {
    career: 'Review-first window. Split decisions and recheck communication.',
    wealth: 'Take a conservative financial stance. Review terms before acting.',
    love: 'Relationship flow is sensitive. Confirmation beats reaction.',
    health: 'Recovery signals matter. Reduce overload.',
    travel: 'Movement needs review. Keep time and route margins.',
    study: 'Focus may wobble. Work in shorter blocks.',
    general: 'Review-first window. Verification matters more than speed.',
  } as CategoryMessages,

  GRADE_4: {
    career: 'Adjust-first window. Delay irreversible decisions and re-check terms first.',
    wealth: 'Capital preservation matters more than expansion. Large commitments should wait.',
    love: 'Avoid emotional finality. Slow the pace and verify wording.',
    health: 'Recovery comes first. Adjust the schedule instead of forcing it.',
    travel: 'Keep movement conservative and leave room for change.',
    study: 'Reduce pressure and keep only the minimum viable routine.',
    general: 'Adjust-first window. Reduce scope, stabilize, and move carefully.',
  } as CategoryMessages,

  GRADE_5: {
    career: 'Strong adjust-first window. Move formal commitments to another window.',
    wealth: 'Loss prevention is primary. Hold off on large financial action.',
    love: 'Stabilize emotions before making relational calls.',
    health: 'Rest and recovery take priority over effort.',
    travel: 'Reduce movement to essential cases and prepare contingencies.',
    study: 'Minimum routine matters more than ambitious output.',
    general: 'Strong adjust-first window. Stabilize before you expand.',
  } as CategoryMessages,
} as const
