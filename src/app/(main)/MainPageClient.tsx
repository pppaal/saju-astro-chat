'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  type StoredBirthInfo,
} from './birthInfoStorage'
import HexDPLogo from '@/components/branding/HexDPLogo'

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
    const [hh, mm] = info.birthTime.split(':').map((n) => parseInt(n, 10))
    const ampm = hh < 12 ? 'am' : 'pm'
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    timePart = ` ${h12}:${String(mm).padStart(2, '0')}${ampm}`
  }
  const g = info.gender === 'male' ? (isKo ? '남' : 'M') : isKo ? '여' : 'F'
  return `${datePart}${timePart} (${g})`
}

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
            tzId?: string | null
          }
        }
        const remote = data.user
        const remoteHasFull =
          !!remote?.birthDate &&
          !!remote?.birthTime &&
          (remote?.gender === 'male' || remote?.gender === 'female')

        if (remoteHasFull) {
          // Server stores tzId + birthCity but not lat/lon. Preserve any
          // coords already in localStorage from a previous city pick so we
          // don't lose them on sync; new picks will overwrite via the modal.
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
            latitude: localPrev?.latitude,
            longitude: localPrev?.longitude,
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
    if (next && next.startsWith('/')) window.location.assign(next)
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

      <div className={styles.homeTopBar} style={{ viewTransitionName: 'app-topbar' }}>
        <button
          type="button"
          className={styles.homeTopBarHamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label={locale === 'ko' ? '메뉴 열기' : 'Open menu'}
        >
          <span className={styles.homeTopBarHamburgerBar} />
          <span className={styles.homeTopBarHamburgerBar} />
          <span className={styles.homeTopBarHamburgerBar} />
        </button>
        <span className={styles.homeTopBarLogo}>DestinyPal</span>
        <button
          type="button"
          onClick={toggleLocale}
          className={styles.homeTopBarLogin}
          aria-label={localeAriaLabel}
          title={localeAriaLabel}
        >
          {nextLocaleLabel}
        </button>
      </div>

      <div className={styles.homeBody}>
        <section className={styles.homeHero} aria-labelledby="home-headline">
          <div className={styles.homeOrnament} aria-hidden="true">
            <HexDPLogo size={72} />
          </div>
          <h1 id="home-headline" className={styles.homeHeadline}>
            {locale === 'ko' ? 'AI가 풀어내는 당신의 운명' : 'Your Destiny, Powered by AI'}
          </h1>
          <p className={styles.homeSubline}>
            {locale === 'ko'
              ? '생년월일을 입력하고, 궁금한 점을 자유롭게 물어보세요'
              : 'Enter your birth info, then ask anything'}
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
              {locale === 'ko' ? '상담자: ' : 'Subject: '}
              {formatSubject(birthInfo, locale === 'ko')}
              <span className={styles.homeBirthChipEdit}>
                {locale === 'ko' ? '정보 변경' : 'Edit'}
              </span>
            </button>
          ) : (
            <button type="button" className={styles.homeBirthCta} onClick={handleOpenBirth}>
              <span aria-hidden="true">📅</span>
              {locale === 'ko' ? '먼저 생년월일을 입력하세요' : 'Start by entering your birth date'}
            </button>
          )}
        </div>

        {/* 상담사 선택 카드 — 사주(밝은 톤)·타로(어두운 톤)·궁합(로즈) 으로 톤을
            대비. 탭하면 살짝 눌리고(whileTap) 해당 상담사 라우트로 이동(앱 전체
            View Transition 으로 부드럽게). 입력창은 운명 상담 빠른 진입으로 유지. */}
        <div className={styles.homeCounselorCards}>
          <motion.button
            type="button"
            className={`${styles.counselorCard} ${styles.counselorCardSaju}`}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            onClick={() =>
              router.push(birthInfo ? buildCounselorHref(birthInfo, '', locale) : '/destiny-counselor')
            }
          >
            <span className={styles.counselorCardIcon} aria-hidden="true">
              🔮
            </span>
            <span className={styles.counselorCardLabel}>
              {locale === 'ko' ? '운명 상담' : 'Destiny'}
            </span>
            <span className={styles.counselorCardDesc}>{locale === 'ko' ? '사주·운세' : 'Saju'}</span>
          </motion.button>

          <motion.button
            type="button"
            className={`${styles.counselorCard} ${styles.counselorCardTarot}`}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            onClick={() => router.push('/tarot')}
          >
            <span className={styles.counselorCardIcon} aria-hidden="true">
              🃏
            </span>
            <span className={styles.counselorCardLabel}>{locale === 'ko' ? '타로' : 'Tarot'}</span>
            <span className={styles.counselorCardDesc}>
              {locale === 'ko' ? '카드 리딩' : 'Card reading'}
            </span>
          </motion.button>

          <motion.button
            type="button"
            className={`${styles.counselorCard} ${styles.counselorCardCompat}`}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            onClick={() => router.push('/compatibility/counselor')}
          >
            <span className={styles.counselorCardIcon} aria-hidden="true">
              💞
            </span>
            <span className={styles.counselorCardLabel}>{locale === 'ko' ? '궁합' : 'Match'}</span>
            <span className={styles.counselorCardDesc}>
              {locale === 'ko' ? '두 사람' : 'Two people'}
            </span>
          </motion.button>
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
