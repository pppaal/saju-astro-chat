import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer } from '../types'

/**
 * 테마별 "인과 추적" (Why-card 데이터).
 *
 * 점수만 노출하면 점성술 앱 100개 중 하나 — "왜 그 점수인지" 가 차별화.
 * 그 테마를 건드린 신호들을 모아 같은 이름끼리 묶고, 기여도(polarity ×
 * weight × layerWeight) 합으로 정렬해 상위 N 개를 +/- 방향과 함께 반환.
 *
 * 라벨은 신호의 한글 표시명(korean) 우선, 없으면 name. raw 한자 신호명도
 * tagger 가 korean 을 채워두므로 대부분 읽힘.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

export interface ThemeContribution {
  label: string
  delta: number
  dir: 'up' | 'down'
}

const THEME_KEYS: AstroThemeKey[] = ['love', 'money', 'career', 'health', 'growth']

// 라벨 자연화 — 한자 갑자/격국 잔존 정리.
const STEM_KR: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}
const BRANCH_KR: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
function naturalizeLabel(raw: string): string {
  let s = raw
  // 한자 갑자 → 한글 음 (丙午 → 병오)
  s = s.replace(/[甲乙丙丁戊己庚辛壬癸]/g, (c) => STEM_KR[c] ?? c)
  s = s.replace(/[子丑寅卯辰巳午未申酉戌亥]/g, (c) => BRANCH_KR[c] ?? c)
  // 괄호 안 한자 주석 제거 ("중화격 (中和格)" → "중화격")
  s = s.replace(/\s*\([^)]*[一-鿿][^)]*\)/g, '')
  return s.trim()
}

export function deriveThemeBreakdown(
  signals: ActiveSignal[],
  topN = 4
): Partial<Record<AstroThemeKey, ThemeContribution[]>> {
  // theme → (label → { sum 기여도, count 발생수 }) — 같은 신호가 여러 날
  // 반복되므로 합이 아니라 *평균* 으로 환산해야 점수 스케일(±수십)에 맞음.
  const byTheme = new Map<AstroThemeKey, Map<string, { sum: number; count: number }>>()

  for (const s of signals) {
    if (!s.themes || s.themes.length === 0) continue
    if (s.polarity === 0) continue
    const lw = LAYER_WEIGHT[s.layer] ?? 0.5
    const base = s.polarity * (s.weight ?? 0) * lw
    if (base === 0) continue
    const label = naturalizeLabel((s.korean && s.korean.trim()) || s.name)
    if (!label) continue
    for (const theme of s.themes) {
      if (!THEME_KEYS.includes(theme)) continue
      // themeScore 와 동일한 테마 가중 — Why-card 도 본령 테마엔 크게, 보조엔
      // 작게(목성 회귀가 일/재물/성장에 똑같이 박히던 중복 해소). 가중을 양쪽에
      // 같이 곱해야 score↔근거 부호 정합(회귀 테스트) 유지.
      const tw = s.themeWeights?.[theme] ?? 1
      const contribution = base * tw
      if (contribution === 0) continue
      const bucket = byTheme.get(theme) ?? new Map<string, { sum: number; count: number }>()
      const cur = bucket.get(label) ?? { sum: 0, count: 0 }
      cur.sum += contribution
      cur.count += 1
      bucket.set(label, cur)
      byTheme.set(theme, bucket)
    }
  }

  const out: Partial<Record<AstroThemeKey, ThemeContribution[]>> = {}
  for (const [theme, bucket] of byTheme) {
    const items: ThemeContribution[] = [...bucket.entries()]
      .map(([label, { sum, count }]) => {
        const mean = sum / count // 발생 1회 평균 기여
        return {
          label,
          // 점수 스케일 환산 (×10 — 신호 1개 평균 기여를 한 자릿수~십 점대로).
          delta: Math.round(mean * 10),
          dir: (mean >= 0 ? 'up' : 'down') as 'up' | 'down',
        }
      })
      .filter((x) => x.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, topN)
    if (items.length > 0) out[theme] = items
  }
  return out
}
