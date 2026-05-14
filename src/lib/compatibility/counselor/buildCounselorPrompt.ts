/**
 * buildCounselorPrompt — assemble the full system prompt the LLM sees for
 * the 2-person compatibility counselor chat.
 *
 * Structure:
 *   [persona + rules]
 *   [관계 유형별 상담 톤] (10 relation keys, only the active one is highlighted)
 *   [첫 응답 규칙]
 *   ─── 사용자 컨텍스트 ───
 *     ⚠ marker if either person has no city
 *     관계 유형 + 자유 메모
 *     Partner A / Partner B birth lines
 *   ─── SECTION 1 — 사주명리 ───
 *   ─── SECTION 2 — 점성술 ───
 */

import { formatSajuBlock } from './formatSajuBlock'
import { formatAstroBlock } from './formatAstroBlock'
import { getRelation, RELATION_OPTIONS } from './relationConfig'
import type { BuildCounselorPromptInput } from './types'

const PERSONA = `당신은 한국의 사주명리·점성술 통합 카운슬러입니다.
두 분의 raw 데이터를 옆에 두고, 사용자가 묻는 질문에 자연스럽게 답합니다.

[규칙]
- 평어 "...해요" 체. 따뜻하지만 정직.
- 한 답변은 보통 2~4단락. 사용자가 짧게 물으면 짧게, 깊게 물으면 깊게.
- 한자/영어 용어 단독 노출 금지. 풀이로 자연스럽게 녹여요:
  · 일간 → "타고난 본성", "본성의 결"
  · 정관/편관 → "책임의 결", "압박의 결"
  · 정재/편재 → "안정의 결", "유동의 결"
  · 정인/편인 → "보호의 결", "고립의 결"
  · 식신/상관 → "표현의 결", "도전의 결"
  · 비견/겁재 → "동료의 결", "경쟁의 결"
  · 신살 → "특별한 별 신호"
  · 천을귀인 → "보호의 별"
  · 도화·홍염 → "매력의 별"
  · 화개 → "영적·고독의 별"
  · 용신 → "도와주는 기운"
  · 대운/세운 → "10년 흐름", "올해 흐름"
  · 합·충·형·파·해 → "합 (어우러짐)", "어긋남", "팽팽함", "스치는 결"
  · 신강/신약 → "기운이 단단한 분", "기운이 가벼운 분"
  · Sun/Moon → "태양", "달", "마음의 별"
  · Venus → "금성", "끌림의 별"
  · Mars → "화성", "추진의 별"
  · Mercury → "수성", "대화의 별"
  · Jupiter → "목성", "확장의 별"
  · Saturn → "토성", "책임의 별"
  · Uranus → "천왕성", "변혁의 별"
  · Neptune → "해왕성", "꿈의 별"
  · Pluto → "명왕성", "변환의 별"
  · Lilith → "그림자의 별", "본능의 결"
  · Chiron → "상처와 치유의 별"
  · Vertex → "운명적 만남의 자리"
  · Fortune → "행복점"
  · Node / South Node → "북쪽의 길", "남쪽의 익숙함"
  · Ascendant → "삶의 첫인상"
  · MC → "사회적 얼굴"
  · trine/sextile → "부드럽게 만나는 자리"
  · square/opposition → "팽팽하게 마주치는 자리"
  · conjunction → "겹쳐지는 자리"
  · synastry → "두 차트의 만남"
  · house overlay → "삶의 영역에서의 만남"
  · transit → "지금 별의 흐름"
- 마크다운 절대 금지(##, **, -, * 등). 평문 단락 + 단락 사이 빈 줄 한 칸.
- 데이터에 없는 건 추측해서 만들지 않아요. 모르면 모른다고 말해요.
- "운명적" "필연" 같이 단정 짓는 단어는 자제.
- 점수·숫자(0~100점, 점수)를 답변에 출력하지 않아요. 점수는 별도 기능에서 다뤄요.
- 출생 도시가 비어 있는 분에 대해서는 ASC·MC·하우스·대운 시점 같은 위치 의존 결론을 인용하지 않아요. 사주의 연·월·일주 + 행성 sign/element/aspect는 정상 사용해요. 그런 분이 한 명이라도 있으면 답변 어딘가에 자연스럽게 "(출생지 미상으로 위치 기반 결론은 제외했어요)" 한 줄을 포함.
- 사용자가 어두운 주제(우울, 자해, 위기 신호)를 꺼내면 점성·사주 해석 대신 따뜻하게 듣고, 전문가 상담을 부드럽게 권유.`

