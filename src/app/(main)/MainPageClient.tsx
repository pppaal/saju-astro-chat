'use client'

/**
 * v9.2 홈(/) — 스크롤하는 종이 문서 한 장.
 *
 * 순서: 내비 · 폴리오(샘플 스탬프) · 히어로(H1 #home-headline · CTA · 판독 띠) · 샘플 사주 카드 ·
 * 상담사 CTA(오너 결정 1) · 둘러보기 · '리딩은 이렇게 만들어져요' 먹 띠(교차 행 · 60갑자
 * 다이얼 · 출처 줄) · 까치 · 폴리오 · 푸터.
 *
 * 남긴 것: 출생 정보 모달, 로그인 사용자 프로필 동기화, ?openBirth=1 자동 열기, 같은 사이트
 * ?next= 복귀, 삭제 처리, SpeedInsights · PWA 설치 안내 · PrefetchLinks.
 * 카드는 샘플(SAMPLE_CARD — 엔진이 만든 체크인 값)이고, 뒷면 세운과 다이얼은 서버가 보는 사람의
 * 날짜로 만든 모델을 그대로 그린다(시계를 읽지 않는다).
 */

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import PrefetchLinks from '@/components/PrefetchLinks'
import { MenuDrawerPanel } from '@/components/ui/MenuDrawerPanel'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import BirthInfoModal from '@/components/birth/BirthInfoModal'
import SajuCard from '@/components/v9/SajuCard'
import Folio from '@/components/v9/Folio'
import PriceLine from '@/components/v9/PriceLine'
import V9Footer from '@/components/v9/V9Footer'
import { PROVENANCE, pick } from '@/components/v9/v9Copy'
import {
  getStoredBirthInfo,
  saveBirthInfo,
  buildReportBirthQuery,
  type StoredBirthInfo,
} from '@/lib/birth/storage'
import { formatBirthStamp } from '@/lib/birth/format'
import { safeNextPath } from '@/lib/security/safeNext'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { shareDomain } from '@/lib/share/site'
import type { Lang } from '@/lib/i18n/bi'
import type { DialModel } from '@/lib/v9/sixtyDial'
import HomeNav from './home/HomeNav'
import HomeHero from './home/HomeHero'
import HomeExplore from './home/HomeExplore'
import HomeBand from './home/HomeBand'
import HomeMagpie from './home/HomeMagpie'
import { HOME_COPY } from './home/homeCopy'
import { counselorHref, type ExploreRow } from './home/exploreRows'
import { SAMPLE_BAND, SAMPLE_BIRTH, SAMPLE_CARD } from './home/sampleCard'
import s from './home/home-v9.module.css'

interface MainPageClientProps {
  initialLocale: Lang
  /** 60갑자 다이얼 — 서버(homeDial)가 보는 사람의 날짜로 만든 언어별 모델. */
  dial: Record<Lang, DialModel>
  /** 카드 뒷면 세운 — 다이얼 가운데와 같은 해. */
  backYear: { ganji: string; year: number }
}

/** 출생 모달을 연 까닭 — 저장 뒤 동작이 갈린다. */
type BirthIntent = 'cta' | 'edit' | null

function reportHrefFor(info: StoredBirthInfo, locale: Lang): string {
  return `/integrated-report?${buildReportBirthQuery(info, locale)}`
}

