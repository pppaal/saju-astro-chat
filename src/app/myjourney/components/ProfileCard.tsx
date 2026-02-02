'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import type { Fortune, Credits, Profile } from '../types'

interface ProfileCardProps {
  styles: Record<string, string>
  session: { user?: { name?: string | null; image?: string | null } } | null
  profile: Profile
  credits: Credits | null
  fortune: Fortune | null
  fortuneLoading: boolean
  handleCreditsClick: () => void
  handleEditProfile: () => void
  handleReloadProfile: () => void
  isReloadingProfile: boolean
  onPhotoUpdate: (photoUrl: string) => void
  t: (key: string, fallback?: string) => string
}

export function ProfileCard({
  styles,
  session,
  profile,
  credits,
  fortune,
  fortuneLoading,
  handleCreditsClick,
  handleEditProfile,
  handleReloadProfile,
  isReloadingProfile,
  onPhotoUpdate,
  t,
}: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      alert(t('myjourney.profile.invalidFileType', 'Please upload a JPG, PNG, or WebP image'))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('myjourney.profile.fileTooLarge', 'File size must be less than 5MB'))
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onPhotoUpdate(data.photoUrl)
      } else {
        const error = await res.json()
        alert(error.message || t('myjourney.profile.uploadFailed', 'Failed to upload photo'))
      }
    } catch (err) {
      logger.error('Photo upload error:', err instanceof Error ? err : new Error(String(err)))
      alert(t('myjourney.profile.uploadError', 'An error occurred while uploading'))
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Use profilePhoto if available, otherwise fallback to OAuth image
  const displayImage = profile.profilePhoto || session?.user?.image
  return (
    <div className={styles.profileCard}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div className={styles.profileLeft}>
        <div
          className={styles.profileAvatarWrapper}
          onClick={handlePhotoClick}
          style={{ position: 'relative', cursor: 'pointer' }}
          title={t('myjourney.profile.changePhoto', 'Click to change photo')}
        >
          {displayImage ? (
            <Image
              src={displayImage}
              alt=""
              width={48}
              height={48}
              className={styles.profileAvatar}
              style={{ opacity: uploading ? 0.5 : 1 }}
            />
          ) : (
            <div className={styles.profileAvatarPlaceholder}>
              {(session?.user?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          {uploading && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '24px',
              }}
            >
              ⏳
            </div>
          )}
          <div
            className={styles.profileAvatarOverlay}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
          >
            <span style={{ fontSize: '20px' }}>📷</span>
          </div>
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.profileNameRow}>
            <h2>{session?.user?.name || 'User'}</h2>
            <div className={styles.profileActions}>
              <button
                className={styles.profileActionBtn}
                onClick={handleEditProfile}
                title={t('myjourney.profile.edit', 'Edit')}
              >
                {'\u270F\uFE0F'}
              </button>
              <button
                className={`${styles.profileActionBtn} ${isReloadingProfile ? styles.profileActionBtnSpinning : ''}`}
                onClick={handleReloadProfile}
                disabled={isReloadingProfile}
                title={t('myjourney.profile.reload', 'Reload')}
              >
                {'\uD83D\uDD04'}
              </button>
            </div>
          </div>
          {credits && (
            <div className={styles.membershipRow}>
              <div
                className={`${styles.planBadge} ${styles[`plan${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)}`]}`}
              >
                <span className={styles.planIcon}>
                  {credits.plan === 'free'
                    ? '\uD83C\uDD93'
                    : credits.plan === 'starter'
                      ? '\u2B50'
                      : credits.plan === 'pro'
                        ? '\uD83D\uDC8E'
                        : '\uD83D\uDC51'}
                </span>
                <span className={styles.planName}>
                  {t(`myjourney.plan.${credits.plan}`, credits.plan.toUpperCase())}
                </span>
              </div>
              <div className={styles.creditsBadge} onClick={handleCreditsClick}>
                <span className={styles.creditsCount}>{credits.remaining}</span>
                <span className={styles.creditsLabel}>
                  {t('myjourney.credits.short', 'credits')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Fortune Orb */}
      <div
        className={styles.fortuneOrb}
        title={t('myjourney.fortune.orbTooltip', "Today's Overall Fortune")}
        aria-label={
          fortune
            ? `${t('myjourney.fortune.orbTooltip', "Today's Overall Fortune")}: ${fortune.overall}`
            : undefined
        }
      >
        {fortuneLoading ? (
          <div className={styles.orbLoading}></div>
        ) : fortune ? (
          <>
            <span className={styles.orbScore}>{fortune.overall}</span>
            <span className={styles.orbLabel}>{t('myjourney.fortune.today', 'Today')}</span>
          </>
        ) : (
          <span className={styles.orbEmpty}>?</span>
        )}
      </div>
    </div>
  )
}
