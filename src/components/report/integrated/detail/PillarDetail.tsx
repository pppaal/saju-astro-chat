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
  hanjaReading,
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
    ko: '기둥별 글자 풀이 — 위·아래 글자, 숨은 기운, 생애 단계',
    en: 'Each pillar, character by character',
  },
  stem: { ko: '위 글자', en: 'Top symbol' },
  branch: { ko: '아래 글자', en: 'Bottom symbol' },
  hidden: { ko: '숨은 기운', en: 'Hidden energy' },
  sibsin: { ko: '역할', en: 'Role' },
  stage: { ko: '생애 단계', en: 'Life stage' },
  dayMaster: { ko: '나(태어난 날의 나)', en: 'You (your character)' },
}

function tx(key: keyof typeof TX, lang: Lang): string {
  return TX[key][lang]
}

/** 지장간 결 — 본기/중기/여기를 한 글자 칩으로(EN은 Main/Mid/Sub). */
const LAYER_LABEL: Record<'main' | 'mid' | 'sub', { ko: string; en: string }> = {
  main: { ko: '본', en: 'Main' },
  mid: { ko: '중', en: 'Mid' },
  sub: { ko: '여', en: 'Sub' },
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

/** 한 기둥의 글자 풀이 노출 결정 — 부모가 순수 계산해 넘긴다(렌더 중 변이 금지). */
interface ShowMeaning {
  stem: boolean
  branch: boolean
  /** p.jijanggan 순서와 1:1 정렬. */
  jij: boolean[]
}

function PillarCard({
  col,
  p,
  lang,
  show,
}: {
  col: 'hour' | 'day' | 'month' | 'year'
  p: ReportPillar
  lang: Lang
  /** 글자 풀이 중복 방지 결정 — 부모(PillarDetail)가 네 기둥을 한 번에 순수
   *  계산해 넘긴다. 예전엔 공유 Set 을 렌더 중 변이(seen.add)해 dedup 했으나,
   *  React 19 Strict Mode 의 렌더 2회 호출에서 두 번째 패스가 이미 채워진 Set 을
   *  보고 뜻 span 을 빠뜨려 하이드레이션 미스매치가 났다 → 순수 prop 으로 교체. */
  show: ShowMeaning
}) {
  const isDay = !!p.isDay
  const stemMeaning = show.stem ? hanjaHover(p.stem, lang) : ''
  const branchMeaning = show.branch ? hanjaHover(p.branch, lang) : ''

  // 지장간: 빈 의미는 건너뛰고, 이미 나온 글자는 뜻 생략. 결(본/중/여)도 함께.
  const hidden = (p.jijanggan ?? [])
    .map((j, i) => ({
      char: j.g,
      layer: j.layer,
      reading: hanjaReading(j.g, lang), // 지장간에도 음(音) 표기 — C2 누락분(L4)
      meaning: show.jij[i] ? hanjaHover(j.g, lang) : '',
    }))
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
                {LAYER_LABEL[h.layer] ? (
                  <span className={s.layerChip} data-layer={h.layer}>
                    {LAYER_LABEL[h.layer][lang]}
                  </span>
                ) : null}
                <b className={`${s.hanSm} ${elClass[stemEl(h.char)] ?? ''}`}>{h.char}</b>
                {h.reading ? <span className={s.reading}>{h.reading}</span> : null}
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
  // 네 기둥에 걸쳐 같은 한자의 글자 풀이는 처음 나올 때만 보인다. 이 dedup 은
  // 렌더 밖 순수 fold 로 한 번에 결정한다 — 자식 렌더 중 공유 Set 을 변이하면
  // (예전 방식) Strict Mode 이중 렌더에서 SSR/CSR 이 어긋난다. 순서(기둥→글자)는
  // 원래 firstSee 호출 순서(기둥별 천간→지지→지장간, ORDER 순)와 동일하게 유지.
  const globalSeen = new Set<string>()
  const takeFirst = (c: string): boolean => {
    if (!c || globalSeen.has(c)) return false
    globalSeen.add(c)
    return true
  }
  const shows: Record<string, ShowMeaning> = {}
  for (const col of ORDER) {
    const p = pillars[col]
    shows[col] = {
      stem: takeFirst(p.stem),
      branch: takeFirst(p.branch),
      jij: (p.jijanggan ?? []).map((j) => takeFirst(j.g)),
    }
  }
  return (
    <details className={s.box}>
      <summary>{tx('summary', lang)}</summary>
      <div className={s.body}>
        {ORDER.map((col) => (
          <PillarCard col={col} p={pillars[col]} lang={lang} show={shows[col]} key={col} />
        ))}
      </div>
    </details>
  )
}