export default function MainPageClient({ initialLocale, dial, backYear }: MainPageClientProps) {
  const { locale: activeLocale, setLocale } = useI18n()
  const locale: Lang = (activeLocale || initialLocale) === 'ko' ? 'ko' : 'en'
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const router = useRouter()

  const [drawer, setDrawer] = useState<{ open: boolean; login: boolean }>({
    open: false,
    login: false,
  })
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const [birthInfo, setBirthInfo] = useState<StoredBirthInfo | null>(null)
  const intentRef = useRef<BirthIntent>(null)

  // 저장된 출생 정보는 마운트 뒤 localStorage 에서 읽는다. 서비스가 ?openBirth=1 로
  // 돌려보냈으면 모달을 바로 연다(한 번 입력하고 돌아가게).
  useEffect(() => {
    setBirthInfo(getStoredBirthInfo())
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('openBirth') === '1') setBirthModalOpen(true)
  }, [])

  // 로그인 세션이면 서버 프로필과 localStorage 를 맞춘다. 서버에 완전한 정보가 있으면 서버가
  // 이기고, 없으면 로컬 값을 올려 다음 기기에서 읽게 한다.
  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false

    const sync = async () => {
      try {
        const res = await fetch('/api/me/profile', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          user?: {
            name?: string | null
            birthDate?: string | null
            birthTime?: string | null
            gender?: 'male' | 'female' | 'other' | 'prefer_not' | null
            birthCity?: string | null
            latitude?: number | null
            longitude?: number | null
            tzId?: string | null
          }
        }
        const remote = data.user
        const remoteHasFull =
          !!remote?.birthDate &&
          !!remote?.birthTime &&
          (remote?.gender === 'male' || remote?.gender === 'female')

        if (remoteHasFull) {
          // 서버 프로필의 좌표·tz 를 우선 쓰고, 서버에 없을 때만 localStorage 값을 보존한다.
          const localPrev = getStoredBirthInfo()
          const next: StoredBirthInfo = {
            name: remote!.name || undefined,
            birthDate: remote!.birthDate!,
            birthTime: remote!.birthTime!,
            gender: remote!.gender as 'male' | 'female',
            city: remote!.birthCity || undefined,
            timeZone: remote!.tzId || localPrev?.timeZone,
            latitude: remote!.latitude ?? localPrev?.latitude,
            longitude: remote!.longitude ?? localPrev?.longitude,
            savedAt: new Date().toISOString(),
          }
          saveBirthInfo(next)
          if (!cancelled) setBirthInfo(next)
          return
        }

        const local = getStoredBirthInfo()
        if (!local) return
        await fetch('/api/me/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate: local.birthDate,
            birthTime: local.birthTime,
            gender: local.gender,
            birthCity: local.city || null,
            tzId: local.timeZone || null,
          }),
        })
      } catch {
        // 네트워크·파싱 실패가 홈을 막지 않는다.
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [isAuthed])

  const toggleLocale = () => setLocale(locale === 'ko' ? 'en' : 'ko')

  const openBirth = (intent: BirthIntent) => {
    intentRef.current = intent
    setBirthModalOpen(true)
  }

  // 손님 CTA — 무료 사주 카드 받기.
  const handleCta = () => {
    trackFunnel('home.cta_clicked')
    openBirth('cta')
  }

  const handleDeleted = () => {
    intentRef.current = null
    setBirthInfo(null)
    setBirthModalOpen(false)
  }

  const handleSaved = (info: StoredBirthInfo) => {
    const hadBirth = birthInfo !== null
    const intent = intentRef.current
    intentRef.current = null
    setBirthInfo(info)
    setBirthModalOpen(false)
    if (!hadBirth) trackFunnel('home.birth_saved')
    if (typeof window === 'undefined') return

    // 다른 서비스가 ?next= 로 보냈으면 그리로 돌아간다(같은 사이트 경로만).
    const next = safeNextPath(
      new URLSearchParams(window.location.search).get('next'),
      window.location.origin
    )
    if (next) {
      window.location.assign(next)
      return
    }
    // CTA 에서 시작한 저장 → 그 사람의 전체 카드(리포트). 수정은 홈에 머문다.
    if (intent === 'cta') router.push(reportHrefFor(info, locale))
  }

  const handleExploreClick = (row: ExploreRow) => trackFunnel(row.event)

  const sampleStamp = formatBirthStamp(
    {
      birthDate: SAMPLE_BIRTH.date,
      birthTime: SAMPLE_BIRTH.time,
      birthTimeUnknown: SAMPLE_BIRTH.timeUnknown,
      city: pick(HOME_COPY.sampleCity, locale),
    },
    locale
  )
  const saved = birthInfo
    ? { stamp: formatBirthStamp(birthInfo, locale), reportHref: reportHrefFor(birthInfo, locale) }
    : null

  return (
    <main className={[s.page, locale === 'ko' ? s.ko : ''].filter(Boolean).join(' ')}>
      <HomeNav
        locale={locale}
        isAuthed={isAuthed}
        onToggleLocale={toggleLocale}
        onSignIn={() => {
          trackFunnel('home.signin_clicked')
          setDrawer({ open: true, login: true })
        }}
        onMenu={() => setDrawer({ open: true, login: false })}
      />
      <Folio
        stamp={sampleStamp}
        right={pick(PROVENANCE.sample, locale)}
        locale={locale}
        className={s.folio}
      />

      <div className={s.top}>
        <HomeHero
          locale={locale}
          saved={saved}
          onCta={handleCta}
          onOpenReport={() => trackFunnel('home.cta_clicked')}
          onEditBirth={() => openBirth('edit')}
        />
        <section className={s.well} aria-labelledby="home-card">
          <div className={s.stage}>
            <div className={s.fit}>
              <SajuCard data={{ ...SAMPLE_CARD, backYear }} variant="full" locale={locale} />
            </div>
          </div>
          <div className={s.wcap}>
            <span id="home-card" className={s.eyebrow}>
              {pick(HOME_COPY.cardEyebrow, locale)}
            </span>
            <p className={s.cap}>{pick(HOME_COPY.cardCaption, locale)}</p>
          </div>
        </section>
      </div>

      {/* 오너 결정 1 — 고정 입력창 대신 카드 바로 다음의 유료 상담사 진입. */}
      <div className={s.counsel}>
        <Link
          href={counselorHref(birthInfo, locale)}
          className={`${s.btn} ${s.line}`}
          prefetch={false}
          onClick={() => trackFunnel('home.counselor_cta')}
          data-home-counselor=""
        >
          {pick(HOME_COPY.counselorCta, locale)}
        </Link>
        <PriceLine
          locale={locale}
          cost={CREDIT_COSTS.counselorTurn}
          showLink={false}
          className={s.price}
        />
      </div>

      <HomeExplore locale={locale} birthInfo={birthInfo} onRowClick={handleExploreClick} />

      <HomeBand
        locale={locale}
        dial={dial[locale]}
        timing={SAMPLE_BAND.timing}
        traits={SAMPLE_BAND.traits[locale]}
      />

      <HomeMagpie locale={locale} />

      <Folio
        stamp={sampleStamp}
        right={shareDomain()}
        position="end"
        locale={locale}
        className={s.folio}
      />
      <V9Footer locale={locale} className={s.foot} />

      <MenuDrawerPanel
        open={drawer.open}
        initialLoginOpen={drawer.login}
        onClose={() => setDrawer({ open: false, login: false })}
        locale={locale}
        variant="light"
      />

      <BirthInfoModal
        open={birthModalOpen}
        initial={birthInfo}
        onClose={() => setBirthModalOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        locale={locale}
      />

      {/* PWA 설치 안내 — 생일 입력 후(= 한 번 써 본) 사용자에게만. */}
      <PWAInstallPrompt locale={locale} />

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
