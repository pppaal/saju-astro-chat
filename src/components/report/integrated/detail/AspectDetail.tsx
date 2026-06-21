/**
 * AspectDetail — §04 어스펙트·위계 뜻풀이를 평문 리스트로 펼친다.
 *
 * §04 의 어스펙트 격자(글리프+orb)와 디그니티 목록은 '의미'가 title 툴팁에만
 * 들어가 모바일/터치에서는 보이지 않는다. 이 컴포넌트는 행성 간 각도와 행성
 * 위계의 뜻을 한 줄씩 평문으로 노출한다. EN 은 한글 0자.
 */
import {
  type ReportData,
  ASPECT_META,
  ASPECT_FRIENDLY,
  DIGNITY_TIER_LABEL,
  DIGNITY_TIER_FRIENDLY,
  DIGNITY_TIER_TOOLTIP,
  SIGN_META,
} from '../reportTypes'
import { type Lang, aspectHover, dignityHover, signLabel, abbr } from '../integratedReportLabels'
import s from './AspectDetail.module.css'

export interface AspectDetailProps {
  astro: ReportData['astro']
  lang: Lang
}

const toneClass = (cls: 'hard' | 'soft' | 'neutral' | undefined): string => {
  if (cls === 'hard') return s.hard
  if (cls === 'soft') return s.soft
  return s.neutral
}

export default function AspectDetail({ astro, lang }: AspectDetailProps) {
  const summary = lang === 'en' ? 'Aspects & dignities, explained' : '어스펙트·위계 뜻풀이'
  const aspectsCap = lang === 'en' ? 'Aspects between planets' : '행성 간 각도'
  const dignityCap = lang === 'en' ? 'Planet dignities' : '행성 위계'
  const signSuffix = lang === 'en' ? '' : '자리'
  const noDignity =
    lang === 'en'
      ? 'No notable dignity — all neutral (peregrine).'
      : '뚜렷한 위계 없음 — 모두 중립(peregrine)이에요.'

  const planets = astro.planets ?? []
  const findPlanet = (name: string) => planets.find((p) => p.name === name)
  const nameOf = (p: { name: string; ko: string }): string => (lang === 'en' ? p.name : p.ko)

  // 양쪽 행성이 존재하는 어스펙트만 — 가장 정확한(orb 작은) 순으로.
  const aspects = (astro.aspects ?? [])
    .map((a) => ({ a, pa: findPlanet(a.a), pb: findPlanet(a.b) }))
    .filter((x) => x.pa != null && x.pb != null)
    .sort((x, y) => x.a.orb - y.a.orb)

  const dignities = astro.dignities ?? []

  return (
    <details className={s.box}>
      <summary>{summary}</summary>
      <div className={s.body}>
        {/* ── 행성 간 각도 ── */}
        <section className={s.section}>
          <div className={s.subcap}>{aspectsCap}</div>
          <div className={s.list}>
            {aspects.map(({ a, pa, pb }, i) => {
              if (!pa || !pb) return null
              const meta = ASPECT_META[a.type]
              const friendly = ASPECT_FRIENDLY[a.type]
              const aspGlyph = meta?.glyph ?? ''
              const aspLabel = friendly?.label[lang] ?? meta?.ko ?? a.type
              const meaning = friendly?.tooltip[lang] ?? aspectHover(a.type, lang)
              return (
                <div className={s.row} key={`${a.a}-${a.b}-${a.type}-${i}`}>
                  <div className={s.head}>
                    <span className={s.gly}>{pa.glyph}</span>
                    <span className={s.name}>{nameOf(pa)}</span>
                    {aspGlyph && <span className={s.aspGly}>{aspGlyph}</span>}
                    <span className={`${s.label} ${toneClass(meta?.cls)}`}>{aspLabel}</span>
                    <span className={s.gly}>{pb.glyph}</span>
                    <span className={s.name}>{nameOf(pb)}</span>
                    <span className={s.orb}>{a.orb.toFixed(1)}°</span>
                  </div>
                  {meaning && <div className={s.meaning}>{meaning}</div>}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 행성 위계 ── */}
        <section className={s.section}>
          <div className={s.subcap}>{dignityCap}</div>
          <div className={s.list}>
            {dignities.length === 0 && <div className={s.empty}>{noDignity}</div>}
            {dignities.map((d, i) => {
              const p = findPlanet(d.planet)
              const tier =
                DIGNITY_TIER_FRIENDLY[d.tier]?.[lang] ??
                DIGNITY_TIER_LABEL[d.tier]?.[lang] ??
                d.tier
              const signKey = abbr(d.sign)
              const signName = SIGN_META[signKey] ? signLabel(signKey, lang) : d.sign
              const meaning = [
                DIGNITY_TIER_TOOLTIP[d.tier]?.[lang],
                dignityHover(d.planet, d.tier, lang),
              ]
                .filter(Boolean)
                .join(' — ')
              return (
                <div className={s.row} key={`${d.planet}-${d.tier}-${i}`}>
                  <div className={s.head}>
                    {p && <span className={s.gly}>{p.glyph}</span>}
                    <span className={s.name}>{p ? nameOf(p) : d.planet}</span>
                    <span className={s.sign}>
                      {signName}
                      {signSuffix}
                    </span>
                    <span className={`${s.label} ${s.neutral}`}>{tier}</span>
                  </div>
                  {meaning && <div className={s.meaning}>{meaning}</div>}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </details>
  )
}
