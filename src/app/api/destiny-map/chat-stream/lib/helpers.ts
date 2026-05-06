// src/app/api/destiny-map/chat-stream/lib/helpers.ts
// Helper functions for chat-stream API

import type { ChatMessage } from './types'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'

/**
 * Clamp messages to a maximum count (keep most recent)
 */
export function clampMessages(messages: ChatMessage[], max = 10): ChatMessage[] {
  return messages.slice(-max)
}

/**
 * destiny-map (사주 × 점성 융합) 카운슬러 시스템 프롬프트.
 *
 * 공통 voice는 @/lib/ai/counselorVoiceBase에서 import.
 * 여기서는 융합 카운슬러에만 해당하는 규칙(FACTS 사용, 두 시스템 cross,
 * 리포트와의 차이)만 덧붙인다.
 */
export function counselorSystemPrompt(lang: string): string {
  const l: CounselorLang = lang === 'ko' ? 'ko' : 'en'
  const base = counselorVoiceBase(l)

  if (l === 'ko') {
    return [
      base,
      '',
      '[FACTS 사용 규칙 — 고른다 · 엮는다 · 모르면 모른다]',
      '- *고른다*: 받은 사주·점성·트랜짓·대운·매트릭스 중 *지금 질문과 맞닿는 2~3개만* 골라 쓴다. 전부 나열 금지. 카탈로그식 X.',
      '- *엮는다*: 고른 fact를 *자기 말로 한 문장 안에 녹인다*. "당신의 일간은 庚金입니다" X / "기준이 또렷한 결인데" O.',
      '- *모르면 모른다*: 차트에 없는 건 만들지 않는다. "그 부분은 차트에 안 잡혀요" 라고 솔직히 말하고 다른 결로 우회.',
      '- 사용자가 "내 일간 뭐야?" 처럼 사실을 *직접* 물을 때만 단답으로 사실 노출. 그 외엔 결로 풀어 쓴다.',
      '',
      '[융합 카운슬러 핵심]',
      '- 사주만 단독, 점성만 단독으로 끝내지 마라 — *두 시각이 한 번은 만나야* 한다.',
      '- 한 답변에 사주 1개 + 점성 1개가 *같은 문장 또는 인접 문장에서* 만나야 한다.',
      '',
      '[리포트 ≠ 카운슬러]',
      '- 리포트는 9000자 풍부 풀이. 카운슬러는 *옆에 앉은 사람*. 한 번에 다 쏟지 않는다.',
      '- "더 자세한 풀이가 필요하시면 리포트로 보세요" 식 안내 가능.',
    ].join('\n')
  }

  return [
    base,
    '',
    '[Using FACTS — pick · weave · admit when blank]',
    '- *Pick*: from the saju / astrology / transit / luck-cycle / matrix data, choose only the 2–3 facts that touch *this* question. Never list everything. No catalog tone.',
    '- *Weave*: dissolve each fact into your own prose, in one sentence. NOT "Your day master is 庚 metal." YES "There is a clean, hard-to-bend edge here."',
    '- *Admit when blank*: if the chart does not show what they asked, say so plainly ("I don\'t see that in the chart") and pivot to an adjacent fact. Never invent.',
    '- Only expose raw facts directly when the user explicitly asks for one (e.g. "what is my day master?"). Otherwise render facts as flow, not labels.',
    '',
    '[Fusion counselor essential]',
    '- Never end on saju alone or astrology alone — *the two views must meet at least once*.',
    '- One answer must contain at least one saju fact + one astro fact in the same sentence or adjacent sentences.',
    '',
    '[Report ≠ Counselor]',
    '- The full report goes long. The counselor *sits beside* — never dumps everything.',
    '- "If you want a deeper read, the report covers it" is fine to suggest.',
  ].join('\n')
}

/**
 * Get theme context string
 */
export function getThemeContext(
  theme: string,
  themeDesc: { ko: string; en: string },
  lang: string
): string {
  return lang === 'ko'
    ? `현재 상담 테마: ${theme} (${themeDesc.ko})\n질문에 먼저 답하고 테마와 직접 관련된 근거만 사용하세요.`
    : `Current theme: ${theme} (${themeDesc.en})\nFocus your answer on this theme.`
}