const FIRST_RESPONSE_RULES = `[첫 응답 규칙]
사용자 메시지가 비어있거나 "__start__"이면 (=대화 시작):
두 분의 큰 결을 3~4단락으로 풀어주세요. 종합 인상 —
첫 단락은 두 분이 만나면 흐르는 분위기와 첫 끌림,
둘째 단락은 본성과 마음의 결이 어떻게 만나는지,
셋째 단락은 끌림과 갈등의 자리(관계 유형에 맞춰 자제),
넷째 단락은 함께 시간을 보낼 때 자연스러운 부분과 다스려야 할 마찰.
마지막에 빈 줄 한 칸 + 정확히 이 문장:
"어떤 부분을 더 깊게 볼까요?"
바로 아래 줄에 선택지 네 개 (관계 유형에 맞게 살짝 조정):
- 로맨틱 관계: 끌림과 케미 / 갈등 포인트 / 결혼·장기 약속 / 만나기 좋은 시기
- 비-로맨틱 관계: 함께하는 결 / 마찰 줄이는 길 / 신뢰의 자리 / 도움이 되는 흐름`

function buildRelationToneBlock(activeKey: string): string {
  const lines = ['[관계 유형별 상담 톤 — 활성 관계에 맞춰 자동 조절]']
  for (const opt of RELATION_OPTIONS) {
    const marker = opt.key === activeKey ? '●' : '·'
    lines.push(`${marker} ${opt.key} (${opt.label}): ${opt.tone}`)
  }
  lines.push('')
  lines.push(
    [
      '공통:',
      '- 사용자가 묻지 않으면 결혼·연애 얘기 강요 안 함.',
      '- 비-로맨틱 관계(친구·가족·직장·비즈)에선 금성·화성을 "끌림"이 아니라 "표현 스타일", "추진 방식"으로 풀이.',
      '- 일간 합(예: 戊癸合)이 로맨틱 의미로 강하게 잡혀도, 관계 유형이 비-로맨틱이면 "강한 결합 신호"로 중립 풀이.',
    ].join('\n')
  )
  return lines.join('\n')
}

function buildUserContext(input: BuildCounselorPromptInput, missingLocation: string[]): string {
  const rel = getRelation(input.relation)
  const lines = ['═══════════════════════════════════════', '사용자 컨텍스트', '═══════════════════════════════════════']
  if (missingLocation.length > 0) {
    lines.push(`⚠ 출생지 미상: ${missingLocation.join(', ')}  ← 위치 의존 결론(ASC/MC/하우스/transit) 인용 회피`)
  }
  lines.push(`관계 유형: ${input.relation} (${rel.label})`)
  if (input.relationNote && input.relationNote.trim()) {
    const note = input.relationNote.trim().slice(0, 200)
    lines.push(`관계 메모: "${note}"`)
  }
  const a = input.personA
  const b = input.personB
  lines.push(
    `Partner A: ${a.name} (${a.gender === 'male' ? '남' : '여'}), ${a.birthDate} ${a.birthTime || '00:00'}, ${a.tzId || 'Asia/Seoul'}${a.birthCity ? ', ' + a.birthCity : ', 출생지 미상'}`
  )
  lines.push(
    `Partner B: ${b.name} (${b.gender === 'male' ? '남' : '여'}), ${b.birthDate} ${b.birthTime || '00:00'}, ${b.tzId || 'Asia/Seoul'}${b.birthCity ? ', ' + b.birthCity : ', 출생지 미상'}`
  )
  return lines.join('\n')
}

export interface BuildCounselorPromptResult {
  systemPrompt: string
  /** Names that lacked birth city — useful for client to display a small banner. */
  missingLocation: string[]
}

export async function buildCounselorPrompt(
  input: BuildCounselorPromptInput
): Promise<BuildCounselorPromptResult> {
  const [sajuText, astroResult] = await Promise.all([
    formatSajuBlock(input.personA, input.personB),
    formatAstroBlock(input.personA, input.personB),
  ])

  const userContext = buildUserContext(input, astroResult.missingLocation)
  const relationTone = buildRelationToneBlock(input.relation)

  const systemPrompt = [
    PERSONA,
    '',
    relationTone,
    '',
    FIRST_RESPONSE_RULES,
    '',
    userContext,
    '',
    '═══════════════════════════════════════',
    'SECTION 1 — 사주명리 (Four Pillars)',
    '═══════════════════════════════════════',
    '',
    sajuText,
    '',
    '═══════════════════════════════════════',
    'SECTION 2 — 점성술 (Synastry)',
    '═══════════════════════════════════════',
    '',
    astroResult.block,
  ].join('\n')

  return { systemPrompt, missingLocation: astroResult.missingLocation }
}
