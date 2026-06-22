'use client'

// src/app/compatibility/free/page.tsx
//
// 무료 궁합 — 로그인 없이 두 사람 생년월일만 넣으면 바로 결과. 바이럴 미끼:
// 친구·연인과 함께 해보고(소셜성), 결과를 공유(/r 링크)해 다시 사람을 끌어온다.
//
// 일부러 "맛보기": 동·서 교차 verdict + 끌림/마찰 밴드 + 결정적 신호 한 줄까지.
// 깊은 관계 상담(각 영역 풀이·시기·조언)은 유료 상담사의 몫이라, 맨 아래
// "상담사에게 더 깊이" CTA 로 전환을 유도한다.
//
// 계산 파이프라인은 검증된 상담사 경로를 그대로 재사용한다:
//   /api/saju ×2 + /api/astrology ×2 → /api/compatibility/report
// (모두 requireToken 만이라 무로그인 가능. unwrap/pillars 헬퍼는 상담사
//  CompatChartModal 과 동일 — 셰이프가 갈리지 않게 같은 변환을 쓴다.)

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Heart, Loader2, Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { BirthInfoFields, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'
import { ScoreBreakdown } from '@/components/report/atoms/ScoreBreakdown'
import { ShareCompatibilityButton } from '@/components/compatibility/ShareCompatibilityButton'
import { spouseFeeling } from '@/lib/compatibility/compatChartLabels'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryFormatter'
import type { CompatReport } from '@/lib/compatibility/compatReport'
import { logger } from '@/lib/logger'

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const MUTED = '#9aa3b8'

// 서울 폴백 — 도시 미선택 시 좌표가 없으면 계산이 깨지므로 검증에서 막는다.
const DEFAULT_TZ = 'Asia/Seoul'

interface Person {
  name: string
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  gender: 'male' | 'female' | ''
  city: string
  latitude: number | null
  longitude: number | null
  timeZone: string | null
}

const emptyPerson = (): Person => ({
  name: '',
  birthDate: '',
  birthTime: '',
  timeUnknown: false,
  gender: '',
  city: '',
  latitude: null,
  longitude: null,
  timeZone: null,
})

// unwrap / pillars 변환 — CompatChartModal 과 동일 로직(SSOT 가 갈리지 않게).
function unwrapSaju(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return (r.data as Record<string, unknown>) ?? r
}
function unwrapAstro(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const data = (r.data as Record<string, unknown>) ?? r
  return (
    (data.chartData as Record<string, unknown>) ?? (r.chartData as Record<string, unknown>) ?? data
  )
}
function sajuToPillars(saju: Record<string, unknown> | undefined): SajuPillarInput[] | null {
  if (!saju) return null
  const pillars = (saju.pillars as Record<string, unknown> | undefined) ?? undefined
  const cell = (p: unknown): SajuPillarInput => {
    const o = (p ?? {}) as Record<string, unknown>
    const hs = (o.heavenlyStem ?? {}) as Record<string, unknown>
    const eb = (o.earthlyBranch ?? {}) as Record<string, unknown>
    return { stem: String(hs.name ?? ''), branch: String(eb.name ?? '') }
  }
  const out = [
    cell(saju.yearPillar ?? pillars?.year),
    cell(saju.monthPillar ?? pillars?.month),
    cell(saju.dayPillar ?? pillars?.day),
    cell(saju.timePillar ?? saju.hourPillar ?? pillars?.time),
  ]
  if (!out[2].stem || !out[2].branch) return null
  return out
}

// 한글 받침 유무로 주제 조사(은/는) — "준영는"(X) → "준영은"(O). (CompatChartModal 동일)
function withNeun(name: string): string {
  if (!name) return name
  const c = name.charCodeAt(name.length - 1)
  if (c >= 0xac00 && c <= 0xd7a3) return name + ((c - 0xac00) % 28 !== 0 ? '은' : '는')
  return name + '는'
}

const apiHeaders = {
  'Content-Type': 'application/json',
  'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
}

export default function FreeCompatibilityPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [personA, setPersonA] = useState<Person>(emptyPerson)
  const [personB, setPersonB] = useState<Person>(emptyPerson)
  const [phase, setPhase] = useState<'input' | 'loading' | 'result'>('input')
  const [report, setReport] = useState<CompatReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patch = (setter: typeof setPersonA) => (p: BirthFieldsPatch) =>
    setter((prev) => ({
      ...prev,
      birthDate: p.birthDate ?? prev.birthDate,
      birthTime: p.birthTime ?? prev.birthTime,
      timeUnknown: p.timeUnknown ?? prev.timeUnknown,
      gender: (p.gender as Person['gender']) ?? prev.gender,
      city: p.city ?? prev.city,
      latitude: p.latitude !== undefined ? p.latitude : prev.latitude,
      longitude: p.longitude !== undefined ? p.longitude : prev.longitude,
      timeZone: p.timeZone !== undefined ? p.timeZone : prev.timeZone,
    }))

  const ready =
    !!personA.birthDate &&
    !!personB.birthDate &&
    personA.latitude != null &&
    personB.latitude != null

  const analyze = useCallback(async () => {
    setError(null)
    setPhase('loading')
    try {
      const sajuPayload = (p: Person) => ({
        birthDate: p.birthDate,
        birthTime: p.timeUnknown ? '00:00' : p.birthTime || '00:00',
        gender: p.gender === 'female' ? 'female' : 'male',
        calendarType: 'solar' as const,
        timezone: p.timeZone || DEFAULT_TZ,
        latitude: p.latitude ?? 37.5665,
        longitude: p.longitude ?? 126.978,
      })
      const astroPayload = (p: Person) => ({
        date: p.birthDate,
        time: p.timeUnknown ? '00:00' : p.birthTime || '00:00',
        latitude: p.latitude ?? 37.5665,
        longitude: p.longitude ?? 126.978,
        timeZone: p.timeZone || DEFAULT_TZ,
      })

      const post = (url: string, body: unknown) =>
        fetch(url, { method: 'POST', headers: apiHeaders, body: JSON.stringify(body) })

      const [sajuA, sajuB, astroA, astroB] = await Promise.all([
        post('/api/saju', sajuPayload(personA)),
        post('/api/saju', sajuPayload(personB)),
        post('/api/astrology', astroPayload(personA)),
        post('/api/astrology', astroPayload(personB)),
      ])

      const [sajuAJson, sajuBJson, astroAJson, astroBJson] = await Promise.all([
        sajuA.ok ? sajuA.json() : null,
        sajuB.ok ? sajuB.json() : null,
        astroA.ok ? astroA.json() : null,
        astroB.ok ? astroB.json() : null,
      ])

      const reportRes = await post('/api/compatibility/report', {
        astroA: unwrapAstro(astroAJson) ?? null,
        astroB: unwrapAstro(astroBJson) ?? null,
        pillarsA: sajuToPillars(unwrapSaju(sajuAJson)),
        pillarsB: sajuToPillars(unwrapSaju(sajuBJson)),
        timeUnknownA: personA.timeUnknown,
        timeUnknownB: personB.timeUnknown,
        lang: locale,
      })
      const reportJson = (reportRes.ok ? await reportRes.json() : null) as {
        data?: CompatReport
      } | null
      const rep = reportJson?.data ?? null
      if (!rep) {
        setError(
          isKo
            ? '궁합을 계산하지 못했어요. 입력을 확인하고 다시 시도해 주세요.'
            : 'Could not compute compatibility. Check the inputs and try again.'
        )
        setPhase('input')
        return
      }
      setReport(rep)
      setPhase('result')
    } catch (e) {
      logger.error('[compat-free] analyze failed', e instanceof Error ? e : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
      setPhase('input')
    }
  }, [personA, personB, isKo, locale])

  const labelA = personA.name.trim() || (isKo ? 'A' : 'A')
  const labelB = personB.name.trim() || (isKo ? 'B' : 'B')

  // 결정적 신호 한 줄 — 일주 배우자성 우선, 없으면 가장 강한 시너스트리. (모달과 동일 결)
  const headlineReason: string | null = (() => {
    const sp = report?.spouseStars?.[0]
    if (sp?.isDayPillar) {
      const feeling = spouseFeeling(sp.sibsin, sp.role, isKo)
      const who = sp.from === 'A' ? labelA : labelB
      const other = sp.from === 'A' ? labelB : labelA
      return isKo
        ? `${who}에게 ${withNeun(other)} ‘${feeling}’의 짝으로 와요. 게다가 바로 배우자 자리에 떠 있고요.`
        : `To ${who}, ${other} reads as a "${feeling}" partner — landing right in the spouse seat.`
    }
    const a0 = report?.synView?.aspects?.[0]
    if (a0) {
      return isKo
        ? `${labelA} ${a0.a}와 ${labelB} ${a0.b}가 ${a0.label}로 ${a0.strength} 이어져 있어요.`
        : `${labelA}'s ${a0.a} and ${labelB}'s ${a0.b} connect in ${a0.label}, ${a0.strength}.`
    }
    return null
  })()

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(900px 620px at 25% 8%, rgba(236,72,153,0.14), transparent 60%),' +
          'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.14), transparent 60%),' +
          'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
        color: '#f1f3f9',
      }}
    >
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '36px 20px 96px' }}>
        <Link href="/free" style={{ color: GOLD_SOFT, textDecoration: 'none', fontSize: 13 }}>
          ← {isKo ? '무료 도구 홈' : 'Free tools'}
        </Link>

        <p
          style={{
            marginTop: 22,
            fontSize: 12,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: GOLD_SOFT,
            textAlign: 'center',
          }}
        >
          {isKo ? '무료 궁합 · 로그인 없이' : 'FREE COMPATIBILITY · NO SIGN-UP'}
        </p>
        <h1
          style={{
            marginTop: 8,
            fontSize: 26,
            fontWeight: 800,
            textAlign: 'center',
            wordBreak: 'keep-all',
          }}
        >
          {isKo ? '두 사람의 궁합, 지금 무료로' : 'Your compatibility, free right now'}
        </h1>

        {phase === 'result' && report ? (
          <ResultView
            report={report}
            headlineReason={headlineReason}
            labelA={labelA}
            labelB={labelB}
            isKo={isKo}
            locale={locale}
            onReset={() => {
              setReport(null)
              setPhase('input')
            }}
          />
        ) : (
          <>
            <p
              style={{
                marginTop: 12,
                fontSize: 15,
                lineHeight: 1.7,
                color: MUTED,
                textAlign: 'center',
                wordBreak: 'keep-all',
              }}
            >
              {isKo
                ? '두 사람의 생년월일·출생지를 넣으면 사주와 별자리로 본 케미를 바로 보여드려요.'
                : 'Enter both birth dates and places — see your chemistry from Saju and the stars.'}
            </p>

            <PersonForm
              title={isKo ? '첫 번째 사람' : 'Person A'}
              accent="#ec4899"
              person={personA}
              onName={(name) => setPersonA((p) => ({ ...p, name }))}
              onChange={patch(setPersonA)}
              locale={locale}
              idPrefix="cf-a"
            />
            <PersonForm
              title={isKo ? '두 번째 사람' : 'Person B'}
              accent="#38bdf8"
              person={personB}
              onName={(name) => setPersonB((p) => ({ ...p, name }))}
              onChange={patch(setPersonB)}
              locale={locale}
              idPrefix="cf-b"
            />

            {error ? (
              <p style={{ marginTop: 16, color: '#fda4af', fontSize: 13, textAlign: 'center' }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!ready || phase === 'loading'}
              onClick={() => void analyze()}
              style={{
                marginTop: 24,
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '15px 24px',
                borderRadius: 999,
                background: ready ? GOLD : 'rgba(212,181,114,0.3)',
                color: '#1a1305',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: ready && phase !== 'loading' ? 'pointer' : 'not-allowed',
              }}
            >
              {phase === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isKo ? '궁합을 보고 있어요…' : 'Reading your match…'}
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  {isKo ? '궁합 보기' : 'See our match'}
                </>
              )}
            </button>
            {!ready ? (
              <p style={{ marginTop: 10, fontSize: 12, color: MUTED, textAlign: 'center' }}>
                {isKo
                  ? '두 사람의 생년월일과 출생 도시(목록에서 선택)를 모두 채워주세요.'
                  : 'Fill in both birth dates and pick each birth city from the list.'}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

// 한 사람 입력 카드 — 이름 + 공용 BirthInfoFields(도시 자동완성 → 좌표/타임존).
function PersonForm({
  title,
  accent,
  person,
  onName,
  onChange,
  locale,
  idPrefix,
}: {
  title: string
  accent: string
  person: Person
  onName: (name: string) => void
  onChange: (p: BirthFieldsPatch) => void
  locale: 'ko' | 'en'
  idPrefix: string
}) {
  const isKo = locale === 'ko'
  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${accent}44`,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 12 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <label
          htmlFor={`${idPrefix}-name`}
          style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(229,231,240,0.78)' }}
        >
          {isKo ? '이름 (선택)' : 'Name (optional)'}
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={person.name}
          onChange={(e) => onName(e.target.value)}
          placeholder={isKo ? '예: 준영' : 'e.g. Alex'}
          maxLength={20}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#f1f3f9',
            fontSize: 14,
          }}
        />
      </div>
      <BirthInfoFields
        locale={locale}
        birthDate={person.birthDate}
        birthTime={person.birthTime}
        timeUnknown={person.timeUnknown}
        gender={person.gender}
        city={person.city}
        latitude={person.latitude}
        onChange={onChange}
        idPrefix={idPrefix}
      />
    </div>
  )
}

// 결과 — 동·서 교차 verdict + 끌림/마찰 밴드 + 결정적 신호 한 줄 + 공유 + 유료 CTA.
function ResultView({
  report,
  headlineReason,
  labelA,
  labelB,
  isKo,
  locale,
  onReset,
}: {
  report: CompatReport
  headlineReason: string | null
  labelA: string
  labelB: string
  isKo: boolean
  locale: 'ko' | 'en'
  onReset: () => void
}) {
  const verdict = report.crossVerdict
  const verdictColor =
    verdict?.tone === 'aligned'
      ? GOLD
      : verdict?.tone === 'tension'
        ? '#fda4af'
        : verdict?.tone === 'mixed'
          ? '#fbbf24'
          : '#dfe3ee'

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ textAlign: 'center', fontSize: 14, color: MUTED }}>
        {labelA} <Heart className="inline w-3.5 h-3.5" style={{ color: '#ec4899' }} /> {labelB}
      </p>

      {/* 끌림/마찰 밴드 — 가짜 정밀 점수(N/100) 대신 verdict 밴드 + 분해 바 */}
      <div style={{ marginTop: 16 }}>
        <ScoreBreakdown breakdown={report.band} lang={locale} variant="band" theme="dark" />
      </div>

      {/* 동·서 교차 종합 — 사주와 별자리가 한 방향인지 */}
      {verdict ? (
        <p
          style={{
            marginTop: 18,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.6,
            color: verdictColor,
            wordBreak: 'keep-all',
          }}
        >
          {verdict.text}
        </p>
      ) : null}

      {/* 결정적 신호 한 줄 */}
      {headlineReason ? (
        <p
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 1.7,
            color: '#dfe3ee',
            wordBreak: 'keep-all',
          }}
        >
          {headlineReason}
        </p>
      ) : null}

      {/* 공유 — 바이럴 루프 */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <ShareCompatibilityButton
          data={{
            isKo,
            nameA: labelA,
            nameB: labelB,
            verdict: verdict?.text || '',
            verdictTone: verdict?.tone || 'neutral',
            headline: headlineReason || '',
          }}
        />
      </div>

      {/* 깊은 해석은 유료 상담사 — 가장 눈에 띄는 CTA */}
      <div
        style={{
          marginTop: 28,
          padding: 20,
          borderRadius: 16,
          background: 'rgba(212,181,114,0.08)',
          border: '1px solid rgba(212,181,114,0.28)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, wordBreak: 'keep-all' }}>
          {isKo
            ? '이건 두 사람 케미의 큰 그림이에요. 어디서 통하고 어디를 조율하면 좋을지, 시기까지 — 상담사가 더 깊이 풀어드려요.'
            : 'This is the big picture of your chemistry. For where you click, what to tune, and the timing — the counselor goes deeper.'}
        </p>
        <Link
          href="/compatibility/counselor"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            padding: '12px 24px',
            borderRadius: 999,
            background: GOLD,
            color: '#1a1305',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <Sparkles className="w-4 h-4" />
          {isKo ? '상담사에게 더 깊이 묻기 →' : 'Ask the counselor for more →'}
        </Link>
      </div>

      <button
        type="button"
        onClick={onReset}
        style={{
          marginTop: 18,
          width: '100%',
          padding: '12px',
          borderRadius: 999,
          background: 'transparent',
          color: MUTED,
          border: '1px solid rgba(255,255,255,0.14)',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {isKo ? '다른 사람과 다시 보기' : 'Try another pair'}
      </button>
    </div>
  )
}
