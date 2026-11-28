/**
 * 인생 흐름(/destiny) — v9.2 종이 문서. 서버가 만든 뷰모델(buildLifetimeViewModel — 순수 ·
 * 결정론)만 그린다: 이 컴포넌트와 섹션들은 아무것도 계산하지 않는다.
 *
 * 순서(디자인 life9 · FIX9b): 상단 바 → 폴리오 → 히어로 → 읽기 → 01 이번 10년의 겹침 →
 * 02 축별 교차 → 03 타고난 강점 → 04 인생 곡선 → 05 10년 시간표 → 06 전략 → 공유 → 상담사 CTA
 * → 폴리오 → 푸터. 폴리오는 화면당 두 번(상단 바 아래 · 푸터 위)만.
 *
 * 서버 컴포넌트(훅 없음) — 공유 블록(LifeShare)과 상담사 CTA 만 클라이언트.
 */

import Folio from '@/components/v9/Folio'
import V9Footer from '@/components/v9/V9Footer'
import V9TopBar from '@/components/v9/V9TopBar'
import CounselorCTA from '@/components/report/CounselorCTA'
import { pick, type ElementKey, type Lang } from '@/components/v9/v9Copy'
import type { LifetimeViewModel } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from './lifeCopy'
import LifeHero, { type LifeRiver } from './sections/LifeHero'
import LifeReading from './sections/LifeReading'
import LifeOverlap from './sections/LifeOverlap'
import LifeTraitTally from './sections/LifeTraitTally'
import LifeStrengths from './sections/LifeStrengths'
import LifeCurve from './sections/LifeCurve'
import LifeDecades from './sections/LifeDecades'
import LifeStrategy from './sections/LifeStrategy'
import LifeShare from './sections/LifeShare'
import s from './LifeFlow.module.css'

export interface LifeFlowProps {
  vm: LifetimeViewModel
  locale: Lang
  /** 일간 — 상단 칩 원판 · 히어로 일주 타일. */
  dayMaster: { stem: string; element: ElementKey }
  /** 상단 칩 — 날짜(+ 도시), 시각 없음(formatBirthStamp time:false). */
  chipStamp: string
  /** 폴리오 — 'COMPUTED · 1997.3.21 14:30 · Seoul'(formatBirthStamp). */
  folioStamp: string
  /** 폴리오 오른쪽 — 실제 사용자 'destinypal.com'. */
  folioRight: string
  /** 일주 한 줄(일주 아키타입) — 없으면 생략. */
  river: LifeRiver | null
  /** 뒤로 — 기본 '/'. */
  backHref?: string
}

export default function LifeFlow({
  vm,
  locale,
  dayMaster,
  chipStamp,
  folioStamp,
  folioRight,
  river,
  backHref = '/',
}: LifeFlowProps) {
  return (
    <div className={[s.page, locale === 'ko' ? s.ko : ''].filter(Boolean).join(' ')} lang={locale}>
      <V9TopBar
        title={pick(LIFE_COPY.title, locale)}
        locale={locale}
        backHref={backHref}
        who={{ stamp: chipStamp, dayMaster }}
        whoLabel={pick(LIFE_COPY.whoLabel, locale)}
      />
      <Folio stamp={folioStamp} right={folioRight} locale={locale} className={s.folio} />

      <main className={s.main}>
        <LifeHero hero={vm.hero} dayMaster={dayMaster} river={river} locale={locale} />
        {vm.reading ? <LifeReading reading={vm.reading} locale={locale} /> : null}
        <LifeOverlap overlap={vm.overlap} locale={locale} />
        {vm.traits ? <LifeTraitTally traits={vm.traits} locale={locale} /> : null}
        {vm.strengths ? <LifeStrengths strengths={vm.strengths} locale={locale} /> : null}
        {vm.curve ? <LifeCurve curve={vm.curve} locale={locale} /> : null}
        <LifeDecades decades={vm.decades} locale={locale} />
        {vm.strategy ? <LifeStrategy strategy={vm.strategy} locale={locale} /> : null}
        {vm.share ? (
          <LifeShare
            locale={locale}
            typeName={vm.share.typeName}
            lifeShape={vm.share.lifeShape}
            pillars={vm.share.pillars}
          />
        ) : null}
        <CounselorCTA
          lang={locale}
          variant="v9"
          className={s.cta}
          funnelEvent="destiny.counselor_cta"
          question={LIFE_COPY.counselorQuestion}
        />
      </main>

      <Folio
        stamp={folioStamp}
        right={folioRight}
        position="end"
        locale={locale}
        className={s.folio}
      />
      <V9Footer locale={locale} line={pick(LIFE_COPY.footerLine, locale)} className={s.foot} />
    </div>
  )
}
