'use client'

// src/app/compatibility/free/page.tsx
//
// 무료 궁합 — 로그인 없이 두 사람 생년월일만 넣으면 바로 결과. 바이럴 미끼:
// 친구·연인과 함께 해보고(소셜성), 결과를 공유(/r 링크)해 다시 사람을 끌어온다.
//
// UI 는 통합 리포트(IntegratedReport)와 같은 밝은 페이퍼 결 — 번호 섹션 + ✦ +
// 골드 헤어라인 + 넉넉한 여백으로 "깔끔하게" 읽힌다(freeCompat.module.css).
// 깊은 관계 상담(처방·시기·1:1)은 유료 궁합 상담사의 몫이라 맨 아래 CTA 로 전환.
//
// 계산 파이프라인은 검증된 상담사 경로를 그대로 재사용한다:
//   /api/saju ×2 + /api/astrology ×2 → /api/compatibility/report
// (모두 requireToken 만이라 무로그인 가능. unwrap/pillars 헬퍼는 상담사
//  CompatChartModal 과 동일 — 셰이프가 갈리지 않게 같은 변환을 쓴다.)

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Heart, Loader2, Sparkles, Download, ChevronDown } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { BirthInfoFields, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'
import { getStoredBirthInfo, normGender, timeToState } from '@/app/(main)/birthInfoStorage'
import { ScoreBreakdown } from '@/components/report/atoms/ScoreBreakdown'
import { ShareCompatibilityButton } from '@/components/compatibility/ShareCompatibilityButton'
import { ReferralInviteButton } from '@/components/referral/ReferralInviteButton'
import { spouseFeeling } from '@/lib/compatibility/compatChartLabels'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryFormatter'
import type { CompatReport } from '@/lib/compatibility/compatReport'
import { buildFreeCompatNarrative, josa } from '@/lib/compatibility/freeReport/buildNarrative'
import type { FreeReportTheme } from '@/lib/compatibility/freeReport/types'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { logger } from '@/lib/logger'
import s from './freeCompat.module.css'

// 서울 폴백 — 도시 미선택 시 좌표가 없으면 계산이 깨지므로 검증에서 막는다.
const DEFAULT_TZ = 'Asia/Seoul'

// BirthInfoFields 에 넘기는 라이트(종이) 테마 클래스 — 흰 입력 박스 + 골드 포커스.
const lightFieldClasses = {
  field: 'flex flex-col gap-1.5',
  label: 'text-[12.5px] font-semibold tracking-[0.02em] text-[#6c665b]',
  input:
    'w-full rounded-xl border border-[#e2dccf] bg-white px-3 py-2.5 text-[16px] text-[#211f1b] outline-none transition focus:border-[#c9a85f] disabled:cursor-not-allowed disabled:opacity-50',
  row: 'grid grid-cols-2 gap-2.5',
  checkboxLabel: 'mt-1.5 flex cursor-pointer items-center gap-1.5 text-[12px] text-[#6c665b]',
  checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a9833b]',
  suggestionList:
    'absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-auto rounded-xl border border-[#e2dccf] bg-white p-1 shadow-[0_16px_40px_rgba(60,48,40,0.18)]',
  suggestionItem:
    'block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-[#211f1b] transition hover:bg-[rgba(169,131,59,0.12)]',
}

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

