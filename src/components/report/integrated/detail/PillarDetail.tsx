/**
 * PillarDetail — 사주 네 기둥(시·일·월·년)을 글자 단위로 풀어주는 펼침 카드.
 * 초보자가 한자 천간/지지·지장간·십신·12운성의 뜻을 (title 툴팁이 아니라) 화면에
 * 직접 보도록 한다. 모든 의미 문자열은 integratedReportLabels 헬퍼에서 lang 에 맞게
 * 받아오므로 EN 에서는 한글이 누출되지 않는다(차트 표기용 한자 甲子 등은 허용).
 * 상태 없음 — native <details> 로 서버 렌더 + 모바일/접근성 친화.
 */

import type { ReportData } from '../reportTypes'
import {
  type Lang,
  elClass,
  stemEl,
  branchEl,
  hanjaHover,
  stageLabel,
  stageHover,
  sibsinLabel,
  sibsinShort,
} from '../integratedReportLabels'
import s from './PillarDetail.module.css'

export interface PillarDetailProps {
  pillars: ReportData['saju']['pillars']
  lang: Lang
}

type ReportPillar = ReportData['saju']['pillars']['day']

const COL_LABEL: Record<'hour' | 'day' | 'month' | 'year', { ko: string; en: string }> = {
  hour: { ko: '시', en: 'Hour' },
  day: { ko: '일', en: 'Day' },
  month: { ko: '월', en: 'Month' },
  year: { ko: '년', en: 'Year' },
}

const ORDER: Array<'hour' | 'day' | 'month' | 'year'> = ['hour', 'day', 'month', 'year']

const TX = {
  summary: {
    ko: '기둥별 글자 풀이 — 한자·지장간·12운성',
    en: 'Each pillar, character by character',
  },
  stem: { ko: '천간', en: 'Heavenly Stem' },
  branch: { ko: '지지', en: 'Earthly Branch' },
  hidden: { ko: '지장간', en: 'Hidden Stems' },
  sibsin: { ko: '십신', en: 'Ten Gods' },
  stage: { ko: '12운성', en: 'Twelve Stages' },
  dayMaster: { ko: '나(일간)', en: 'You (Day Master)' },
}

function tx(key: keyof typeof TX, lang: Lang): string {
  return TX[key][lang]
}

/** 한 줄 라벨 + 값. value 가 비면 렌더하지 않는다(헬퍼가 '' 반환 가능). */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowValue}>{children}</span>
    </div>
  )
}

function PillarCard({
  col,
  p,
  lang,
}: {
  col: 'hour' | 'day' | 'month' | 'year'
  p: ReportPillar
  lang: Lang
}) {
  const isDay = !!p.isDay
  const stemMeaning = hanjaHover(p.stem, lang)
  const branchMeaning = hanjaHover(p.branch, lang)

  // 지장간: 빈 의미는 건너뛴다.
  const hidden = (p.jijanggan ?? [])
    .map((j) => ({ char: j.g, meaning: hanjaHover(j.g, lang) }))
    .filter((h) => !!h.char)

  // 십신: 천간/지지 각각 라벨 + 짧은 글로스(있으면).
  const sibStem = isDay ? tx('dayMaster', lang) : sibsinLabel(p.sibsinStem, lang)
  const sibStemGloss = isDay ? '' : sibsinShort(p.sibsinStem, lang)
  const sibBranch = sibsinLabel(p.sibsinBranch, lang)
  const sibBranchGloss = sibsinShort(p.sibsinBranch, lang)

  const stageName = stageLabel(p.twelveStage, lang)
  const stageMeaning = stageHover(p.twelveStage, lang)

  const label = lang === 'en' ? COL_LABEL[col].en : COL_LABEL[col].ko

  return (
    <div className={`${s.card} ${isDay ? s.dayCard : ''}`}>
      <div className={s.cardHead}>
        <span className={s.colLabel}>{label}</span>
        {isDay ? <span className={s.dayBadge}>{tx('dayMaster', lang)}</span> : null}
      </div>

      <Row label={tx('stem', lang)}>
        <b className={`${s.han} ${elClass[stemEl(p.stem)] ?? ''}`}>{p.stem}</b>
        {stemMeaning ? <span className={s.meaning}>{stemMeaning}</span> : null}
      </Row>

      <Row label={tx('branch', lang)}>
        <b className={`${s.han} ${elClass[branchEl(p.branch)] ?? ''}`}>{p.branch}</b>
        {branchMeaning ? <span className={s.meaning}>{branchMeaning}</span> : null}
      </Row>

      {hidden.length ? (
        <Row label={tx('hidden', lang)}>
          <span className={s.hiddenList}>
            {hidden.map((h, i) => (
              <span className={s.hiddenItem} key={`${h.char}-${i}`}>
                <b className={`${s.hanSm} ${elClass[stemEl(h.char)] ?? ''}`}>{h.char}</b>
                {h.meaning ? <span className={s.meaning}>{h.meaning}</span> : null}
              </span>
            ))}
          </span>
        </Row>
      ) : null}

      {sibStem || sibBranch ? (
        <Row label={tx('sibsin', lang)}>
          <span className={s.sibList}>
            {sibStem ? (
              <span className={s.sibItem}>
                <b>{sibStem}</b>
                {sibStemGloss && sibStemGloss !== sibStem ? (
                  <span className={s.meaning}>{sibStemGloss}</span>
                ) : null}
              </span>
            ) : null}
            {sibBranch ? (
              <span className={s.sibItem}>
                <b>{sibBranch}</b>
                {sibBranchGloss && sibBranchGloss !== sibBranch ? (
                  <span className={s.meaning}>{sibBranchGloss}</span>
                ) : null}
              </span>
            ) : null}
          </span>
        </Row>
      ) : null}

      {stageName ? (
        <Row label={tx('stage', lang)}>
          <b className={s.stageName}>{stageName}</b>
          {stageMeaning ? <span className={s.meaning}>{stageMeaning}</span> : null}
        </Row>
      ) : null}
    </div>
  )
}

export default function PillarDetail({ pillars, lang }: PillarDetailProps) {
  return (
    <details className={s.box}>
      <summary>{tx('summary', lang)}</summary>
      <div className={s.body}>
        {ORDER.map((col) => (
          <PillarCard col={col} p={pillars[col]} lang={lang} key={col} />
        ))}
      </div>
    </details>
  )
}
