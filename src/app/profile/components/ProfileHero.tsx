'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, LogOut, Pencil } from 'lucide-react'
import { clearClientCacheAndSignOut } from '@/lib/auth/clearClientCache'
import { logger } from '@/lib/logger'
import { type Locale, type MeProfile, ghostBtnCls, inkBtnCls, serifStyle } from './profileShared'

interface Props {
  profile: MeProfile | null
  locale: Locale
  /** 사진 URL / 이름 저장 성공 시 부모의 profile state 에 반영 */
  onProfileChange: (patch: Partial<MeProfile>) => void
}

// 히어로 영역 — 프로필 사진(업로드), 이름(인라인 편집), 이메일, 로그아웃.
// 업로드/이름 편집 상태는 모두 이 컴포넌트 지역 상태.
export function ProfileHero({ profile, locale, onProfileChange }: Props) {
  const { data: session, update: updateSession } = useSession()

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoProgress, setPhotoProgress] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = '' // 같은 파일 재선택 가능하게
    if (!file) return

    const userId = session?.user?.id
    if (!userId) {
      setPhotoError(locale === 'ko' ? '로그인이 필요합니다.' : 'Login required.')
      return
    }

    setPhotoError(null)
    setPhotoUploading(true)
    setPhotoProgress(0)
    try {
      // FormData 로 서버 라우트에 전송. 서버가 NextAuth 세션 확인 후
      // Vercel Blob 으로 putString. CORS/Firebase 규칙 우회.
      const form = new FormData()
      form.append('file', file)
      // 브라우저 fetch 는 XHR/Streams API 진행률을 노출하지 않아 정확한
      // 퍼센티지 표시가 어려워 indeterminate (50%) 만 표시.
      setPhotoProgress(50)
      const res = await fetch('/api/me/upload-photo', {
        method: 'POST',
        body: form,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          json?.error?.message ||
          json?.error?.code ||
          (locale === 'ko' ? '업로드에 실패했어요.' : 'Upload failed.')
        throw new Error(String(msg))
      }
      const data = (json?.data ?? json) as { url?: string }
      const url = data?.url
      if (!url) throw new Error('No URL returned')

      const saveRes = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      })
      if (!saveRes.ok) {
        throw new Error('save_failed')
      }
      onProfileChange({ image: url })
    } catch (err) {
      logger.warn('[profile/photo] upload failed', err)
      setPhotoError(
        err instanceof Error && err.message !== 'save_failed' && err.message !== 'No URL returned'
          ? err.message
          : locale === 'ko'
            ? '사진 업로드에 실패했어요. 다시 시도해 주세요.'
            : 'Photo upload failed. Please try again.'
      )
    } finally {
      setPhotoUploading(false)
      setPhotoProgress(0)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = nameDraft.trim()
    if (!next) {
      setNameError(locale === 'ko' ? '이름을 입력해 주세요.' : 'Please enter a name.')
      return
    }
    setNameError(null)
    setSavingName(true)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      })
      if (res.ok) {
        onProfileChange({ name: next })
        // 햄버거 등 useSession 으로 name 읽는 컴포넌트에 즉시 반영
        // (next-auth JWT trigger='update' → jwt 콜백 → 다음 useSession 갱신).
        try {
          await updateSession({ name: next })
        } catch (err) {
          logger.warn('[profile] session update failed', err)
        }
        setEditingName(false)
      } else {
        setNameError(
          locale === 'ko'
            ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
            : 'Save failed. Please try again in a moment.'
        )
      }
    } catch (err) {
      logger.warn('[profile] name save failed', err)
      setNameError(
        locale === 'ko'
          ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Save failed. Please try again in a moment.'
      )
    } finally {
      setSavingName(false)
    }
  }

  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        disabled={photoUploading}
        className="relative rounded-full bg-gradient-to-br from-[#d8b878] to-[#a07a3c] p-[2px] shadow-[0_10px_30px_rgba(160,122,60,0.22)] disabled:cursor-default"
        aria-label={locale === 'ko' ? '프로필 사진 변경' : 'Change profile photo'}
        title={locale === 'ko' ? '프로필 사진 변경' : 'Change profile photo'}
      >
        {profile?.image ? (
          <Image
            src={profile.image}
            alt={profile.name || 'User'}
            width={128}
            height={128}
            /* 강제 128×128 정사각 + object-cover — 어떤 비율의 사진이
               올라와도 자르면서 채워 정원형 유지. */
            className="block h-[128px] w-[128px] rounded-full border-2 border-white object-cover"
          />
        ) : (
          <div
            className="flex h-[128px] w-[128px] items-center justify-center rounded-full border-2 border-white bg-white text-[2.2rem] font-semibold text-[#1c1917]"
            style={serifStyle}
          >
            {profile?.name?.[0]?.toUpperCase() || '·'}
          </div>
        )}
        {photoUploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-sm font-medium text-white">
            {photoProgress > 0
              ? `${photoProgress}%`
              : locale === 'ko'
                ? '업로드 중…'
                : 'Uploading…'}
          </span>
        ) : (
          <span className="absolute bottom-0.5 right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#1c1917] text-white shadow">
            <Camera className="h-4 w-4" />
          </span>
        )}
      </button>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      {photoError && <p className="text-[12px] text-red-600">{photoError}</p>}
      <div>
        {editingName ? (
          <form
            onSubmit={(e) => void handleNameSubmit(e)}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value)
                if (nameError) setNameError(null)
              }}
              maxLength={40}
              aria-label={locale === 'ko' ? '이름' : 'Name'}
              aria-invalid={nameError ? true : undefined}
              placeholder={locale === 'ko' ? '이름' : 'Name'}
              className="w-[12ch] rounded-lg border border-[#d8b878] bg-white px-2 py-1 text-center text-[1.4rem] font-semibold text-[#1c1917] outline-none"
            />
            <button type="submit" disabled={savingName} className={inkBtnCls}>
              {savingName
                ? locale === 'ko'
                  ? '저장 중…'
                  : 'Saving…'
                : locale === 'ko'
                  ? '저장'
                  : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false)
                setNameError(null)
              }}
              className={ghostBtnCls}
            >
              {locale === 'ko' ? '취소' : 'Cancel'}
            </button>
            {nameError && (
              <p className="basis-full text-center text-[12px] text-red-600" role="alert">
                {nameError}
              </p>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(profile?.name || '')
              setNameError(null)
              setEditingName(true)
            }}
            className="group inline-flex items-center gap-1.5"
            title={locale === 'ko' ? '이름 수정' : 'Edit name'}
          >
            <h1
              className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.01em] text-[#1c1917]"
              style={serifStyle}
            >
              {profile?.name || (locale === 'ko' ? '이름을 알려주세요' : 'Set your name')}
            </h1>
            <Pencil className="h-3.5 w-3.5 text-[#a8a29e] opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
        {profile?.email && <p className="mt-1.5 text-[13px] text-[#8b857d]">{profile.email}</p>}
        <button
          type="button"
          onClick={() => void clearClientCacheAndSignOut(() => signOut({ callbackUrl: '/' }))}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e0ddd7] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#78716c] transition hover:border-[#c9c4bc] hover:text-[#1c1917]"
        >
          <LogOut className="h-3.5 w-3.5" />
          {locale === 'ko' ? '로그아웃' : 'Log out'}
        </button>
      </div>
    </header>
  )
}
