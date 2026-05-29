'use client'

import React from 'react'
import {
  getHanjaRich,
  getIljuArchetype,
  getRelationMeaning,
  getSajuStrengthMeaning,
  type HanjaStemLangEntry,
  type HanjaBranchLangEntry,
  type RelationCategory,
  type SajuStrengthLeaf,
} from '@/lib/chart-dictionary'

/**
 * PillarDrawer — 사주 8글자 한 기둥(시/일/월/년)에 대한 모든 raw + plain.
 *
 * 사용자가 차트의 한 셀(예: 일주의 辛未)을 탭하면 펼쳐지는 글래스 drawer.
 * 한자·십성·지장간·12운성·12신살·통근/득령/조후·합충·일주 archetype 까지
 * 사전(chart-dictionary) lookup 으로 raw 옆에 plain 설명 한 줄씩 붙여 표시.
 *
 * 모든 raw 데이터는 `saju?.shape` 안전 접근 — 없는 항목은 조용히 skip (graceful).
 * 다크 글래스 디자인, ESC 키 close 지원.
 */

type Pillar = 'time' | 'day' | 'month' | 'year'

interface PillarDrawerProps {
  open: boolean
  onClose: () => void
  /** 'time' | 'day' | 'month' | 'year' */
  pillar: Pillar
  /** 사주 raw 데이터 (api/saju 응답 또는 NatalContext.saju shape) */
  saju: unknown
  lang?: 'ko' | 'en'
}

// ── 라벨 i18n ────────────────────────────────────────────────────────────────
const PILLAR_LABEL: Record<Pillar, { ko: string; en: string; hanja: string }> = {
  time: { ko: '시주', en: 'Hour Pillar', hanja: '時柱' },
  day: { ko: '일주', en: 'Day Pillar', hanja: '日柱' },
  month: { ko: '월주', en: 'Month Pillar', hanja: '月柱' },
  year: { ko: '연주', en: 'Year Pillar', hanja: '年柱' },
}

const SECTION_LABEL = {
  jijanggan: { ko: '지장간', en: 'Hidden Stems' },
  sibsin: { ko: '십성', en: 'Ten Gods' },
  twelveStage: { ko: '12운성', en: '12 Stages' },
  twelveShinsal: { ko: '12신살', en: '12 Shinsal' },
  shinsal: { ko: '신살', en: 'Shinsal' },
  relations: { ko: '합/충 (이 기둥 관여)', en: 'Combinations/Clashes' },
  strength: { ko: '통근·득령·조후', en: 'Strength' },
  ilju: { ko: '일주 원형', en: 'Day Pillar Archetype' },
} as const

// ── 오행 색 dot ──────────────────────────────────────────────────────────────
function elementColor(el?: string): string {
  // 한/영 모두 처리.
  switch (el) {
    case '목':
    case 'Wood':
      return '#5fb37c'
    case '화':
    case 'Fire':
      return '#e36a6a'
    case '토':
    case 'Earth':
      return '#c8a26a'
    case '금':
    case 'Metal':
      return '#cfcfd6'
    case '수':
    case 'Water':
      return '#5e8fd9'
    default:
      return 'rgba(245, 247, 251, 0.4)'
  }
}

// ── saju shape 안전 접근 ─────────────────────────────────────────────────────
interface PillarDisplayShape {
  stem?: string
  branch?: string
  jijanggan?: {
    display?: string
    list?: string[]
    object?: Record<string, { name?: string; sibsin?: string } | undefined>
  }
  twelveStage?: string
  twelveShinsal?: string[]
  shinsal?: string[]
  shinsalSummary?: string
}

