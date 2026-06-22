/**
 * PlanetDetail — §03 의 행성 표를 '모든 행성 한 줄도 빠짐없이 풀이' 로 확장한다.
 * bigThree(태양·달·상승) 블록은 일부 행성만 본문 해석을 보여주지만, 여기서는
 * astro.planets + astro.extraPoints 전체를 순회해 행성(역할) × 별자리(색) × 하우스
 * (무대) 를 한 문장으로 합성한다. 현재 hover 로만 보이던 planet-core 원리/의미를
 * 본문으로 끌어올린다. 순수 표현 컴포넌트 — 데이터는 부모가 어댑트해 넘긴다.
 *
 * 결정성/안전: getPlanetCore 반환을 방어적으로 캐스팅하고, 노드처럼 코어가 없는
 * 포인트는 planetHover 문자열로 폴백한다. EN 은 한글을 단 한 글자도 렌더하지 않음.
 */
import {
  type Lang,
  SIGN_TRAIT,
  signLabel,
  abbr,
  elClass,
  planetHover,
} from '../integratedReportLabels'
import { SIGN_META, type ReportData } from '../reportTypes'
import { getPlanetCore, getHouseRich, type HouseNumber } from '@/lib/chart-dictionary'
import s from './PlanetDetail.module.css'

export interface PlanetDetailProps {
  astro: ReportData['astro']
  lang: Lang
  /** 이미 위 카드(bigThree)에서 보여준 행성 이름은 제외해 중복 렌더를 막는다. */
  exclude?: string[]
}

// 한 몸(행성/포인트)이 갖는 공통 모양 — planets 와 extraPoints 를 한 줄에 통합.
interface Body {
  name: string
  ko: string
  glyph: string
  sign: string
  deg: string
  house: number
  retro?: boolean
}

// 영어 하우스 서수 (1st/2nd/3rd … 11th/12th/13th 예외 처리). bigThree 와 동일 규칙.
function ord(n: number): string {
  const v = n % 100
  const suf = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'
  return `${n}${suf}`
}

// 행성(역할) × 별자리(색) × 하우스(무대) → 한 문장. bigThree 의 read 빌더와 동일 접근.
function buildRead(label: string, sign: string, house: number, lang: Lang): string | null {
  const tr = SIGN_TRAIT[abbr(sign)]
  if (!tr) return null
  const sgn = signLabel(abbr(sign), lang)
  const h = house ? getHouseRich(house as HouseNumber, lang) : null
  const dom = h ? h.domain.split('·')[0].trim() : ''
  return lang === 'en'
    ? `In ${sgn}, your ${label} comes through as ${tr.en}` +
        (h ? `, and plays out mainly in the ${ord(house)} house of ${dom}.` : '.')
    : `${sgn} 자리라 ${label}의 기운이 ${tr.ko} 색으로 드러나` +
        (h ? `고, ${house}하우스(${dom}) 무대에서 주로 펼쳐져요.` : '요.')
}

function BodyRow({ b, lang }: { b: Body; lang: Lang }): React.ReactElement {
  const sk = SIGN_META[abbr(b.sign)]
  const elCls = elClass[sk?.el ?? ''] ?? ''
  const core = getPlanetCore(b.name, lang) as { principle?: string; meaning?: string } | null
  const label = lang === 'en' ? b.name : b.ko
  const read = buildRead(label, b.sign, b.house, lang)
  // 코어가 없으면(예: 노드) hover 문자열로 폴백 — 비면 본문 생략.
  const fallback = core ? '' : planetHover(b.name, lang)

  return (
    <div className={s.row}>
      <div className={s.head}>
        <b className={elCls}>
          <span className={s.glyph}>{b.glyph}</span> {label}
        </b>
        <i className={s.coord}>
          <span className={`${s.glyph} ${elCls}`}>{sk?.glyph ?? ''}</span>{' '}
          <span className={elCls}>{signLabel(abbr(b.sign), lang)}</span> {b.deg} · {b.house}H
          {b.retro ? <span className={s.retro}> ℞</span> : null}
        </i>
      </div>
      {core?.principle ? <div className={s.prin}>{core.principle}</div> : null}
      {read ? <div className={s.read}>{read}</div> : null}
      {core?.meaning ? (
        <div className={s.mean}>{core.meaning}</div>
      ) : fallback ? (
        <div className={s.mean}>{fallback}</div>
      ) : null}
    </div>
  )
}

export default function PlanetDetail({
  astro,
  lang,
  exclude,
}: PlanetDetailProps): React.ReactElement | null {
  const skip = new Set(exclude ?? [])
  const bodies: Body[] = [
    ...astro.planets.map((p) => ({
      name: p.name,
      ko: p.ko,
      glyph: p.glyph,
      sign: p.sign,
      deg: p.deg,
      house: p.house,
      retro: p.retro,
    })),
    ...astro.extraPoints.map((e) => ({
      name: e.name,
      ko: e.ko,
      glyph: e.glyph,
      sign: e.sign,
      deg: e.deg,
      house: e.house,
    })),
  ].filter((b) => !skip.has(b.name))

  if (bodies.length === 0) return null
  const summary = skip.size
    ? lang === 'en'
      ? 'The other mind functions, read in full (planets)'
      : '나머지 마음의 기능들 읽기 (행성)'
    : lang === 'en'
      ? 'Every mind function, read in full (planets)'
      : '마음의 기능들 모두 읽기 (행성)'

  return (
    <details className={s.box}>
      <summary>{summary}</summary>
      <div className={s.body}>
        {bodies.map((b, i) => (
          <BodyRow b={b} lang={lang} key={`${b.name}-${i}`} />
        ))}
      </div>
    </details>
  )
}
