import type { IcpQuestion, IcpLikertValue } from './types'

export const ICP_TEST_VERSION = 'icp_v2' as const

export const ICP_LIKERT_OPTIONS: Array<{
  id: string
  value: IcpLikertValue
  text: string
  textKo: string
}> = [
  { id: '1', value: 1, text: 'Strongly disagree', textKo: '전혀 아니다' },
  { id: '2', value: 2, text: 'Disagree', textKo: '아니다' },
  { id: '3', value: 3, text: 'Neutral', textKo: '보통이다' },
  { id: '4', value: 4, text: 'Agree', textKo: '그렇다' },
  { id: '5', value: 5, text: 'Strongly agree', textKo: '매우 그렇다' },
]

export const ICP_V2_QUESTIONS: IcpQuestion[] = [
  {
    id: 'ag_01',
    axis: 'agency',
    text: 'I usually suggest a direction first when a decision is needed.',
    textKo: '중요한 결정을 해야 할 때, 나는 먼저 기준을 세우고 방향을 제안한다.',
  },
  {
    id: 'ag_02',
    axis: 'agency',
    text: 'I can state my opinion clearly even during disagreement.',
    textKo: '의견 충돌이 생겨도 내 생각을 분명하게 말하는 편이다.',
  },
  {
    id: 'ag_03',
    axis: 'agency',
    text: 'If roles are unclear, I step in and structure the work.',
    textKo: '협업에서 역할이 모호하면, 내가 먼저 정리해서 제안한다.',
  },
  {
    id: 'ag_04',
    axis: 'agency',
    reverse: true,
    text: 'I often hold back my opinion to avoid discomfort.',
    textKo: '분위기가 불편해질까 봐, 하고 싶은 말을 접는 경우가 많다.',
  },
  {
    id: 'ag_05',
    axis: 'agency',
    text: 'When plans break, I quickly reset priorities.',
    textKo: '예상 밖 상황이 생기면 누가 시키기 전에 우선순위를 다시 잡는다.',
  },

  {
    id: 'wa_01',
    axis: 'warmth',
    text: 'I check in first when someone close is having a hard day.',
    textKo: '가까운 사람이 힘들다고 하면 먼저 안부를 묻고 돕는다.',
  },
  {
    id: 'wa_02',
    axis: 'warmth',
    text: 'I can keep a courteous conversation with new people.',
    textKo: '처음 만난 사람과도 예의 있게 대화를 이어가는 편이다.',
  },
  {
    id: 'wa_03',
    axis: 'warmth',
    text: 'Even in conflict, I try to understand the other side.',
    textKo: '갈등 상황에서도 상대의 입장을 한 번은 이해해보려 한다.',
  },
  {
    id: 'wa_04',
    axis: 'warmth',
    reverse: true,
    text: 'I avoid necessary feedback if it may hurt the relationship.',
    textKo: '관계가 불편해질까 봐, 필요한 피드백도 피하는 편이다.',
  },
  {
    id: 'wa_05',
    axis: 'warmth',
    text: 'I express gratitude or apology directly in words.',
    textKo: '고마움이나 미안함 같은 감정을 말로 표현하는 편이다.',
  },

  {
    id: 'bo_01',
    axis: 'boundary',
    text: 'I clearly communicate what I can and cannot do.',
    textKo: '부탁을 받았을 때, 가능한 범위와 어려운 범위를 분명히 말한다.',
  },
  {
    id: 'bo_02',
    axis: 'boundary',
    text: 'I keep personal limits around time and energy.',
    textKo: '나는 내 시간/에너지를 지키기 위해 기준을 세워두는 편이다.',
  },
  {
    id: 'bo_03',
    axis: 'boundary',
    text: 'I can say no politely even to close people.',
    textKo: '가까운 사이라도 불편한 요청에는 정중히 거절할 수 있다.',
  },
  {
    id: 'bo_04',
    axis: 'boundary',
    reverse: true,
    text: 'It is hard to refuse requests, so my schedule often collapses.',
    textKo: '거절이 어려워서 내 일정이 자주 무너진다.',
  },
  {
    id: 'bo_05',
    axis: 'boundary',
    text: 'I keep my standards while allowing situational flexibility.',
    textKo: '내 기준을 지키되, 상황에 맞게 조정할 여지도 둔다.',
  },

  {
    id: 're_01',
    axis: 'resilience',
    text: 'I recover relatively quickly after mistakes or conflict.',
    textKo: '실수나 갈등이 생겨도 비교적 빨리 마음을 정리한다.',
  },
  {
    id: 're_02',
    axis: 'resilience',
    text: 'When criticized, I can extract useful points after emotional impact.',
    textKo: '비판을 받으면 감정적으로 흔들려도 핵심 내용을 추려본다.',
  },
  {
    id: 're_03',
    axis: 'resilience',
    text: 'If things go wrong, I shift to the next action quickly.',
    textKo: '예상이 틀려도 다음 행동으로 빨리 전환하는 편이다.',
  },
  {
    id: 're_04',
    axis: 'resilience',
    reverse: true,
    text: 'Relationship stress tends to linger for a long time.',
    textKo: '관계 스트레스가 생기면 오래 끌고 가는 편이다.',
  },
  {
    id: 're_05',
    axis: 'resilience',
    text: 'I have routines that help me recover in difficult periods.',
    textKo: '어려운 시기에도 나를 회복시키는 루틴이 있다.',
  },
]
