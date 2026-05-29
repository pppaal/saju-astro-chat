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
import HomeChatInput, { type HomeServiceId } from './components/HomeChatInput'
import BirthInfoModal from './components/BirthInfoModal'
import {
  getStoredBirthInfo,
  saveBirthInfo,
  buildCounselorHref,
  type StoredBirthInfo,
} from './birthInfoStorage'
import HexDPLogo from '@/components/branding/HexDPLogo'

type Locale = 'en' | 'ko'

// The premium-white surface trigger is scoped to the current tab session
// (sessionStorage), NOT localStorage. Birth data still persists across
// visits for the chat, but the surface decision must not: otherwise a
// returning logged-out visitor stays stuck on white forever from a stale
// birth-info cache instead of seeing the cosmic brand surface again.
const HOME_WHITE_SESSION_KEY = 'dp:home-white'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
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
  // 생일 없이 궁합·운명상담사를 고르면 그 의도를 여기 담아두고, 생일 저장
  // 직후 해당 서비스로 이동시킨다.
  const pendingServiceRef = useRef<{ service: HomeServiceId; question: string } | null>(null)
  // Whether birth info was entered during THIS tab session — drives the
  // premium-white surface (see HOME_WHITE_SESSION_KEY).
  const [birthEnteredThisSession, setBirthEnteredThisSession] = useState(false)

  // Hydrate birth info from localStorage after mount. Also auto-open
  // the modal when a service redirected here with `?openBirth=1` so the
  // user can fill in once and return.
  useEffect(() => {
    setBirthInfo(getStoredBirthInfo())
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(HOME_WHITE_SESSION_KEY) === '1') {
      setBirthEnteredThisSession(true)
    }
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

  // 생일 없이 궁합·운명상담사를 고른 경우 — 의도를 기억하고 모달을 띄운다.
  const handleRequireBirth = (service: HomeServiceId, question: string) => {
    pendingServiceRef.current = { service, question }
    setBirthModalOpen(true)
  }

  // 입력/수정용으로 생일 모달만 열기 — 저장 후 자동 이동 없이 메인에 머문다.
  const handleOpenBirth = () => {
    pendingServiceRef.current = null
    setBirthModalOpen(true)
  }

  const handleSaved = (info: StoredBirthInfo) => {
    setBirthInfo(info)
    setBirthModalOpen(false)
    // Entering birth info this session flips the home to the premium-white
    // surface (and remembers it for the rest of the tab session).
    setBirthEnteredThisSession(true)
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(HOME_WHITE_SESSION_KEY, '1')
    } catch {
      // sessionStorage can throw (private mode / blocked) — non-fatal.
    }

    // 생일 입력이 어떤 서비스 선택에서 시작됐다면, 방금 저장한 정보로
    // 그 서비스로 바로 이동한다.
    const pending = pendingServiceRef.current
    pendingServiceRef.current = null
    if (pending) {
      if (pending.service === 'compatibility') {
        router.push('/compatibility')
        return
      }
      if (pending.service === 'destinyMap') {
        // 채팅 페이지로 직행 — 질문이 그대로 전달돼 자동으로 답변이 생성된다.
        router.push(buildCounselorHref(info, pending.question, locale))
        return
      }
    }

    const sp = new URLSearchParams(window.location.search)
    const next = sp.get('next')
    if (next && next.startsWith('/')) window.location.assign(next)
  }

  // Flip from the cosmic dark hero ("brand" surface) to the premium-white
  // "product" surface once the visitor is signed in OR has entered birth
  // info during THIS tab session. Scoped to the session (not the
  // persisted birthInfo) so a returning logged-out visitor with cached
  // birth data still gets the brand surface instead of being stuck on
  // white forever.
  const isPremiumWhite = isAuthed || birthEnteredThisSession

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

      <div className={styles.homeTopBar}>
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
              ? '궁금한 점을 적고, 원하는 상담을 선택해 보세요'
              : 'Type your question, then choose a reading'}
          </p>
        </section>

        <HomeChatInput
          birthInfo={birthInfo}
          onRequireBirth={handleRequireBirth}
          onOpenBirth={handleOpenBirth}
          locale={locale}
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
        locale={locale}
      />

      <PrefetchLinks />
      <SpeedInsights />
    </motion.main>
  )
}
