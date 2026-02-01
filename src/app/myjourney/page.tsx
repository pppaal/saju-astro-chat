'use client'

import { useSession } from 'next-auth/react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './myjourney.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'

import { useMyJourneyData } from './useMyJourneyData'
import { ProfileCard } from './components/ProfileCard'
import { ProfileEditor } from './components/ProfileEditor'
import { FortuneCard } from './components/FortuneCard'
import { RecentActivity } from './components/RecentActivity'

export default function MyJourneyClient() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MyJourneyPage />
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner}></div>
    </div>
  )
}

function MyJourneyPage() {
  const { t, locale } = useI18n()
  const { data: session, status } = useSession()
  const router = useRouter()
  const search = useSearchParams()
  const signInUrl = buildSignInUrl('/myjourney?from=oauth')

  const {
    profile,
    fortune,
    fortuneLoading,
    recentHistory,
    historyLoading,
    expandedDays,
    credits,
    initialLoading,
    isEditingProfile,
    editedProfile,
    setEditedProfile,
    isSavingProfile,
    isReloadingProfile,
    goBack,
    handleCreditsClick,
    toggleDayExpanded,
    handleEditProfile,
    handleCancelEdit,
    handleSaveProfile,
    handleReloadProfile,
  } = useMyJourneyData({
    session,
    status,
    router,
    searchParams: search,
    signInUrl,
  })

  if (
    status === 'loading' ||
    status === 'unauthenticated' ||
    (status === 'authenticated' && initialLoading)
  ) {
    return <LoadingScreen />
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={goBack}>
          {'\u2190'}
        </button>
        <h1 className={styles.logo}>{t('myjourney.title', 'My Journey')}</h1>
      </header>

      {/* ========== LOGGED IN - DASHBOARD ========== */}
      <div className={styles.dashboard}>
        {/* Unified Profile + Credits + Fortune Header */}
        <ProfileCard
          styles={styles}
          session={session}
          credits={credits}
          fortune={fortune}
          fortuneLoading={fortuneLoading}
          handleCreditsClick={handleCreditsClick}
          handleEditProfile={handleEditProfile}
          handleReloadProfile={handleReloadProfile}
          isReloadingProfile={isReloadingProfile}
          t={t}
        />

        {/* Profile Information Card with Inline Editing */}
        <ProfileEditor
          styles={styles}
          profile={profile}
          isEditingProfile={isEditingProfile}
          editedProfile={editedProfile}
          setEditedProfile={setEditedProfile}
          isSavingProfile={isSavingProfile}
          handleEditProfile={handleEditProfile}
          handleCancelEdit={handleCancelEdit}
          handleSaveProfile={handleSaveProfile}
          t={t}
        />

        {/* Today's Fortune Card */}
        <FortuneCard
          styles={styles}
          fortune={fortune}
          fortuneLoading={fortuneLoading}
          profile={profile}
          onSetupProfile={handleEditProfile}
          t={t}
        />

        {/* Quick Menu Grid */}
        <div className={styles.quickMenu}>
          <button className={styles.quickMenuItem} onClick={handleEditProfile}>
            <span className={styles.quickMenuIcon}>{'\uD83D\uDC64'}</span>
            <span>{t('myjourney.menu.profile', 'Profile')}</span>
          </button>
          <Link href="/myjourney/circle" className={styles.quickMenuItem}>
            <span className={styles.quickMenuIcon}>{'\uD83D\uDC65'}</span>
            <span>{t('myjourney.menu.circle', 'Circle')}</span>
          </Link>
          <Link href="/myjourney/history" className={styles.quickMenuItem}>
            <span className={styles.quickMenuIcon}>{'\uD83D\uDCDC'}</span>
            <span>{t('myjourney.menu.history', 'History')}</span>
          </Link>
          <Link href="/pricing" className={styles.quickMenuItem}>
            <span className={styles.quickMenuIcon}>{'\u2728'}</span>
            <span>{t('myjourney.menu.upgrade', 'Upgrade')}</span>
          </Link>
        </div>

        {/* Recent Activity */}
        <RecentActivity
          styles={styles}
          recentHistory={recentHistory}
          historyLoading={historyLoading}
          expandedDays={expandedDays}
          toggleDayExpanded={toggleDayExpanded}
          t={t}
          locale={locale}
        />
      </div>
    </main>
  )
}
