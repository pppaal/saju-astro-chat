'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import type { I18nMessages } from '@/i18n/utils'
import { ParticleCanvas } from './components'
import PrefetchLinks from '@/components/PrefetchLinks'
import SideDrawer from './components/SideDrawer'
import HomeChatInput from './components/HomeChatInput'
import RecommendationChips from './components/RecommendationChips'
import BirthInfoModal from './components/BirthInfoModal'
import { getStoredBirthInfo, saveBirthInfo, type StoredBirthInfo } from './birthInfoStorage'

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

export default function MainPageClient({ initialLocale }: MainPageClientProps) {
  const { locale: activeLocale, setLocale } = useI18n()
  const locale = (activeLocale || initialLocale) as Locale
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }
  const nextLocaleLabel = locale === 'ko' ? 'EN' : 'KO'
  const localeAriaLabel = locale === 'ko' ? 'Switch to English' : '한국어로 전환'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const [birthInfo, setBirthInfo] = useState<StoredBirthInfo | null>(null)

  // Hydrate birth info from localStorage after mount.
  useEffect(() => {
    setBirthInfo(getStoredBirthInfo())
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
            birthDate?: string | null
            birthTime?: string | null
            gender?: 'male' | 'female' | 'other' | 'prefer_not' | null
            birthCity?: string | null
          }
        }
        const remote = data.user
        const remoteHasFull =
          !!remote?.birthDate &&
          !!remote?.birthTime &&
          (remote?.gender === 'male' || remote?.gender === 'female')

        if (remoteHasFull) {
          const next: StoredBirthInfo = {
            birthDate: remote!.birthDate!,
            birthTime: remote!.birthTime!,
            gender: remote!.gender as 'male' | 'female',
            city: remote!.birthCity || undefined,
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

  const handleSaved = (info: StoredBirthInfo) => {
    setBirthInfo(info)
    setBirthModalOpen(false)
  }

  return (
    <main className={`${styles.container} ${styles.homeContainer}`}>
      <ParticleCanvas />

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
            ✦
          </div>
          <h1 id="home-headline" className={styles.homeHeadline}>
            {locale === 'ko' ? 'AI와 사주·점성을 함께 풀어드려요' : 'Saju × Astrology, fused by AI'}
          </h1>
          <p className={styles.homeSubline}>
            {locale === 'ko'
              ? '사주 · 점성 · 캘린더 · 타로 · 궁합'
              : 'Saju · Astrology · Calendar · Tarot · Compatibility'}
          </p>
        </section>

        <button
          type="button"
          className={styles.homeBirthCta}
          onClick={() => setBirthModalOpen(true)}
          aria-label={
            birthInfo
              ? locale === 'ko'
                ? '사주 정보 수정'
                : 'Edit birth info'
              : locale === 'ko'
                ? '사주 정보 입력하기'
                : 'Enter birth info'
          }
        >
          <span className={styles.homeBirthCtaIcon} aria-hidden="true">
            {birthInfo ? '✓' : '✦'}
          </span>
          <span className={styles.homeBirthCtaText}>
            {birthInfo ? (
              <>
                <strong>
                  {birthInfo.birthDate} · {birthInfo.birthTime} ·{' '}
                  {birthInfo.gender === 'male'
                    ? locale === 'ko'
                      ? '남성'
                      : 'Male'
                    : locale === 'ko'
                      ? '여성'
                      : 'Female'}
                </strong>
                <span className={styles.homeBirthCtaHint}>
                  {locale === 'ko' ? '수정하기' : 'Edit'}
                </span>
              </>
            ) : (
              <>
                <strong>
                  {locale === 'ko'
                    ? '사주 정보 입력하고 시작하기'
                    : 'Add your birth info to start'}
                </strong>
                <span className={styles.homeBirthCtaHint}>
                  {locale === 'ko'
                    ? '로그인 없이 저장돼요. 로그인하면 기기 간 동기화'
                    : 'Saved without login. Synced after sign-in'}
                </span>
              </>
            )}
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <RecommendationChips
          birthInfo={birthInfo}
          locale={locale}
        />

        <HomeChatInput
          birthInfo={birthInfo}
          onOpenBirthModal={() => setBirthModalOpen(true)}
          locale={locale}
        />
      </div>

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale}
      />

      <BirthInfoModal
        open={birthModalOpen}
        initial={birthInfo}
        onClose={() => setBirthModalOpen(false)}
        onSaved={handleSaved}
      />

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
