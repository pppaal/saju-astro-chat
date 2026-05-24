'use client'

import { useState } from 'react'
import { BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { ImportantDate } from './types'
import { getGrade, type GradeThresholds, type GradeKey } from './scoreGrade'

type Interpretation = NonNullable<ImportantDate['monthlyInterpretation']>

interface Props {
  interp: Interpretation | undefined
  /** "올해 큰 날" — 메인 응답이 아니라 별도 지연 로드(/api/calendar/convergence)로
   *  채워진다. 없으면 interp.yearlyConvergence(레거시)로 폴백. */
  yearlyConvergence?: Interpretation['yearlyConvergence']
  /** 이번 달 종합 점수(부모가 monthDates 평균으로 계산) — 결론 밴드에 사용. */
  monthScore: number
  /** 사용자 분포 기반 등급 임계값 — 점수 → 밴드 매핑. */
  gradeThresholds: GradeThresholds
  /** 엔진 한 줄 요약 — "왜?" 줄에 사용. */
  summaryText?: string | null
  /** 그 달 식별값(연*12+월) — 조언 문장을 달마다 다르게 회전시키는 seed. */
  seed?: number
}

/**
 * 월간 해석 — "결론 우선" 카드.
 *
 * 사용자 피드백("내용은 좋은데 결론이 안 잡힘"): 맨 위에 한 줄 결론 + 점수 밴드 +
 * 지금 할 일 + 왜(한 줄)만 보이고, 키이벤트·큰 날·근거 등 상세는 [자세히 보기]로
 * 접는다. 결론 → 이유 → 상세 순으로 줌인.
 */
export default function MonthlyInterpretationCard({
  interp,
  yearlyConvergence,
  monthScore,
  gradeThresholds,
  summaryText,
  seed = 0,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const grade = getGrade(monthScore, gradeThresholds)
  const verdict = VERDICT[grade.key]
  const top = topTheme(interp)
  // "이번 달 조언" — 모든 생활 영역(테마 순위대로)을 각각 현실 조언 한 줄씩.
  // 문장은 seed(그 달)로 회전 → 같은 테마라도 달마다 다른 조언.
  const adviceThemes: Array<'love' | 'money' | 'career' | 'health' | 'growth'> =
    interp?.themeRanking && interp.themeRanking.length > 0
      ? interp.themeRanking.map((t) => t.theme)
      : top
        ? [top.theme]
        : []
  const adviceList = adviceThemes
    .map((theme) => ({ theme, text: themeAdvice(interp, theme, seed, 2) ?? THEME_ACTION[theme] }))
    .filter((a): a is { theme: (typeof adviceThemes)[number]; text: string } => Boolean(a.text))
  const ke = interp?.keyEvents
  const hasTiming = !!(ke && (ke.best || ke.window || (ke.avoid && ke.avoid.dates.length > 0)))
  // "왜?"는 한 줄로 — 가장 강한 테마에서 깔끔하게 생성. 엔진 monthSummary는
  // 길고 노이즈(영문 누수 등)가 섞여 hero엔 부적합 → firstSentence 폴백으로만.
  const whyLine =
    whyFromThemes(interp) ||
    (summaryText && summaryText.trim() ? firstSentence(stripMarkdown(summaryText)) : null)

  const hasDetail = !!interp && interp.sections.length > 0
  const headlines = hasDetail
    ? interp!.sections
        .slice(0, 2)
        .map((s) => firstSentence(stripMarkdown(s.text)))
        .filter((line): line is string => Boolean(line && line.length > 8))
        .slice(0, 3)
    : []

  return (
    <div
      className={`rounded-2xl border shadow-xl p-5 space-y-4 ${grade.bgClass} ${grade.borderClass}`}
    >
      {/* ── 결론 (hero) ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
            이번 달 결론
          </div>
          <h3 className="text-xl font-black text-zinc-50 leading-tight">{verdict}</h3>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold ${grade.colorClass}`}>{grade.label}</div>
          <div className="text-2xl font-black text-zinc-100 leading-none mt-0.5">{monthScore}</div>
          <div className="text-[10px] text-zinc-500">100점 만점</div>
        </div>
      </div>

      {/* ── 이번 달 조언 (강한 테마 여러 개 × 현실 조언 + 구체 타이밍) ── */}
      {(adviceList.length > 0 || hasTiming) && (
        <div className="bg-black/20 rounded-xl px-4 py-3 space-y-2.5">
          {adviceList.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-indigo-300 tracking-wide">
                이번 달 조언
              </div>
              <ul className="space-y-1.5">
                {adviceList.map((a) => (
                  <li key={a.theme} className="text-sm leading-relaxed">
                    <span className="font-bold text-indigo-200 mr-1">
                      <span aria-hidden className="mr-0.5">
                        {THEME_ICON[a.theme]}
                      </span>
                      {THEME_LABEL[a.theme] ?? a.theme}
                    </span>
                    <span className="text-zinc-500 mr-1">·</span>
                    <span className="text-zinc-100">{a.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasTiming && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] border-t border-white/5 pt-2">
              {ke!.best && (
                <span className="text-emerald-300 font-semibold">
                  <span aria-hidden>🎯</span> 추진 {fmtMd(ke!.best.date)}
                </span>
              )}
              {ke!.window && (
                <span className="text-indigo-300 font-semibold">
                  <span aria-hidden>💫</span> 강한 구간 {fmtMd(ke!.window.start)}~
                  {fmtMd(ke!.window.end)}
                </span>
              )}
              {ke!.avoid && ke!.avoid.dates.length > 0 && (
                <span className="text-rose-300 font-semibold">
                  <span aria-hidden>⚠️</span> 보류 {ke!.avoid.dates.map(fmtMd).join('·')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 왜? (한 줄) ── */}
      {whyLine && (
        <p className="text-sm text-zinc-300 leading-relaxed flex gap-2">
          <span className="text-zinc-500 font-bold shrink-0">왜?</span>
          <span>{whyLine}</span>
        </p>
      )}

      {/* ── 상세 (접힘) ── */}
      {hasDetail && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-black/20 hover:bg-black/30 border border-white/5 text-zinc-300 text-sm font-semibold transition"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                자세히 보기
              </>
            )}
          </button>

          {expanded && (
            <div className="space-y-4 pt-1">
              {/* 이번 달 요약 — 엔진 monthSummary (길어서 상세에만) */}
              {summaryText && summaryText.trim() && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="text-xs font-bold text-indigo-300 mb-2 tracking-wider uppercase">
                    이번 달 요약
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {summaryText}
                  </p>
                </div>
              )}

              {/* 핵심 포인트 */}
              {headlines.length > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-1.5 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    핵심 포인트
                  </div>
                  <ul className="space-y-1.5">
                    {headlines.map((line, i) => (
                      <li key={i} className="text-sm text-zinc-200 leading-relaxed flex gap-2">
                        <span className="text-indigo-400 shrink-0">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 키 이벤트 3 — 베스트 날 / 강한 구간 / 피할 날 */}
              <KeyEventsBlock keyEvents={interp!.keyEvents} />

              {/* 큰 시점 — 이번 달 → 올해 → 인생 */}
              <ConvergenceBlock convergence={interp!.convergence} icon="🔮" title="이번 달 큰 날" />
              <ConvergenceBlock
                convergence={yearlyConvergence ?? interp!.yearlyConvergence}
                icon="🗓️"
                title="올해 큰 날"
                upcomingOnly
              />
              <LifePivotsBlock lifetimePivots={interp!.lifetimePivots} />

              {/* 지난달 대비 — 변화 체감 */}
              <MonthComparisonBlock comparison={interp!.monthComparison} />

              {/* 상세 해석 본문 */}
              <div className="flex items-center gap-2 text-zinc-400 border-t border-white/5 pt-3">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider uppercase">상세 해석</span>
              </div>
              {interp!.sections.map((s) => (
                <div key={s.section} className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="text-xs font-bold text-indigo-300 mb-2 tracking-wider uppercase">
                    {s.title}
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {renderMarkdownBold(s.text)}
                  </p>
                </div>
              ))}

              {/* Why-card — 테마별 점수 인과 추적 */}
              <WhyCard interp={interp!} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** 이번 달 가장 강한 테마 — themeRanking 우선, 없으면 themeScores 최대값. */
function topTheme(
  interp: Interpretation | undefined
): { theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number } | null {
  if (!interp) return null
  if (interp.themeRanking && interp.themeRanking.length > 0) {
    const t = interp.themeRanking[0]
    return { theme: t.theme, score: t.score }
  }
  const ts = interp.themeScores
  if (!ts) return null
  let best: { theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number } | null =
    null
  for (const [k, v] of Object.entries(ts)) {
    if (typeof v === 'number' && (!best || v > best.score)) {
      best = { theme: k as 'love' | 'money' | 'career' | 'health' | 'growth', score: v }
    }
  }
  return best
}

/** 테마 → 엔진 도메인 섹션 id 매핑. */
const THEME_TO_SECTION: Record<'love' | 'money' | 'career' | 'health' | 'growth', string> = {
  money: 'domain-money',
  career: 'domain-work',
  love: 'domain-relations',
  health: 'domain-body',
  growth: 'domain-growth',
}

// 점성·명리 전문용어 — 일반인이 못 알아듣는 표현(감점).
const JARGON_RE =
  /(별이|별과|별이 켜|발동|기운|흐름|운이|운의|정점|챕터|오행|용신|희신|신살|사주|점성|극양|태양형|도화|홍염|ZR|Zodiacal|Jupiter|Saturn|Mars|행성|영성|전생|공전|공망)/
// 현실 행동·명사 — 바로 실천 가능한 표현(가점).
const REAL_RE =
  /(공부|자격증|학습|글쓰기|읽기|정리|계약|서류|약속|발표|회의|검진|운동|휴식|수면|저축|투자|자산|돈|지출|표현|대화|소통|연락|만남|모임|소개|결정|시작|미루|가족|관리|식습관|보온|물)/g
// 명령·조언 어미(가점).
const IMP_RE =
  /(하세요|해주세요|마세요|권장|챙[기겨]|골라서|좋아요|돼요|줄어요|풀면|편이 좋|잡으세요|따라와요|손에 잡)/

/** 한 문장의 "현실성" 점수 — 높을수록 쉽고 실천적. */
function practicalityScore(s: string): number {
  let v = 0
  v += (s.match(REAL_RE)?.length ?? 0) * 2
  if (IMP_RE.test(s)) v += 2
  if (JARGON_RE.test(s)) v -= 3
  return v
}

/**
 * 한 테마의 엔진 도메인 해석에서 *현실적·행동형* 문장만 뽑는다.
 * 점성·명리 전문용어("별이 켜져…") 문장은 감점·제외하고, 바로 실천 가능한 문장을
 * 우선 노출 ("진짜 이해하기 쉽고 현실적이게" 피드백 반영).
 * 상위 실천 문장 풀(4개)에서 seed(그 달)로 회전한 위치부터 count문장 선택 →
 * 같은 테마라도 달마다 다른 조언, 더 길게.
 */
function themeAdvice(
  interp: Interpretation | undefined,
  theme: 'love' | 'money' | 'career' | 'health' | 'growth',
  seed = 0,
  count = 2
): string | null {
  const sec = interp?.sections.find((s) => s.section === THEME_TO_SECTION[theme])
  if (!sec) return null
  let t = stripMarkdown(sec.text)
  // 이모지 제거
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️‍]/gu, '')
  // "특히 강한 날: ..." / "주의 날: ..." 꼬리 제거 (날짜는 타이밍 줄에서 따로)
  t = t.replace(/(특히 강한 날|주의 날)\s*[:：][^.]*\.?/g, '')
  // 선두 라벨 "영성·내면 — " 제거
  t = t.replace(/^\s*[^—–:.]{0,16}[—–]\s*/, '')
  // 콜론 뒤 라벨 "...: 일·커리어 — " 제거
  t = t.replace(/([:：])\s*[^—–:.]{0,12}[—–]\s*/g, '$1 ')
  t = t.replace(/\s+/g, ' ').trim()
  const sents = t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5)
  // 현실적·행동형 문장만(점수>0) 상위 4개를 풀로.
  const pool = sents
    .map((s, i) => ({ s, i, v: practicalityScore(s) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .slice(0, 4)
  if (pool.length === 0) return null
  // seed(그 달)로 회전한 시작 위치부터 count문장 — 풀을 넘으면 wrap, 중복 제거 후
  // 원문 순서로 정렬해 자연스럽게 읽히게.
  const n = Math.min(count, pool.length)
  const start = ((seed % pool.length) + pool.length) % pool.length
  const chosen: typeof pool = []
  for (let k = 0; k < n; k++) chosen.push(pool[(start + k) % pool.length])
  const uniq = [...new Map(chosen.map((c) => [c.s, c])).values()].sort((a, b) => a.i - b.i)
  return uniq.map((c) => c.s).join(' ')
}

/** "MM-DD" → "M/D" (타이밍 칩 — 짧게). */
function fmtMd(mmdd: string): string {
  const [m, d] = mmdd.split('-')
  return m && d ? `${Number(m)}/${Number(d)}` : mmdd
}

/** "왜?" 한 줄 — 가장 강한 테마 1~2개로 깔끔하게. */
function whyFromThemes(interp: Interpretation | undefined): string | null {
  const r = interp?.themeRanking
  if (r && r.length > 0) {
    const labels = r.slice(0, 2).map((t) => THEME_LABEL[t.theme] ?? t.theme)
    return `이번 달은 ${labels.join('·')} 쪽이 가장 잘 풀려요.`
  }
  const top = topTheme(interp)
  return top ? `이번 달은 ${THEME_LABEL[top.theme] ?? top.theme} 쪽이 가장 잘 풀려요.` : null
}

/** 결론 한 줄 — 점수 밴드(grade)별. 누구나 바로 이해되는 쉬운 말로. */
const VERDICT: Record<GradeKey, string> = {
  lucky: '대체로 잘 풀리는 달',
  neutral: '무난하게 흘러가는 달',
  unlucky: '무리하지 않는 게 좋은 달',
}

/** 테마별 아이콘 — 조언 목록 스캔용. */
const THEME_ICON: Record<'love' | 'money' | 'career' | 'health' | 'growth', string> = {
  money: '💰',
  career: '💼',
  love: '💗',
  health: '🩺',
  growth: '🌱',
}

/** 도메인 섹션이 없을 때 쓰는 테마별 기본 한 줄 행동(폴백). */
const THEME_ACTION: Record<'love' | 'money' | 'career' | 'health' | 'growth', string> = {
  money: '돈·계약과 관련된 일을 먼저 챙겨보세요',
  career: '커리어에서 한 걸음 내디뎌 보세요',
  love: '마음을 먼저 표현해 보세요',
  health: '몸과 휴식을 우선해 보세요',
  growth: '배움·정리에 시간을 써보세요',
}

type KeyEvents = NonNullable<Interpretation['keyEvents']>

/** "MM-DD" → "M월 D일" (앞 0 제거) */
function fmtDate(mmdd: string): string {
  const [m, d] = mmdd.split('-')
  if (!m || !d) return mmdd
  return `${Number(m)}월 ${Number(d)}일`
}

/**
 * 이번 달 키 이벤트 3 카드 — 본문에 흩어진 날짜 정보를 한눈에.
 *  🎯 베스트 날 / 💫 강한 구간 / ⚠️ 피할 날
 */
function KeyEventsBlock({ keyEvents }: { keyEvents: KeyEvents | undefined }) {
  if (!keyEvents) return null
  const { best, window, avoid } = keyEvents
  const hasAvoid = avoid && avoid.dates.length > 0
  if (!best && !window && !hasAvoid) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {best && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>🎯</span> 베스트 날
          </div>
          <div className="text-base font-bold text-zinc-100">{fmtDate(best.date)}</div>
          <div className="text-[11px] text-emerald-200/70 mt-0.5">큰 결정·시작에 좋은 날</div>
        </div>
      )}
      {window && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-indigo-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>💫</span> 강한 구간
          </div>
          <div className="text-base font-bold text-zinc-100">
            {fmtDate(window.start)}–{fmtDate(window.end)}
          </div>
          <div className="text-[11px] text-indigo-200/70 mt-0.5">집중 추진하기 좋은 구간</div>
        </div>
      )}
      {hasAvoid && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-rose-300 mb-1 flex items-center gap-1 tracking-wide">
            <span aria-hidden>⚠️</span> 피할 날
          </div>
          <div className="text-base font-bold text-zinc-100">
            {avoid.dates.map(fmtDate).join(' · ')}
          </div>
          <div className="text-[11px] text-rose-200/70 mt-0.5">무리한 결정은 미루기</div>
        </div>
      )}
    </div>
  )
}

type Convergence = NonNullable<Interpretation['convergence']>

/** "YYYY-MM-DD" → "M월 D일" */
function fmtFullDate(iso: string): string {
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${Number(m)}월 ${Number(d)}일`
}

/**
 * 큰 날(수렴) — 점성·사주의 무거운 이벤트가 같은 날 겹치는 시점.
 * keyEvents(점수 베스트/피할 날)와 달리 "왜 큰 날인지(어느 사건이 겹쳤는지)"를
 * 점성·사주로 나눠 보여줘 신뢰도를 높인다. 월간/연간 공용.
 */
function ConvergenceBlock({
  convergence,
  title = '이번 달 큰 날',
  icon = '🔮',
  upcomingOnly = false,
}: {
  convergence: Convergence | undefined
  title?: string
  icon?: string
  upcomingOnly?: boolean
}) {
  let days = convergence?.keyDays ?? []
  if (upcomingOnly) {
    const today = new Date().toISOString().slice(0, 10)
    days = days.filter((d) => d.date >= today)
  }
  if (days.length === 0) return null

  return (
    <div className="bg-zinc-950/40 border border-white/5 rounded-xl px-4 py-3">
      <div className="text-[11px] font-bold text-zinc-400 mb-2 tracking-wide flex items-center gap-1.5">
        <span aria-hidden>{icon}</span> {title}
        <span className="text-zinc-600 font-normal">· 점성·사주 겹치는 날</span>
      </div>
      <ul className="space-y-2.5">
        {days.map((d) => (
          <li key={d.date} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-100">{fmtFullDate(d.date)}</span>
              {d.bothSystems && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                  양쪽 수렴
                </span>
              )}
            </div>
            {d.astro.length > 0 && (
              <div className="text-[11px] leading-snug flex gap-1.5">
                <span className="shrink-0 font-bold text-sky-300/90">점성</span>
                <span className="text-zinc-400">{d.astro.join(' · ')}</span>
              </div>
            )}
            {d.saju.length > 0 && (
              <div className="text-[11px] leading-snug flex gap-1.5">
                <span className="shrink-0 font-bold text-amber-300/90">사주</span>
                <span className="text-zinc-400">{d.saju.join(' · ')}</span>
              </div>
            )}
            {d.meaning && (
              <div className="text-[11px] leading-snug text-indigo-300/80 italic">{d.meaning}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type LifetimePivots = NonNullable<Interpretation['lifetimePivots']>

/**
 * 인생 분기점 — 점성 라이프사이클(토성 리턴 등) × 대운 전환이 겹치는 인생 스케일
 * 큰 시기. 지난 건 접고 "지금 챕터 + 앞으로" 위주로 보여준다.
 */
function LifePivotsBlock({ lifetimePivots }: { lifetimePivots: LifetimePivots | undefined }) {
  const all = lifetimePivots?.pivots ?? []
  // 지금 챕터 + 다가오는 분기점만 (지난 건 생략), 최대 5개.
  const shown = all.filter((p) => p.phase !== 'past').slice(0, 5)
  if (shown.length === 0) return null

  return (
    <div className="bg-zinc-950/40 border border-white/5 rounded-xl px-4 py-3">
      <div className="text-[11px] font-bold text-zinc-400 mb-2 tracking-wide flex items-center gap-1.5">
        <span aria-hidden>🧭</span> 인생 분기점 — 점성 × 대운
      </div>
      <ul className="space-y-2.5">
        {shown.map((p) => (
          <li
            key={`${p.age}-${p.year}`}
            className={`flex flex-col gap-0.5 ${p.phase === 'current' ? 'pl-2 border-l-2 border-indigo-400' : ''}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-zinc-100">
                {p.age}세 <span className="text-zinc-500 font-normal">({p.year})</span>
              </span>
              {p.phase === 'current' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  지금
                </span>
              )}
              {p.bothSystems && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                  양쪽 수렴
                </span>
              )}
            </div>
            <div className="text-[11px] leading-snug text-zinc-300">
              {[p.astro, p.saju].filter(Boolean).join('  +  ')}
            </div>
            {p.meaning && <div className="text-[11px] leading-snug text-zinc-500">{p.meaning}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

type MonthComparison = NonNullable<Interpretation['monthComparison']>

/**
 * 지난달 대비 변화 — "전체 흐름 +6 · 재물 +14 · 직업 −5".
 * 이번 달만 보면 좋아진 건지 모름 → 변화를 보여줘 재방문 동기 부여.
 */
function MonthComparisonBlock({ comparison }: { comparison: MonthComparison | undefined }) {
  if (!comparison) return null
  const { overallDelta, themes } = comparison
  if (overallDelta === 0 && themes.length === 0) return null

  const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)
  const color = (dir: 'up' | 'down') => (dir === 'up' ? 'text-emerald-400' : 'text-rose-400')

  return (
    <div className="bg-zinc-950/40 border border-white/5 rounded-xl px-4 py-3">
      <div className="text-[11px] font-bold text-zinc-400 mb-2 tracking-wide">지난달 대비</div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {overallDelta !== 0 && (
          <span className="text-sm">
            <span className="text-zinc-300">전체 흐름 </span>
            <span className={`font-bold ${color(overallDelta >= 0 ? 'up' : 'down')}`}>
              {sign(overallDelta)}
            </span>
          </span>
        )}
        {themes.map((t) => (
          <span key={t.theme} className="text-sm">
            <span className="text-zinc-300">{THEME_LABEL[t.theme] ?? t.theme} </span>
            <span className={`font-bold ${color(t.dir)}`}>{sign(t.delta)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const THEME_LABEL: Record<string, string> = {
  money: '재물',
  career: '직업',
  love: '연애',
  health: '건강',
  growth: '성장',
}

function WhyCard({ interp }: { interp: Interpretation }) {
  const breakdown = interp.themeBreakdown
  const scores = interp.themeScores
  if (!breakdown) return null
  const themes = (['money', 'career', 'love', 'health', 'growth'] as const).filter(
    (k) => (breakdown[k]?.length ?? 0) > 0
  )
  if (themes.length === 0) return null
  return (
    <div className="bg-zinc-950/40 rounded-xl p-4 border border-white/5">
      <div className="text-xs font-bold text-indigo-300 mb-3 tracking-wider uppercase">
        왜 이 점수인지
      </div>
      <div className="space-y-3">
        {themes.map((k) => (
          <div key={k}>
            <div className="text-sm font-bold text-zinc-200 mb-1">
              {THEME_LABEL[k]} {typeof scores?.[k] === 'number' ? scores[k] : ''}
            </div>
            <ul className="space-y-0.5">
              {breakdown[k]!.map((c, i) => (
                <li key={i} className="text-xs flex items-baseline gap-2 leading-snug">
                  <span
                    className={`shrink-0 font-mono font-bold ${
                      c.dir === 'up' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {c.dir === 'up' ? '+' : '−'}
                    {Math.abs(c.delta)}
                  </span>
                  <span className="text-zinc-400">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

/** **text** → <strong>text</strong> 변환 (간단 inline) */
function renderMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-amber-300 font-bold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
}

function firstSentence(text: string): string {
  // 한국어: 마침표/물음표/느낌표 기준, 너무 짧으면 줄바꿈도 fallback
  const m = text.match(/^[^.?!\n]{8,}[.?!]/)
  if (m) return m[0].trim()
  const line = text.split('\n').find((l) => l.trim().length > 8)
  return line ? line.trim() : text.trim()
}