// "저장된 정보 불러오기" 옵션 — 내 정보(DB 프로필) + 등록된 지인. 로그인 시에만.
// 상담사 CompatPersonPickerModal 과 동일 셰이프 — 같은 패턴이 갈리지 않게.
interface LoadOption {
  key: string
  label: string
  sub?: string
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

// LoadOption → free 페이지 Person 매핑. 좌표·타임존까지 실어 도시 재선택 경고 방지.
const optionToPerson = (o: LoadOption): Person => ({
  name: o.name,
  birthDate: o.birthDate,
  birthTime: o.timeUnknown ? '' : o.birthTime,
  timeUnknown: o.timeUnknown,
  gender: o.gender,
  city: o.city,
  latitude: o.latitude,
  longitude: o.longitude,
  timeZone: o.timeZone,
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

  // ── 저장된 정보 불러오기 (로그인 시에만) ───────────────────────────────
  const { data: session, status } = useSession()
  const isAuthed = !!session
  const [loadOptions, setLoadOptions] = useState<LoadOption[]>([])
  const [openDropdown, setOpenDropdown] = useState<'a' | 'b' | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoadOptions([])
      return
    }
    let cancelled = false

    // 즉시 로컬 seed — DB 응답 기다리지 않게 "내 정보" 먼저 노출.
    const seed = getStoredBirthInfo()
    if (seed?.birthDate) {
      setLoadOptions([
        {
          key: 'me',
          label: isKo ? '내 정보' : 'My info',
          name: seed.name || '',
          ...timeToState(seed.birthTime),
          birthDate: seed.birthDate,
          gender: normGender(seed.gender),
          city: seed.city || '',
          latitude: seed.latitude ?? null,
          longitude: seed.longitude ?? null,
          timeZone: seed.timeZone ?? null,
        },
      ])
    }

    const collect = async () => {
      const opts: LoadOption[] = []
      // 내 정보 — DB 프로필 우선
      try {
        const res = await fetch('/api/me/profile')
        if (res.ok) {
          const u = (await res.json())?.user
          if (u && (u.birthDate || u.birthTime)) {
            opts.push({
              key: 'me',
              label: isKo ? '내 정보' : 'My info',
              sub: u.name || undefined,
              name: u.name || '',
              birthDate: u.birthDate || '',
              ...timeToState(u.birthTime),
              gender: normGender(u.gender),
              city: u.birthCity || '',
              latitude: u.latitude ?? null,
              longitude: u.longitude ?? null,
              timeZone: u.tzId ?? null,
            })
          }
        }
      } catch {
        /* fall through to local seed */
      }
      if (!opts.some((o) => o.key === 'me') && seed?.birthDate) {
        opts.push({
          key: 'me',
          label: isKo ? '내 정보' : 'My info',
          name: seed.name || '',
          birthDate: seed.birthDate,
          ...timeToState(seed.birthTime),
          gender: normGender(seed.gender),
          city: seed.city || '',
          latitude: seed.latitude ?? null,
          longitude: seed.longitude ?? null,
          timeZone: seed.timeZone ?? null,
        })
      }
      // 등록된 지인
      try {
        const res = await fetch('/api/me/circle?limit=50')
        if (res.ok) {
          const people = (await res.json())?.data?.people
          if (Array.isArray(people)) {
            for (const p of people) {
              if (!p?.name) continue
              opts.push({
                key: `circle-${p.id}`,
                label: p.name,
                sub: p.relation || undefined,
                name: p.name || '',
                birthDate: p.birthDate || '',
                ...timeToState(p.birthTime),
                gender: normGender(p.gender),
                city: p.birthCity || '',
                latitude: p.latitude ?? null,
                longitude: p.longitude ?? null,
                timeZone: p.tzId ?? null,
              })
            }
          }
        }
      } catch {
        /* ignore — 지인 목록은 선택적 */
      }
      if (!cancelled) setLoadOptions(opts)
    }

    void collect()
    return () => {
      cancelled = true
    }
  }, [status, isKo])

  // 카드 외부 클릭 시 dropdown 닫기.
  useEffect(() => {
    if (openDropdown === null) return
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-load-dropdown]')) setOpenDropdown(null)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [openDropdown])

  const applyOption = (target: 'a' | 'b', opt: LoadOption) => {
    ;(target === 'a' ? setPersonA : setPersonB)(optionToPerson(opt))
    setOpenDropdown(null)
  }

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
        ? `${who}에게 ${withNeun(other)} '${feeling}'의 짝으로 와요. 게다가 바로 배우자 자리에 떠 있고요.`
        : `To ${who}, ${other} reads as a "${feeling}" partner — landing right in the spouse seat.`
    }
    const a0 = report?.synView?.aspects?.[0]
    if (a0) {
      return isKo
        ? `${labelA} ${josa(a0.a, '과/와')} ${labelB} ${josa(a0.b, '이/가')} ${josa(a0.label, '으로/로')} ${a0.strength} 이어져 있어요.`
        : `${labelA}'s ${a0.a} and ${labelB}'s ${a0.b} connect in ${a0.label}, ${a0.strength}.`
    }
    return null
  })()

  return (
    <main className={s.page}>
      <div className={s.container}>
        <Link href="/free" className={s.back}>
          ← {isKo ? '무료 도구 홈' : 'Free tools'}
        </Link>

        <p className={s.eyebrow}>
          {isKo ? '무료 궁합 · 로그인 없이' : 'FREE COMPATIBILITY · NO SIGN-UP'}
        </p>
        <h1 className={s.h1}>
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
            timeUnknown={personA.timeUnknown || personB.timeUnknown}
            onReset={() => {
              setReport(null)
              setPhase('input')
            }}
          />
        ) : (
          <>
            <p className={s.lead}>
              {isKo
                ? '두 사람의 생년월일·출생지를 넣으면 사주와 별자리로 본 케미를 바로 보여드려요.'
                : 'Enter both birth dates and places — see your chemistry from Saju and the stars.'}
            </p>

            <PersonForm
              title={isKo ? '첫 번째 사람' : 'Person A'}
              accent="#c2548a"
              person={personA}
              onName={(name) => setPersonA((p) => ({ ...p, name }))}
              onChange={patch(setPersonA)}
              locale={locale}
              idPrefix="cf-a"
              isAuthenticated={isAuthed}
              loadOptions={loadOptions}
              showDropdown={openDropdown === 'a'}
              onToggleDropdown={() => setOpenDropdown((d) => (d === 'a' ? null : 'a'))}
              onPickOption={(opt) => applyOption('a', opt)}
            />
            <PersonForm
              title={isKo ? '두 번째 사람' : 'Person B'}
              accent="#3f7cae"
              person={personB}
              onName={(name) => setPersonB((p) => ({ ...p, name }))}
              onChange={patch(setPersonB)}
              locale={locale}
              idPrefix="cf-b"
              isAuthenticated={isAuthed}
              loadOptions={loadOptions}
              showDropdown={openDropdown === 'b'}
              onToggleDropdown={() => setOpenDropdown((d) => (d === 'b' ? null : 'b'))}
              onPickOption={(opt) => applyOption('b', opt)}
            />

            {error ? <p className={s.error}>{error}</p> : null}

            <button
              type="button"
              disabled={!ready || phase === 'loading'}
              onClick={() => void analyze()}
              className={s.cta}
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
              <p className={s.hint}>
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
  isAuthenticated,
  loadOptions,
  showDropdown,
  onToggleDropdown,
  onPickOption,
}: {
  title: string
  accent: string
  person: Person
  onName: (name: string) => void
  onChange: (p: BirthFieldsPatch) => void
  locale: 'ko' | 'en'
  idPrefix: string
  isAuthenticated: boolean
  loadOptions: LoadOption[]
  showDropdown: boolean
  onToggleDropdown: () => void
  onPickOption: (opt: LoadOption) => void
}) {
  const isKo = locale === 'ko'
  return (
    <div className={s.personCard}>
      <div className={s.personHead}>
        <p className={s.personTitle} style={{ color: accent }}>
          {title}
        </p>
        {/* 저장된 정보 불러오기 — 로그인 시에만 (내 정보 + 등록한 지인) */}
        {isAuthenticated && loadOptions.length > 0 ? (
          <div className={s.loadWrap} data-load-dropdown>
            <button type="button" onClick={onToggleDropdown} className={s.loadBtn}>
              <Download className="w-3 h-3" />
              {isKo ? '저장된 정보 불러오기' : 'Load saved info'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown ? (
              <ul role="listbox" className={s.loadList}>
                {loadOptions.map((o) => (
                  <li key={o.key}>
                    <button type="button" onClick={() => onPickOption(o)} className={s.loadItem}>
                      <span className={s.loadItemLabel}>{o.label}</span>
                      {o.sub ? <span className={s.loadItemSub}>· {o.sub}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={s.field}>
        <label htmlFor={`${idPrefix}-name`} className={s.label}>
          {isKo ? '이름 (선택)' : 'Name (optional)'}
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={person.name}
          onChange={(e) => onName(e.target.value)}
          placeholder={isKo ? '예: 준영' : 'e.g. Alex'}
          maxLength={20}
          className={s.input}
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
        classes={lightFieldClasses}
        idPrefix={idPrefix}
      />
    </div>
  )
}

// 테마 카드 — 질문형 제목(아이콘) + 대표 2개 단락 + "+N개 더 보기"(접힘).
// 출처별 섹션 대신 "사람들이 실제 궁금해하는 질문"으로 묶어 골라 읽게 한다.
function ThemeCard({ theme, isKo }: { theme: FreeReportTheme; isKo: boolean }) {
  const top = theme.paragraphs.slice(0, 2)
  const rest = theme.paragraphs.slice(2)
  return (
    <section className={s.section}>
      <div className={s.secHead}>
        <span className={s.secTitleWrap}>
          <span className={s.secIcon} aria-hidden="true">
            {theme.icon}
          </span>
          <h2 className={s.secTitle}>{theme.title}</h2>
        </span>
        {typeof theme.score === 'number' ? (
          <span className={s.themeScore}>
            <span className={s.themeScoreCap}>{theme.scoreCaption}</span>
            <span
              className={`${s.themeScoreNum} ${theme.id === 'friction' ? s.themeScoreNumClash : ''}`}
            >
              {theme.score}
            </span>
          </span>
        ) : null}
      </div>
      {typeof theme.score === 'number' ? (
        <div className={s.themeBar} aria-hidden="true">
          <div
            className={`${s.themeBarFill} ${theme.id === 'friction' ? s.themeBarFillClash : ''}`}
            style={{ width: `${theme.score}%` }}
          />
        </div>
      ) : null}
      {theme.hook ? <p className={s.themeHook}>{theme.hook}</p> : null}
      {top.map((p, i) => (
        <p key={i} className={s.para}>
          {p}
        </p>
      ))}
      {rest.length ? (
        <details className={s.themeMore}>
          <summary className={s.themeMoreSummary}>
            {isKo ? `+ ${rest.length}개 더 보기` : `+ ${rest.length} more`}
          </summary>
          {rest.map((p, i) => (
            <p key={i} className={s.para}>
              {p}
            </p>
          ))}
        </details>
      ) : null}
    </section>
  )
}

// 용어 풀이 — 접고 펼치는 더보기. (사주·점성 모르는 사람이 한 번에 정리)
function GlossaryBlock({
  entries,
  isKo,
}: {
  entries: { term: string; body: string }[]
  isKo: boolean
}) {
  if (!entries.length) return null
  return (
    <details className={s.glossary}>
      <summary className={s.glossarySummary}>
        📖 {isKo ? '용어 풀이 — 쉽게 한 번에' : 'Glossary — plain meanings'}
      </summary>
      <dl className={s.glossaryList}>
        {entries.map((e, i) => (
          <div key={i} className={s.glossaryRow}>
            <dt className={s.glossaryTerm}>{e.term}</dt>
            <dd className={s.glossaryDef}>{e.body}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

// 결과 — 풍부한 무료 리포트: 도입 + 밴드 + 한눈에 + 신호별 섹션 + 용어풀이 + 공유 + 유료 CTA.
function ResultView({
  report,
  headlineReason,
  labelA,
  labelB,
  isKo,
  locale,
  timeUnknown,
  onReset,
}: {
  report: CompatReport
  headlineReason: string | null
  labelA: string
  labelB: string
  isKo: boolean
  locale: 'ko' | 'en'
  timeUnknown: boolean
  onReset: () => void
}) {
  const view = buildFreeCompatNarrative(report, { labelA, labelB, lang: locale })
  // 퍼널 — 결과 화면 노출(폼이 아니라 풀이가 실제로 렌더된 시점). 한 번만 전송.
  useEffect(() => {
    trackFunnel('compat_free.report_viewed')
  }, [])
  const verdict = view.verdict
  const toneClass =
    verdict?.tone === 'aligned'
      ? s.aligned
      : verdict?.tone === 'tension'
        ? s.tension
        : verdict?.tone === 'mixed'
          ? s.mixed
          : s.neutral

  return (
    <div>
      <p className={s.resultHead}>
        {labelA} <Heart className="inline w-3.5 h-3.5" style={{ color: '#c2548a' }} /> {labelB}
      </p>

      {/* 헤드라인 총점 — 한눈에 박히는 큰 숫자 (캡처/공유 후크) */}
      {view.overallScore != null ? (
        <div className={s.scoreHero}>
          <div
            className={s.scoreRing}
            style={{ ['--pct' as string]: `${view.overallScore}` }}
            aria-hidden="true"
          >
            <span className={s.scoreRingNum}>{view.overallScore}</span>
          </div>
          <div className={s.scoreHeroText}>
            <span className={s.scoreHeroLabel}>{isKo ? '우리 궁합' : 'Our match'}</span>
            <span className={s.scoreHeroGrade}>{view.overallGrade}</span>
          </div>
        </div>
      ) : null}

      {/* 리포트 도입 — 어떻게 읽는지 */}
      <p className={s.intro}>{view.intro}</p>

      {/* 출생시각 미상 — 시주(時柱)가 바뀌면 배우자성·궁합 점수가 달라질 수 있어 추정임을 알림 */}
      {timeUnknown ? (
        <p className={s.timeNote}>
          {isKo
            ? '출생 시각을 모르는 분이 있어, 태어난 시(時) 기둥에 기대는 배우자성·점수는 대략적인 추정이에요. 시각을 넣으면 더 또렷해져요.'
            : 'One birth time is unknown, so spouse-star and score that lean on the birth-hour pillar are rough estimates. Add the time for a sharper read.'}
        </p>
      ) : null}

      {/* 끌림/마찰 밴드 — 가짜 정밀 점수(N/100) 대신 verdict 밴드 + 분해 바 */}
      <div className={s.bandWrap}>
        <ScoreBreakdown breakdown={report.band} lang={locale} variant="band" theme="light" />
      </div>

      {/* 한눈에 — 동·서 교차 종합 + 초보자용 풀이 */}
      {verdict ? (
        <div className={s.hero}>
          <p className={`${s.heroText} ${toneClass}`}>{verdict.text}</p>
          <p className={s.heroSub}>{verdict.expansion}</p>
        </div>
      ) : null}

      {/* 궁금한 것부터 — 질문 주제별 테마 카드 */}
      {view.themes.length ? (
        <p className={s.secLead}>
          {isKo
            ? `궁금한 것부터 — ${view.themes.length}가지`
            : `Start with what you're curious about — ${view.themes.length} themes`}
        </p>
      ) : null}
      {view.themes.map((th) => (
        <ThemeCard key={th.id} theme={th} isKo={isKo} />
      ))}

      {/* 용어 풀이 */}
      <GlossaryBlock entries={view.glossary} isKo={isKo} />

      {/* 공유 — 바이럴 루프 */}
      <div className={s.share}>
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
        <ReferralInviteButton isKo={isKo} />
      </div>

      {/* 깊은 해석(처방·시기·1:1)은 유료 궁합 상담사 — 가장 눈에 띄는 CTA */}
      <div className={s.closing}>
        <p className={s.closingText}>{view.closing}</p>
        <Link
          href="/compatibility/counselor"
          className={s.counselorCta}
          onClick={() => trackFunnel('compat_free.counselor_cta')}
        >
          <Sparkles className="w-4 h-4" />
          {isKo ? '상담사에게 더 깊이 묻기 →' : 'Ask the counselor for more →'}
        </Link>
      </div>

      <button type="button" onClick={onReset} className={s.resetBtn}>
        {isKo ? '다른 사람과 다시 보기' : 'Try another pair'}
      </button>
    </div>
  )
}
