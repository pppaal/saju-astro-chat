/**
 * §03 보조 — 점성 12하우스(삶의 영역)를 한 칸씩 평이하게 풀어 설명.
 * 하우스 의미는 지금까지 툴팁(houseHover)으로만 노출됐다. 여기서는
 * getHouseRich 의 name/domain 을 본문으로 펼치고, 각 하우스 커스프 사인과
 * 그 하우스에 들어온 행성(planets + extraPoints)을 함께 보여준다.
 * 펼침형(details) 기본 접힘.
 *
 * EN 출력에는 한글을 절대 내보내지 않는다(점성 사인 glyph 는 허용).
 *
 * 주의: houses[].sign 은 이미 3자 약어(SIGN_META 키)라 SIGN_META[h.sign] 로 바로
 * 룩업한다(IntegratedReport 의 s.houses 렌더와 동일). 반면 planets[].sign 은
 * 풀네임이라 abbr() 로 약어 변환 후 룩업한다.
 */

import { SIGN_META, type ReportData } from '../reportTypes'
import { signLabel, elClass, type Lang } from '../integratedReportLabels'
import { getHouseRich, type HouseNumber } from '@/lib/chart-dictionary'
import s from './HouseDetail.module.css'

export interface HouseDetailProps {
  astro: ReportData['astro']
  lang: Lang
}

const HOUSE_NUMS: HouseNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// 빈 하우스 안내 문구 — 모든 빈 칸이 똑같은 한 줄로 반복되지 않도록
// 몇 가지로 돌려 쓴다(표시용 텍스트만, 데이터·로직과 무관).
const EMPTY_NOTE_KO = [
  '비어 있음 — 자연스러운 일이에요. 강조점은 행성이 들어온 하우스에서 나와요.',
  '비어 있음 — 특별히 걱정할 일은 아니에요. 이 영역은 조용히 흘러가는 편이에요.',
  '비어 있음 — 행성이 없다고 의미가 없는 건 아니에요. 다른 하우스가 더 또렷하게 작동해요.',
]
const EMPTY_NOTE_EN = [
  'Empty — a normal, quiet area; the emphasis comes from occupied houses.',
  'Empty — nothing to worry about; this area tends to run smoothly in the background.',
  'Empty — an empty house still matters; other houses simply speak more clearly here.',
]

export default function HouseDetail({ astro, lang }: HouseDetailProps) {
  const en = lang === 'en'
  if (!astro) return null

  // planets + extraPoints 를 하나의 점유 목록으로 합친다.
  const occupants = [...(astro.planets ?? []), ...(astro.extraPoints ?? [])]

  return (
    <details className={s.box}>
      <summary>{en ? 'The 12 houses (life areas)' : '12하우스 — 삶의 영역 풀이'}</summary>
      <div className={s.body}>
        {HOUSE_NUMS.map((i) => {
          const rich = getHouseRich(i, lang)
          const cusp = astro.houses?.find((h) => h.i === i)
          const signKey = cusp?.sign
          const meta = signKey ? SIGN_META[signKey] : undefined
          const here = occupants.filter((p) => p.house === i)

          return (
            <div className={s.item} key={i}>
              <div className={s.head}>
                <span className={s.num}>{i}H</span>
                {rich && <span className={s.name}>{rich.name}</span>}
                {meta && (
                  <span className={`${s.cusp} ${elClass[meta.el] ?? ''}`}>
                    <span className={s.glyph}>{meta.glyph}</span>
                    <span>{signLabel(signKey as string, lang)}</span>
                  </span>
                )}
              </div>

              {rich && <p className={s.domain}>{rich.domain}</p>}

              {i === 1 && (
                <p className={s.ascNote}>
                  {en
                    ? '1st house — your sense of self and first impression (the Ascendant).'
                    : '1하우스 — 나 자신과 첫인상을 보여주는 자리예요(상승궁).'}
                </p>
              )}

              {here.length > 0 ? (
                <div className={s.planets}>
                  {here.map((p) => (
                    <span className={s.planet} key={p.name}>
                      <span className={s.glyph}>{p.glyph}</span>
                      <span>{en ? p.name : p.ko}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={s.empty}>{(en ? EMPTY_NOTE_EN : EMPTY_NOTE_KO)[i % 3]}</p>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}
