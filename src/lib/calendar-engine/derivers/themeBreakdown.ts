import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer } from '../types'
import { THEME_SCORE_SCALE } from './themeScores'

/**
 * 테마별 "인과 추적" (Why-card 데이터).
 *
 * 점수만 노출하면 점성술 앱 100개 중 하나 — "왜 그 점수인지" 가 차별화.
 * 그 테마를 건드린 신호들을 모아 같은 이름끼리 묶고, 점수 기여도로 정렬해
 * 상위 N 개를 +/- 방향과 함께 반환한다.
 *
 * ── 점수와 부호 정합 (score↔근거 모순 방지) ──
 * themeScore 는 `50 + avg×24` 이고 avg = Σ(polarity·w) / Σ(w) (테마 가중 포함).
 * 즉 각 신호의 점수 기여분은 "그 신호의 polarity·w 가 분자(Σpol·w)에서
 * 차지하는 몫 ÷ 분모(Σw) × 24" 다. 라벨별로 이 몫을 합치면 모든 라벨 delta 의
 * 총합 = avg×24 = (score−50) 이 되어, Why-card 의 순(net)이 점수 방향과
 * *수학적으로* 일치한다.
 *
 * 예전엔 라벨별 *발생 1회 평균* polarity·w 를 delta 로 썼는데(occurrence-mean),
 * 이는 분모(Σw)와 무관해 점수 기여분이 아니었다. 게다가 상위 N 개만 노출하면
 * 점수의 양(+) 방향이 소수의 큰 음(−) 신호 + 다수의 작은 양(+) 신호 꼬리에서
 * 나올 때(예: 1987년생 8월 재물 score 56 ↔ 상위4 net −7) 표시 근거가 점수와
 * 반대로 떴다. 이제 (a) 점수 기여분 기준 정렬 + (b) 잘린 꼬리를 "그 외 다수
 * 신호" 잔차 항으로 합산해 노출 → 표시된 근거의 합이 항상 점수 방향과 일치.
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

// 잘린 꼬리(상위 N 밖) 신호들의 순기여를 합쳐 노출하는 잔차 라벨.
// 이게 있어야 표시된 delta 들의 합이 점수(score−50) 와 부호 정합한다.
const RESIDUAL_LABEL = '그 외 다수 신호'

export function deriveThemeBreakdown(
  signals: ActiveSignal[],
  topN = 4
): Partial<Record<AstroThemeKey, ThemeContribution[]>> {
  // theme → (label → Σ(polarity·w) 분자 기여) + 테마 총 가중 분모(Σw).
  //
  // themeScore = 50 + (Σpol·w / Σw)×SCALE 이므로, 한 라벨의 "점수 기여분" =
  // Σ_label(pol·w) / Σ_theme(w) × SCALE. 라벨별로 이걸 합치면 모든 delta 의
  // 총합 = (Σpol·w/Σw)×SCALE = score−50 → Why-card net 이 점수 방향과 정합.
  const byTheme = new Map<AstroThemeKey, { labels: Map<string, number>; denom: number }>()

  for (const s of signals) {
    if (!s.themes || s.themes.length === 0) continue
    const lw = LAYER_WEIGHT[s.layer] ?? 0.5
    const baseW = (s.weight ?? 0) * lw // polarity 제외한 가중 (분모용)
    if (baseW === 0) continue
    const label = naturalizeLabel((s.korean && s.korean.trim()) || s.name)
    for (const theme of s.themes) {
      if (!THEME_KEYS.includes(theme)) continue
      // themeScore 와 동일한 테마 가중 — 본령 테마엔 크게, 보조엔 작게.
      const tw = s.themeWeights?.[theme] ?? 1
      const w = baseW * tw
      if (w === 0) continue
      const bucket = byTheme.get(theme) ?? { labels: new Map<string, number>(), denom: 0 }
      // 분모(Σw)는 polarity 0 신호도 포함 — themeScore 와 동일하게.
      bucket.denom += w
      // 분자(Σpol·w)는 polarity 0 이면 기여 0 이라 라벨에 안 쌓음.
      if (s.polarity !== 0 && label) {
        bucket.labels.set(label, (bucket.labels.get(label) ?? 0) + s.polarity * w)
      }
      byTheme.set(theme, bucket)
    }
  }

  const out: Partial<Record<AstroThemeKey, ThemeContribution[]>> = {}
  for (const [theme, { labels, denom }] of byTheme) {
    if (denom === 0) continue
    // 라벨별 점수 기여분 (= score−50 으로 합산되는 단위).
    const scored = [...labels.entries()]
      .map(([label, num]) => ({ label, contrib: (num / denom) * THEME_SCORE_SCALE }))
      .sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib))

    const head = scored.slice(0, topN)
    const tail = scored.slice(topN)

    const items: ThemeContribution[] = head
      .map(({ label, contrib }) => ({
        label,
        delta: Math.round(contrib),
        dir: (contrib >= 0 ? 'up' : 'down') as 'up' | 'down',
      }))
      .filter((x) => x.delta !== 0)

    // 잘린 꼬리의 순기여 — 점수와 부호 정합을 위해 합쳐 노출.
    const residual = tail.reduce((a, c) => a + c.contrib, 0)
    const residualDelta = Math.round(residual)
    if (residualDelta !== 0) {
      items.push({
        label: RESIDUAL_LABEL,
        delta: residualDelta,
        dir: residualDelta >= 0 ? 'up' : 'down',
      })
    }

    if (items.length > 0) out[theme] = items
  }
  return out
}
