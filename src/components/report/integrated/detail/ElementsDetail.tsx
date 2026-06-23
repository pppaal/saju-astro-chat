/**
 * §02 보조 — 오행 다섯 가지를 한 줄씩 초보자용으로 풀어 설명.
 * fiveElements 사전(getElementInterpretation)의 nature/deficiency 를 직접 노출해
 * "각 오행이 나에게 무슨 뜻인지" 바로 읽히게 한다. 펼침형(details) 기본 접힘.
 *
 * EN 출력에는 한글을 절대 내보내지 않는다(한자 木火土金水 표기는 허용).
 */

import { ELEMENTS, type ReportData } from '../reportTypes'
import { elementLabel, elClass, type Lang } from '../integratedReportLabels'
import { getElementInterpretation } from '@/lib/saju/interpretations'
import s from './ElementsDetail.module.css'

// 오행 사전 룩업 결과(우리가 쓰는 필드만) — IntegratedReport.tsx yongWhy 블록과 동일 패턴.
interface ElInterp {
  nature?: string
  nature_en?: string
  deficiency?: string
  deficiency_en?: string
}

const ORDER = ['wood', 'fire', 'earth', 'metal', 'water'] as const

export interface ElementsDetailProps {
  saju: ReportData['saju']
  lang: Lang
}

export default function ElementsDetail({ saju, lang }: ElementsDetailProps) {
  const en = lang === 'en'
  const fe = saju?.fiveElements
  const yong = saju?.yongsin
  if (!fe) return null

  return (
    <details className={s.box}>
      <summary>{en ? 'Five elements, one by one' : '다섯 기운 자세히'}</summary>
      <div className={s.body}>
        {ORDER.map((k) => {
          const meta = ELEMENTS[k]
          const count = fe[k] ?? 0
          const interp = getElementInterpretation((meta?.ko ?? '') as never) as ElInterp | null
          const nature = (en ? interp?.nature_en : interp?.nature) ?? ''
          const lack = (en ? interp?.deficiency_en : interp?.deficiency) ?? ''

          const isPrimary = !!yong?.primary && yong.primary === k
          const isAvoid = Array.isArray(yong?.avoid) && yong.avoid.includes(k)

          return (
            <div className={`${s.row} ${s[`el_${k}`] ?? ''}`} key={k}>
              <div className={s.head}>
                <span className={`${s.name} ${elClass[k] ?? ''}`}>
                  <span className={s.han}>{meta?.han}</span>
                  <span className={s.label}>{elementLabel(k, lang)}</span>
                </span>
                <span className={s.count}>{count}</span>
                {isPrimary && (
                  <span className={`${s.tag} ${s.tagNeed}`}>
                    {en ? 'most needed' : '가장 필요'}
                  </span>
                )}
                {isAvoid && (
                  <span className={`${s.tag} ${s.tagAvoid}`} title={en ? '' : '기신'}>
                    {en ? 'adverse' : '부담되는 기운'}
                  </span>
                )}
              </div>
              {nature && <p className={s.nature}>{nature}</p>}
              {count === 0 && (
                <p className={s.lack}>
                  {en
                    ? lack
                      ? `Missing in your chart — signs to watch: ${lack}`
                      : 'Missing in your chart.'
                    : lack
                      ? `명식에 없어요 — 살펴볼 신호: ${lack}`
                      : '명식에 없어요.'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}