interface RelationLike {
  kind?: string
  pillars?: string[]
  detail?: string
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function getPillarDisplay(saju: unknown, pillar: Pillar): PillarDisplayShape | null {
  if (!isObj(saju)) return null
  const table = isObj(saju.table) ? saju.table : null
  const byPillar = table && isObj(table.byPillar) ? table.byPillar : null
  const entry = byPillar && isObj(byPillar[pillar]) ? (byPillar[pillar] as PillarDisplayShape) : null
  return entry
}

function getRelations(saju: unknown): RelationLike[] {
  if (!isObj(saju)) return []
  const r = saju.relations
  return Array.isArray(r) ? (r as RelationLike[]) : []
}

function getDayMasterStem(saju: unknown): string | null {
  if (!isObj(saju)) return null
  const dm = saju.dayMaster
  if (isObj(dm) && typeof dm.name === 'string') return dm.name
  const dp = saju.dayPillar
  if (isObj(dp)) {
    const hs = dp.heavenlyStem
    if (isObj(hs) && typeof hs.name === 'string') return hs.name
  }
  return null
}

// 일주 한정: stem + branch ganji 문자열 (예: "辛未").
function getDayGanji(saju: unknown): string | null {
  const dp = getPillarDisplay(saju, 'day')
  if (dp?.stem && dp?.branch) return `${dp.stem}${dp.branch}`
  return null
}

// ── strength (통근/득령/조후) 안전 추출 ──────────────────────────────────────
interface StrengthAdvanced {
  tonggeun?: { score?: number } | null
  deukryeong?: { strength?: 'strong' | 'weak' | 'neutral'; isDeukryeong?: boolean } | null
  johuYongsin?: { primary?: string; description?: string } | null
}

function getStrength(saju: unknown): StrengthAdvanced | null {
  if (!isObj(saju)) return null
  const adv = saju.advancedAnalysis
  if (!isObj(adv)) return null
  return adv as StrengthAdvanced
}

// 통근 점수 → strong/weak/balanced 키.
function tonggeunKeyFromScore(score?: number): 'strong' | 'weak' | 'balanced' | null {
  if (typeof score !== 'number') return null
  if (score >= 60) return 'strong'
  if (score <= 30) return 'weak'
  return 'balanced'
}

function deukryeongKey(s?: 'strong' | 'weak' | 'neutral', isDeuk?: boolean): 'yes' | 'no' | 'balanced' | null {
  if (typeof isDeuk === 'boolean') return isDeuk ? 'yes' : 'no'
  if (s === 'strong') return 'yes'
  if (s === 'weak') return 'no'
  if (s === 'neutral') return 'balanced'
  return null
}

// leaf → { label, explain } 안전 추출.
function leafText(leaf: SajuStrengthLeaf | null): { label?: string; explain?: string } | null {
  if (!leaf) return null
  if (typeof leaf === 'string') return { explain: leaf }
  if (Array.isArray(leaf)) return { explain: leaf.join(' · ') }
  if (typeof leaf === 'object') {
    const obj = leaf as Record<string, unknown>
    const label = typeof obj.label === 'string' ? obj.label : undefined
    const explain = typeof obj.explain === 'string' ? obj.explain : undefined
    if (label || explain) return { label, explain }
  }
  return null
}

// ── 관계 매칭: 이 기둥이 관여한 관계만 ──────────────────────────────────────
const KIND_TO_CATEGORY: Record<string, RelationCategory> = {
  천간합: '천간합',
  천간충: '천간충',
  지지육합: '지지육합',
  지지삼합: '지지삼합',
  지지방합: '지지방합',
  지지충: '지지충',
  지지형: '지지형',
  지지파: '지지파',
  지지해: '지지해',
  원진: '원진',
}

// detail "甲-己 합화토" / "寅-亥 육합" → 키 "甲己" / "寅亥" 시도.
function relationPairKey(detail?: string): string | null {
  if (!detail) return null
  const m = detail.match(/([㐀-鿿])\s*-\s*([㐀-鿿])/)
  if (!m) return null
  return `${m[1]}${m[2]}`
}

// ── 컴포넌트 ────────────────────────────────────────────────────────────────
export function PillarDrawer({ open, onClose, pillar, saju, lang = 'ko' }: PillarDrawerProps) {
  // ESC 키 → close.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const display = getPillarDisplay(saju, pillar)
  const stem = display?.stem
  const branch = display?.branch
  const stemRich = stem ? (getHanjaRich(stem, lang) as HanjaStemLangEntry | null) : null
  const branchRich = branch ? (getHanjaRich(branch, lang) as HanjaBranchLangEntry | null) : null

  const pl = PILLAR_LABEL[pillar]
  const headerTitle = lang === 'ko' ? `${pl.ko} ${stem ?? ''}${branch ?? ''}` : `${pl.en} ${stem ?? ''}${branch ?? ''}`

  // 관계 — 이 기둥이 pillars 배열에 포함된 것만.
  const relations = getRelations(saju).filter((r) => Array.isArray(r.pillars) && r.pillars.includes(pillar))

  // 일주 archetype.
  const dayGanji = pillar === 'day' ? getDayGanji(saju) : null
  const iljuArchetype = dayGanji ? getIljuArchetype(dayGanji, lang) : null

  // 통근/득령/조후.
  const strength = getStrength(saju)
  const dmStem = getDayMasterStem(saju)
  const tonggeunKey = tonggeunKeyFromScore(strength?.tonggeun?.score)
  const tonggeunLeaf = tonggeunKey ? leafText(getSajuStrengthMeaning('통근', tonggeunKey, lang)) : null
  const deukKey = deukryeongKey(strength?.deukryeong?.strength, strength?.deukryeong?.isDeukryeong)
  const deukLeaf = deukKey ? leafText(getSajuStrengthMeaning('득령', deukKey, lang)) : null
  const johuPrimary = strength?.johuYongsin?.primary
  const johuLeaf = johuPrimary ? leafText(getSajuStrengthMeaning('조후', johuPrimary, lang)) : null

  // jijanggan list.
  const jgList: string[] = Array.isArray(display?.jijanggan?.list) ? (display!.jijanggan!.list as string[]) : []
  const jgObj = display?.jijanggan?.object ?? {}

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      onClick={onClose}
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mt-12 w-full max-w-md rounded-2xl p-5 sm:p-6"
        style={{
          background: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid var(--ds-gold-line)',
          color: 'var(--ds-dark-text)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--ds-gold-on-dark)' }}
            >
              {pl.hanja} · {lang === 'ko' ? pl.ko : pl.en}
            </div>
            <div className="mt-1 flex items-baseline gap-2 text-3xl font-semibold" style={{ letterSpacing: '0.04em' }}>
              <span>{stem ?? '—'}</span>
              <span>{branch ?? '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ko' ? '닫기' : 'Close'}
            className="rounded-full p-1.5 text-base leading-none transition-opacity hover:opacity-100"
            style={{
              background: 'rgba(245, 247, 251, 0.06)',
              color: 'var(--ds-dark-text)',
              opacity: 0.7,
            }}
          >
            ✕
          </button>
        </div>

        {/* Stem */}
        {stem && stemRich && (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-lg font-medium">
              <span>{stem}</span>
              <span style={{ color: 'var(--ds-dark-text-muted)' }}>({stemRich.name})</span>
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: elementColor(stemRich.element) }}
              />
              <span className="text-xs" style={{ color: 'var(--ds-dark-text-muted)' }}>
                {stemRich.yinYang}·{stemRich.element}
              </span>
            </div>
            <div className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--ds-dark-text)' }}>
              <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>{stemRich.image}</span>
              <span className="mx-1.5" style={{ color: 'var(--ds-dark-text-muted)' }}>—</span>
              <span style={{ color: 'var(--ds-dark-text-muted)' }}>{stemRich.nature}</span>
            </div>
          </div>
        )}

        {/* Branch */}
        {branch && branchRich && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <span>{branch}</span>
              <span style={{ color: 'var(--ds-dark-text-muted)' }}>
                ({branchRich.name}
                {branchRich.animal ? ` · ${branchRich.animal}` : ''})
              </span>
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: elementColor(branchRich.element) }}
              />
              <span className="text-xs" style={{ color: 'var(--ds-dark-text-muted)' }}>
                {branchRich.element}
              </span>
            </div>
            <div className="mt-1 text-[13px] leading-snug">
              <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>{branchRich.image}</span>
              <span className="mx-1.5" style={{ color: 'var(--ds-dark-text-muted)' }}>—</span>
              <span style={{ color: 'var(--ds-dark-text-muted)' }}>{branchRich.nature}</span>
            </div>
          </div>
        )}

        {/* 지장간 */}
        {(jgList.length > 0 || branchRich?.hidden_stems) && (
          <Section title={SECTION_LABEL.jijanggan[lang]}>
            <div className="text-[13px]" style={{ color: 'var(--ds-dark-text)' }}>
              {jgList.length > 0 ? jgList.join(' · ') : branchRich?.hidden_stems}
            </div>
            {/* 각 hidden stem 의 sibsin 라벨이 있으면 같이. */}
            {jgObj && Object.keys(jgObj).length > 0 && (
              <div className="mt-1 text-[11px]" style={{ color: 'var(--ds-dark-text-muted)' }}>
                {(['jeonggi', 'junggi', 'chogi'] as const)
                  .map((k) => {
                    const slot = jgObj[k]
                    if (!slot?.name) return null
                    const kind = k === 'jeonggi' ? (lang === 'ko' ? '본기' : 'Primary')
                      : k === 'junggi' ? (lang === 'ko' ? '중기' : 'Middle')
                      : (lang === 'ko' ? '여기' : 'Residual')
                    return `${slot.name}(${kind}${slot.sibsin ? ` · ${slot.sibsin}` : ''})`
                  })
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </Section>
        )}

        {/* 12운성 */}
        {display?.twelveStage && (
          <Section title={SECTION_LABEL.twelveStage[lang]}>
            <div className="text-[13px]" style={{ color: 'var(--ds-dark-text)' }}>
              {display.twelveStage}
            </div>
          </Section>
        )}

        {/* 12신살 + 신살 kinds */}
        {((display?.twelveShinsal && display.twelveShinsal.length > 0) ||
          (display?.shinsal && display.shinsal.length > 0)) && (
          <Section title={SECTION_LABEL.twelveShinsal[lang]}>
            {display?.twelveShinsal && display.twelveShinsal.length > 0 && (
              <div className="text-[13px]" style={{ color: 'var(--ds-dark-text)' }}>
                {display.twelveShinsal.join(' · ')}
              </div>
            )}
            {display?.shinsal && display.shinsal.length > 0 && (
              <div className="mt-1 text-[12px]" style={{ color: 'var(--ds-dark-text-muted)' }}>
                {display.shinsal.join(' · ')}
              </div>
            )}
            {display?.shinsalSummary && (
              <div className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--ds-dark-text-muted)' }}>
                {display.shinsalSummary}
              </div>
            )}
          </Section>
        )}

        {/* 합/충 (이 기둥 관여) */}
        {relations.length > 0 && (
          <Section title={SECTION_LABEL.relations[lang]}>
            <ul className="space-y-1 text-[13px]">
              {relations.map((rel, idx) => {
                const cat = rel.kind ? KIND_TO_CATEGORY[rel.kind] : null
                const pairKey = relationPairKey(rel.detail)
                const meaning = cat && pairKey ? getRelationMeaning(cat, pairKey, lang) : null
                return (
                  <li key={idx} className="leading-snug">
                    <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>{rel.kind ?? '—'}</span>
                    {rel.detail && (
                      <span className="ml-1.5" style={{ color: 'var(--ds-dark-text)' }}>
                        {rel.detail}
                      </span>
                    )}
                    {meaning?.meaning && (
                      <>
                        <span className="mx-1.5" style={{ color: 'var(--ds-dark-text-muted)' }}>—</span>
                        <span style={{ color: 'var(--ds-dark-text-muted)' }}>{meaning.meaning}</span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {/* 통근·득령·조후 */}
        {(tonggeunLeaf || deukLeaf || johuLeaf) && (
          <Section title={SECTION_LABEL.strength[lang]}>
            <ul className="space-y-1 text-[13px]">
              {tonggeunLeaf && (
                <StrengthRow
                  label={lang === 'ko' ? '통근' : 'Tonggeun'}
                  value={tonggeunLeaf.label}
                  explain={tonggeunLeaf.explain}
                />
              )}
              {deukLeaf && (
                <StrengthRow
                  label={lang === 'ko' ? '득령' : 'Deukryeong'}
                  value={deukLeaf.label}
                  explain={deukLeaf.explain}
                />
              )}
              {johuLeaf && (
                <StrengthRow
                  label={lang === 'ko' ? '조후' : 'Johu'}
                  value={johuLeaf.label ?? (dmStem ? `${dmStem}·${johuPrimary}` : johuPrimary)}
                  explain={johuLeaf.explain}
                />
              )}
            </ul>
          </Section>
        )}

        {/* 일주 archetype (day only) */}
        {pillar === 'day' && iljuArchetype && (
          <Section title={SECTION_LABEL.ilju[lang]}>
            <div className="text-[13px] leading-snug">
              <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>{iljuArchetype.character}</span>
            </div>
            <div className="mt-1 grid gap-1 text-[12px]" style={{ color: 'var(--ds-dark-text-muted)' }}>
              <div>
                <span style={{ color: 'var(--ds-dark-text)' }}>
                  {lang === 'ko' ? '강점' : 'Strength'}:
                </span>{' '}
                {iljuArchetype.strength}
              </div>
              <div>
                <span style={{ color: 'var(--ds-dark-text)' }}>
                  {lang === 'ko' ? '약점' : 'Weakness'}:
                </span>{' '}
                {iljuArchetype.weakness}
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Sub components ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--ds-gold-line)' }}>
      <div
        className="mb-1.5 text-[10px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--ds-gold-on-dark)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function StrengthRow({ label, value, explain }: { label: string; value?: string; explain?: string }) {
  return (
    <li className="leading-snug">
      <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>{label}</span>
      {value && (
        <>
          <span className="mx-1" style={{ color: 'var(--ds-dark-text-muted)' }}>:</span>
          <span style={{ color: 'var(--ds-dark-text)' }}>{value}</span>
        </>
      )}
      {explain && (
        <>
          <span className="mx-1.5" style={{ color: 'var(--ds-dark-text-muted)' }}>—</span>
          <span style={{ color: 'var(--ds-dark-text-muted)' }}>{explain}</span>
        </>
      )}
    </li>
  )
}
