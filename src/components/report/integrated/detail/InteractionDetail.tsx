/**
 * §01 보조 — 신살(神煞) 칩과 합충형파(관계)의 '뜻'을 title= 툴팁이 아니라
 * 화면에 보이게 펼쳐주는 접이식 디테일. 모바일에선 hover 툴팁이 안 보이므로
 * 각 항목의 의미를 항목별 리스트로 노출한다. 자체 완결(상위 파일 미수정).
 */

import type { ReportData } from '../reportTypes'
import { relationTypeLabel, type Lang } from '../integratedReportLabels'
import { getShinsalInterpretation, type ShinsalInterpretation } from '@/lib/saju/interpretations'
import { getRelationMeaning, type RelationCategory } from '@/lib/chart-dictionary'
import s from './InteractionDetail.module.css'

export interface InteractionDetailProps {
  shinsal: ReportData['saju']['natalShinsal']
  relations: ReportData['saju']['natalRelations']
  lang: Lang
}

export default function InteractionDetail({ shinsal, relations, lang }: InteractionDetailProps) {
  const en = lang === 'en'

  // 의미가 있는 신살만 — 사전 매칭 실패(null) 건 건너뛴다.
  const shinsalRows = (shinsal ?? [])
    .map((it) => {
      const interp: ShinsalInterpretation | null = getShinsalInterpretation(it.ko as string)
      return { it, interp }
    })
    .filter(
      (r): r is { it: (typeof shinsal)[number]; interp: ShinsalInterpretation } => r.interp != null
    )

  const relationRows = (relations ?? []).map((r) => {
    const rel =
      r.category && r.pair
        ? getRelationMeaning(r.category as RelationCategory, r.pair as string, lang)
        : null
    return { r, meaning: rel?.meaning ?? '' }
  })

  return (
    <details className={s.box}>
      <summary>
        {en
          ? 'Symbolic stars & interactions, explained'
          : '타고난 기운 표식 · 글자끼리 끌림·충돌 뜻풀이'}
      </summary>
      <div className={s.body}>
        {/* ── 신살 ───────────────────────────────────────── */}
        <section>
          <div className={s.subcap}>{en ? 'Symbolic stars' : '타고난 기운 표식'}</div>
          {shinsalRows.length === 0 ? (
            <div className={s.empty}>{en ? 'none' : '없음'}</div>
          ) : (
            <ul className={s.list}>
              {shinsalRows.map(({ it, interp }, i) => {
                const name = en ? (interp.name_en ?? it.ko) : it.ko
                const pillarLabel = en ? (it.pillarEn ?? it.pillar) : it.pillar
                const where = `${pillarLabel}${it.sub ? `·${it.sub}` : ''}`
                const meaning = en
                  ? `${interp.meaning_en} ${interp.effect_en}`
                  : `${interp.meaning} ${interp.effect}`
                const toneClass = it.polarity > 0 ? s.pos : it.polarity < 0 ? s.neg : ''
                return (
                  <li className={s.item} key={i}>
                    <div className={s.head}>
                      <b className={`${s.term} ${toneClass}`}>{name}</b>
                      <span className={s.where}>{where}</span>
                    </div>
                    <p className={s.mean}>{meaning}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── 합충형파 ─────────────────────────────────────── */}
        <section>
          <div className={s.subcap}>
            {en ? 'Interactions' : '글자끼리 끌림·충돌·갈림·깨짐·해침·거슬림'}
          </div>
          {relationRows.length === 0 ? (
            <div className={s.empty}>{en ? 'none' : '없음'}</div>
          ) : (
            <ul className={s.list}>
              {relationRows.map(({ r, meaning }, i) => {
                // EN 은 r.pair(한자)만 — r.detail 은 한글 누수 위험이라 절대 안 씀.
                const pairText = en ? (r.pair ?? '') : r.detail
                const toneClass = r.tone === 'pos' ? s.pos : r.tone === 'neg' ? s.neg : ''
                return (
                  <li className={s.item} key={i}>
                    <div className={s.head}>
                      <b className={`${s.term} ${toneClass}`}>{relationTypeLabel(r.type, lang)}</b>
                      {pairText ? <span className={s.where}>{pairText}</span> : null}
                    </div>
                    {meaning ? <p className={s.mean}>{meaning}</p> : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </details>
  )
}
