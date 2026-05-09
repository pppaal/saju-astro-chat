/**
 * Traditional deep prompt section.
 *
 * Reads the new `saju.traditionalDeep` block (johu prescription, geokguk
 * variation, irreversible action guards) that chart-calculator now
 * attaches and folds it into a markdown-style prompt block the counselor
 * LLM can quote directly.
 *
 * 핵심 가치: LLM이 "정인격이라 인성 도움 받는다" 같은 generic 한 줄에
 * 머무르지 않고, "辛 寅月 → 己·庚·壬 처방, 정인격 신강이라 식상으로 설기,
 * 현재 운에 큰 계약은 wait" 같은 정통 디테일을 그대로 인용하게 함.
 */

import type { JohuPrescription } from '@/lib/Saju/foundation/johuYongsin'
import type { GeokgukVariationResult } from '@/lib/Saju/foundation/geokguk'
import type { ActionGuard } from '@/lib/Saju/irreversibleActionGuards'
import { summarizeGuards } from '@/lib/Saju/irreversibleActionGuards'

interface TraditionalDeep {
  johu?: JohuPrescription | null
  variation?: GeokgukVariationResult
  guards?: ActionGuard[]
}

const ACTION_KO: Record<string, string> = {
  'sign-contract': '계약·서명',
  marriage: '결혼',
  relocation: '이주',
  'large-payment': '큰 송금·투자',
  'major-purchase': '큰 매수',
  'major-sale': '큰 매도',
}

const LEVEL_LABEL: Record<string, string> = {
  go: '✅ 진행',
  caution: '⚠ 신중',
  wait: '⏸ 대기',
  block: '🚫 보류',
}

export function buildTraditionalDeepSection(
  saju: unknown,
  lang: 'ko' | 'en',
): string {
  if (!saju || typeof saju !== 'object') return ''
  const td = (saju as { traditionalDeep?: TraditionalDeep }).traditionalDeep
  if (!td) return ''

  const isKo = lang === 'ko'
  const lines: string[] = []
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(
    isKo
      ? '[🪶 사주 정통 깊이 — 궁통보감 처방 + 격국 정합성 + 비가역 행동 가드]'
      : '[🪶 Saju traditional depth — 궁통보감 prescription, geokguk integrity, action guards]',
  )
  lines.push('═══════════════════════════════════════════════════════════════')

  // 궁통보감 천간 처방.
  if (td.johu) {
    lines.push('')
    lines.push(isKo ? '--- 궁통보감 천간 처방 ---' : '--- 궁통보감 stem prescription ---')
    lines.push(`  ${td.johu.prescriptionLine}`)
    if (td.johu.recommendation.colors.length > 0) {
      lines.push(
        `  추천 색: ${td.johu.recommendation.colors.join('·')}` +
          ` · 방향: ${td.johu.recommendation.direction}` +
          ` · 시간: ${td.johu.recommendation.bestHour}`,
      )
    }
    if (td.johu.recommendation.geokgukNote) {
      lines.push(`  격국·강약 가이드: ${td.johu.recommendation.geokgukNote}`)
    }
    if (td.johu.recommendation.irreversibleAction) {
      lines.push(`  비가역 행동: ${td.johu.recommendation.irreversibleAction}`)
    }
  }

  // 격국 정합성 (진종/가종/파격/합거).
  if (td.variation) {
    lines.push('')
    lines.push(isKo ? '--- 격국 정합성 ---' : '--- Geokguk integrity ---')
    lines.push(`  라벨: ${td.variation.labeledGeokguk} · 상태: ${integrityKo(td.variation.integrity)}`)
    if (td.variation.effectiveGeokguk) {
      lines.push(`  실효 격국: ${td.variation.effectiveGeokguk}`)
    }
    lines.push(`  ${td.variation.narrative}`)
  }

  // 비가역 행동 가드 매트릭스.
  if (td.guards && td.guards.length > 0) {
    lines.push('')
    lines.push(isKo ? '--- 비가역 행동 가드 ---' : '--- Irreversible action guards ---')
    for (const g of td.guards) {
      const label = ACTION_KO[g.action] || g.action
      const level = LEVEL_LABEL[g.level] || g.level
      lines.push(`  ${level} ${label} — ${g.reason}`)
      if (g.recheckAt) lines.push(`    재검토 시점: ${g.recheckAt}`)
    }
    const summary = summarizeGuards(td.guards)
    if (summary) {
      lines.push(`  요약: ${summary}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

function integrityKo(integrity: GeokgukVariationResult['integrity']): string {
  switch (integrity) {
    case 'true':
      return '진종 (정통 충실)'
    case 'false':
      return '가종 (1-2개 잔류)'
    case 'broken':
      return '파격 (정격으로 재분석)'
    case 'transformed':
      return '변격 (천간 합거)'
  }
}
