'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import type { I18nMessages } from '@/i18n/utils'
import { ParticleCanvas } from './components'
import PrefetchLinks from '@/components/PrefetchLinks'
import { MenuDrawerPanel } from '@/components/ui/MenuDrawerPanel'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import HomeChatInput from './components/HomeChatInput'
import BirthInfoModal from './components/BirthInfoModal'
import {
  getStoredBirthInfo,
  saveBirthInfo,
  buildCounselorHref,
  buildReportBirthQuery,
  type StoredBirthInfo,
} from './birthInfoStorage'
import { parseHourMinute } from '@/lib/saju/timeParse'
import HexDPLogo from '@/components/branding/HexDPLogo'
import { AppHeader, AppHeaderIconButton } from '@/components/ui/AppHeader'

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

// 생년월일 칩 표기 — "1995년 2월 9일 6:40am (남)". 시는 앞 0 없이(4am), 분만
// 2자리(4:05am). (이전엔 HomeChatInput 안에 있었으나 칩을 상단 바로 빼면서 이동.)
function formatSubject(info: StoredBirthInfo, isKo: boolean): string {
  const [y, m, d] = info.birthDate.split('-').map((n) => parseInt(n, 10))
  const datePart = isKo
    ? `${y}년 ${m}월 ${d}일`
    : `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  let timePart = ''
  if (!info.birthTimeUnknown && info.birthTime && info.birthTime !== '00:00') {
    // SSOT 파서 — birthTime 이 'HH:MM PM' 으로 들어와도 24h 로 정규화(split 직접
    // 파싱은 PM 보정을 못 해 표시가 12시간 어긋난다).
    const { h: hh, m: mm } = parseHourMinute(info.birthTime)
    const ampm = hh < 12 ? 'am' : 'pm'
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    timePart = ` ${h12}:${String(mm).padStart(2, '0')}${ampm}`
  }
  const g = info.gender === 'male' ? (isKo ? '남' : 'M') : isKo ? '여' : 'F'
  return `${datePart}${timePart} (${g})`
}

// 생일 딥링크 — /integrated-report·/calendar·/destiny 모두 date/time/lat/lng/tz/
// gender 쿼리를 읽어 로그인 없이 그 사람 기준으로 빌드한다(상담사의 birthDate/
// birthTime 키와 다름). 저장된 생일이 있으면 그 사람 걸로, 없으면 파라미터 없이
// 보내 페이지가 샘플 출생정보로 폴백한다.
function buildBirthHref(base: string, info: StoredBirthInfo | null, locale: Locale): string {
  // 리포트/캘린더/운명 페이지가 읽는 쿼리 스키마(date/time/lat/lng/tz/gender).
  // BirthGate 리다이렉트와 동일 헬퍼를 써 두 경로가 어긋나지 않게 한다.
  return `${base}?${buildReportBirthQuery(info, locale)}`
}

// 메인에 바로 노출하는 리포트들 — 전부 로그인 없이 열람 가능. birthLink 가 true 면
// 저장된 생일을 date/time/lat/lng/tz/gender 쿼리로 실어 그 사람 기준으로 연다
// (없으면 페이지가 샘플로 폴백). 궁합은 자체 입력 폼이라 파라미터 없이 링크.
type MoreService = {
  href: string
  birthLink?: boolean // true 면 buildBirthHref 로 생일 쿼리를 붙인다
  icon: string
  tint: string // 서비스별 강조 색 — 아이콘 타일 배경 + 호버 테두리/글로우
  title: { ko: string; en: string }
  desc: { ko: string; en: string }
  free?: boolean
}
const MORE_SERVICES: readonly MoreService[] = [
  {
    href: '/tarot',
    icon: '🔮',
    tint: '#a855f7',
    title: { ko: '타로 상담사', en: 'Tarot Counselor' },
    desc: { ko: '타로 카드 리딩', en: 'Tarot card reading' },
  },
  {
    href: '/compatibility',
    icon: '💬',
    tint: '#f472b6',
    title: { ko: '궁합 상담사', en: 'Compatibility Counselor' },
    desc: { ko: '관계 궁합 상담', en: 'Relationship counsel' },
  },
  {
    href: '/compatibility/free',
    icon: '💕',
    tint: '#ec4899',
    title: { ko: '궁합 리포트', en: 'Compatibility Report' },
    desc: { ko: '두 사람 궁합 풀이', en: 'Two-person match' },
  },
  {
    href: '/integrated-report',
    birthLink: true,
    icon: '📜',
    tint: '#e8cc8a',
    title: { ko: '사주·점성 리포트', en: 'Saju · Astrology Report' },
    desc: { ko: '사주·별자리 통합 풀이', en: 'Saju + astrology' },
  },
  {
    href: '/calendar',
    birthLink: true,
    icon: '🗓️',
    tint: '#38bdf8',
    title: { ko: '운흐름 캘린더', en: 'Fortune Calendar' },
    desc: { ko: '하루·한 달 운세 타이밍', en: 'Daily · monthly timing' },
  },
  {
    href: '/destiny',
    birthLink: true,
    icon: '🌌',
    tint: '#8b9dff',
    title: { ko: '인생 흐름', en: 'Life Flow' },
    desc: { ko: '인생·대운·올해 큰 흐름', en: 'Life · decades · year' },
  },
]

export default function MainPageClient({ initialLocale }: MainPageClientProps) {
  const { locale: activeLocale, setLocale } = useI18n()
  const locale = (activeLocale || initialLocale) as Locale
  const { status } = useSession()
  const isAuthed = status === 'authenticated'
  const router = useRouter()

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }
  const nextLocaleLabel = locale === 'ko' ? 'EN' : 'KO'
  const localeAriaLabel = locale === 'ko' ? 'Switch to English' : '한국어로 전환'

  const [drawerOpen, setDrawerOpen] = useState(false)
  // 리포트 목록은 메인에 바로 보이게 기본 펼침(로그인 없이 다 이용 가능).
  const [servicesOpen, setServicesOpen] = useState(true)
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const [birthInfo, setBirthInfo] = useState<StoredBirthInfo | null>(null)
  // 생일 없이 운명상담사 질문을 던졌으면 그 질문을 여기 담아두고, 생일 저장
  // 직후 운명상담사로 이동시킨다. (메인 = 운명상담사 한 흐름이라 service 분기 X)
  const pendingQuestionRef = useRef<string | null>(null)

  // Hydrate birth info from localStorage after mount. Also auto-open
  // the modal when a service redirected here with `?openBirth=1` so the
  // user can fill in once and return.
  useEffect(() => {
    setBirthInfo(getStoredBirthInfo())
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('openBirth') === '1') setBirthModalOpen(true)
  }, [])

  // Lock the page to the viewport — the home is a single-screen UI and
  // any scroll on body/html (URL bar collapse, overscroll bounce, etc.)
  // clips the bottom controls. On very short viewports (small phones,
  // landscape, in-app browsers with large bottom UI) the CSS releases
  // the lock and the body becomes scrollable; mirror that here so the
  // JS overflow hint matches the layout and the user can reach the
  // chat bar. Restore on unmount so other routes scroll normally.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow

    const shortViewport = window.matchMedia(
      '(max-height: 620px), (orientation: landscape) and (max-height: 500px)'
    )
    const apply = () => {
      const next = shortViewport.matches ? '' : 'hidden'
      document.body.style.overflow = next
      document.documentElement.style.overflow = next
    }
    apply()
    shortViewport.addEventListener('change', apply)

    return () => {
      shortViewport.removeEventListener('change', apply)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  // Sync birth info between server profile and localStorage once the
  // session is authenticated. Server wins if it already has full info;
  // otherwise we push the local values up so the next device can read
  // them on login.
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
          // 서버 프로필이 birthCity + tzId 와 함께 lat/lon 도 저장하므로 그걸
          // 우선 사용. 서버에 좌표가 없을 때만 localStorage 시드를 보존한다
          // (이전엔 항상 localPrev 만 써서 저장된 도시 좌표가 안 따라오던 회귀).
          const localPrev = getStoredBirthInfo()
          const next: StoredBirthInfo = {
            // 이전엔 name 이 빠져 있었음 — 메인페이지에서 모달 열면 이름 칸
            // 비어 있는 원인. 서버 프로필의 User.name 을 그대로 전파한다.
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
        // Network/parse failures shouldn't block the home page.
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [isAuthed])

  // 생일 없이 운명상담사 질문을 던진 경우 — 질문을 기억하고 생일 모달을 띄운다.
  const handleRequireBirth = (question: string) => {
    pendingQuestionRef.current = question
    setBirthModalOpen(true)
  }

  // 입력/수정용으로 생일 모달만 열기 — 저장 후 자동 이동 없이 메인에 머문다.
  const handleOpenBirth = () => {
    pendingQuestionRef.current = null
    setBirthModalOpen(true)
  }

  // 저장된 생년월일 삭제 — 상태를 비우고 모달을 닫는다. 대기 중이던 질문도
  // 취소(생일이 없어졌으니 이동할 수 없음).
  const handleDeleted = () => {
    pendingQuestionRef.current = null
    setBirthInfo(null)
    setBirthModalOpen(false)
  }

  const handleSaved = (info: StoredBirthInfo) => {
    setBirthInfo(info)
    setBirthModalOpen(false)
    // 저장만 하면 isPremiumWhite = isAuthed || !!birthInfo 에서 즉시 흰 모드.
    // (sessionStorage flag 필요 없음 — birthInfo state 가 directly trigger.)
    if (typeof window === 'undefined') return

    // 생일 입력이 운명상담사 질문에서 시작됐다면, 방금 저장한 정보 + 그 질문
    // 으로 채팅 페이지에 직행 — 질문이 그대로 전달돼 자동으로 답변이 생성됨.
    const pendingQuestion = pendingQuestionRef.current
    pendingQuestionRef.current = null
    if (pendingQuestion !== null) {
      router.push(buildCounselorHref(info, pendingQuestion, locale))
      return
    }

    const sp = new URLSearchParams(window.location.search)
    const next = sp.get('next')
    // 같은 사이트 내부 경로만 허용 — 프로토콜상대(//evil.com)·백슬래시(/\evil.com)
    // 변종은 startsWith('/') 를 통과해 외부로 튕기는 오픈 리다이렉트가 된다.
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
      window.location.assign(next)
    }
  }

  // Flip from the cosmic dark hero ("brand" surface) to the premium-white
  // "product" surface when the visitor is signed in OR has a saved
  // birth info in localStorage. Logged-out visitors without saved birth
  // see the cosmic surface; saved-birth visitors stay on white.
  // (Earlier session-only logic was buggy on logout — see history.)
  const isPremiumWhite = isAuthed || !!birthInfo

  return (
    <motion.main
      className={`${styles.container} ${styles.homeContainer} ${
        isPremiumWhite ? styles.lightMode : ''
      }`}
      animate={{
        backgroundColor: isPremiumWhite ? '#fafaf9' : '#07091a',
        color: isPremiumWhite ? '#1c1917' : '#ffffff',
      }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      {/* Dark cosmic gradient layer — fades out when premium-white kicks
          in. Kept as a separate layer because CSS gradients don't
          interpolate smoothly between values; opacity transitions do. */}
      <AnimatePresence>
        {!isPremiumWhite && (
          <motion.div
            key="cosmic-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className={styles.cosmicBackdrop}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Subtle purple halo for the premium-white state — same vibe as
          the counselor result pages' accent. */}
      <AnimatePresence>
        {isPremiumWhite && (
          <motion.div
            key="light-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className={styles.lightHalo}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: isPremiumWhite ? 0 : 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ pointerEvents: isPremiumWhite ? 'none' : 'auto' }}
      >
        <ParticleCanvas />
      </motion.div>

      <AppHeader
        layout="home"
        theme={isPremiumWhite ? 'light' : 'cosmic'}
        onMenuClick={() => setDrawerOpen(true)}
        menuLabel={locale === 'ko' ? '메뉴 열기' : 'Open menu'}
        centerSlot="DestinyPal"
        rightSlot={
          <AppHeaderIconButton onClick={toggleLocale} label={localeAriaLabel} isText>
            {nextLocaleLabel}
          </AppHeaderIconButton>
        }
        viewTransitionName="app-topbar"
      />

      <div className={styles.homeBody}>
        <section className={styles.homeHero} aria-labelledby="home-headline">
          <div className={styles.homeOrnament} aria-hidden="true">
            <HexDPLogo size={72} />
          </div>
          <h1 id="home-headline" className={styles.homeHeadline}>
            {locale === 'ko'
              ? 'AI가 풀어내는 당신의 운명'
              : 'Your Tarot, Astrology & Korean Saju, Powered by AI'}
          </h1>
          <p className={styles.homeSubline}>
            {locale === 'ko'
              ? '생년월일을 입력하고, 궁금한 점을 자유롭게 물어보세요'
              : 'Enter your birth details, then ask anything'}
          </p>
        </section>

        {/* 생년월일 — 입력창 안 칩에서 상단(히어로 아래)으로 분리. 항상 보이게
            둬서 "먼저 생년월일부터" 흐름이 명확하다. 저장 전엔 CTA, 저장 후엔
            요약 칩(탭하면 수정 모달). */}
        <div className={styles.homeBirthBar}>
          {birthInfo ? (
            <button
              type="button"
              className={styles.homeBirthChip}
              onClick={handleOpenBirth}
              aria-label={locale === 'ko' ? '생년월일 정보 수정' : 'Edit birth info'}
            >
              {locale === 'ko' ? '상담자: ' : 'Client: '}
              {formatSubject(birthInfo, locale === 'ko')}
              <span className={styles.homeBirthChipEdit}>
                {locale === 'ko' ? '정보 변경' : 'Edit'}
              </span>
            </button>
          ) : (
            <button type="button" className={styles.homeBirthCta} onClick={handleOpenBirth}>
              <span aria-hidden="true">📅</span>
              {locale === 'ko'
                ? '먼저 생년월일을 입력하세요'
                : 'Start by entering your birth details'}
            </button>
          )}
        </div>

        {/* 리포트 — 생년월일 바로 아래. 궁합·사주점성·캘린더·인생흐름(+타로)이
            메인에 바로 보이게 기본 펼침(전부 로그인 없이 열람). 버튼으로 접을 수도
            있다. birthLink 항목은 저장된 생일을 쿼리로 실어 그 사람 기준으로 연다. */}
        <div className={styles.homeMoreWrap}>
          <button
            type="button"
            className={styles.homeServiceMore}
            onClick={() => setServicesOpen((o) => !o)}
            aria-expanded={servicesOpen}
          >
            {locale === 'ko' ? '리포트 둘러보기' : 'Explore readings'}
            <span
              className={`${styles.homeServiceMoreChevron} ${
                servicesOpen ? styles.homeServiceMoreChevronOpen : ''
              }`}
              aria-hidden="true"
            >
              ›
            </span>
          </button>

          <AnimatePresence initial={false}>
            {servicesOpen && (
              <motion.ul
                className={styles.homeServiceDropList}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {MORE_SERVICES.map((s, i) => {
                  const href = s.birthLink ? buildBirthHref(s.href, birthInfo, locale) : s.href
                  return (
                    <motion.li
                      key={s.href}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + i * 0.05 } }}
                    >
                      <Link
                        href={href}
                        className={styles.homeServiceDropItem}
                        style={{ '--svc-tint': s.tint } as CSSProperties}
                        prefetch={false}
                        onClick={() => setServicesOpen(false)}
                      >
                        <span className={styles.homeServiceDropIcon} aria-hidden="true">
                          {s.icon}
                        </span>
                        <span className={styles.homeServiceDropText}>
                          <span className={styles.homeServiceDropTitle}>
                            {s.title[locale]}
                            {s.free && <span className={styles.homeServiceFreeBadge}>FREE</span>}
                          </span>
                          <span className={styles.homeServiceDropDesc}>{s.desc[locale]}</span>
                        </span>
                        <span className={styles.homeServiceDropArrow} aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <HomeChatInput
          birthInfo={birthInfo}
          onRequireBirth={handleRequireBirth}
          onOpenBirth={handleOpenBirth}
          locale={locale}
          lightMode={isPremiumWhite}
        />
      </div>

      <MenuDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale}
        variant={isPremiumWhite ? 'light' : 'dark'}
      />

      <BirthInfoModal
        open={birthModalOpen}
        initial={birthInfo}
        onClose={() => setBirthModalOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        locale={locale}
      />

      {/* PWA 설치 안내 — 생일 입력 후 (= 한 번 써본) 사용자에게만 노출.
          Chrome 계열: 네이티브 다이얼로그. iOS Safari: "공유 → 홈 화면 추가"
          가이드. Firefox / in-app webview / 이미 설치된 PWA 는 자동으로 미노출. */}
      <PWAInstallPrompt locale={locale} />

      <PrefetchLinks />
      <SpeedInsights />
    </motion.main>
  )
}
