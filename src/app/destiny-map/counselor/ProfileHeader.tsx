'use client'

import { useMemo } from 'react'
import styles from './ProfileHeader.module.css'
import type { SajuData, AstroData } from '@/components/destiny-map/chat-types'

interface ProfileHeaderProps {
  name?: string
  birthDate?: string
  birthTime?: string
  birthTimeUnknown?: boolean
  city?: string
  gender?: string
  saju?: SajuData
  astro?: AstroData
  lang?: 'ko' | 'en'
}

const ZODIAC_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
}

function getZodiacFromDate(birthDate?: string): string | null {
  if (!birthDate) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  const cutoffs: Array<[number, number, string]> = [
    [1, 19, 'Capricorn'],
    [2, 18, 'Aquarius'],
    [3, 20, 'Pisces'],
    [4, 19, 'Aries'],
    [5, 20, 'Taurus'],
    [6, 20, 'Gemini'],
    [7, 22, 'Cancer'],
    [8, 22, 'Leo'],
    [9, 22, 'Virgo'],
    [10, 22, 'Libra'],
    [11, 21, 'Scorpio'],
    [12, 21, 'Sagittarius'],
  ]
  for (const [cMonth, cDay, sign] of cutoffs) {
    if (month < cMonth || (month === cMonth && day <= cDay)) {
      return sign
    }
  }
  return 'Capricorn'
}

function formatBirthLine(
  birthDate?: string,
  birthTime?: string,
  birthTimeUnknown?: boolean,
  lang?: 'ko' | 'en'
): string {
  if (!birthDate) return ''
  const parts: string[] = [birthDate]
  if (birthTimeUnknown) {
    parts.push(lang === 'en' ? 'time unknown' : '시간 모름')
  } else if (birthTime) {
    parts.push(birthTime)
  }
  return parts.join(' · ')
}

function formatGender(gender?: string, lang?: 'ko' | 'en'): string {
  if (!gender) return ''
  const isKo = lang !== 'en'
  const g = gender.toLowerCase()
  if (g === 'female' || g === 'f') return isKo ? '여성' : 'Female'
  if (g === 'male' || g === 'm') return isKo ? '남성' : 'Male'
  return gender
}

export default function ProfileHeader({
  name,
  birthDate,
  birthTime,
  birthTimeUnknown,
  city,
  gender,
  saju,
  astro,
  lang = 'ko',
}: ProfileHeaderProps) {
  const isKo = lang !== 'en'

  const ilju = useMemo(() => {
    const dp = saju?.dayPillar
    if (!dp) return null
    const stemRaw = (dp as { stem?: unknown; heavenlyStem?: unknown }).stem
    const branchRaw = (dp as { branch?: unknown; earthlyBranch?: unknown }).branch
    const stem =
      typeof stemRaw === 'string'
        ? stemRaw
        : ((dp as { heavenlyStem?: { name?: string } }).heavenlyStem?.name ?? '')
    const branch =
      typeof branchRaw === 'string'
        ? branchRaw
        : ((dp as { earthlyBranch?: { name?: string } }).earthlyBranch?.name ?? '')
    const combined = `${stem}${branch}`.trim()
    return combined || null
  }, [saju])

  const zodiacEn = useMemo(() => {
    return astro?.sunSign || getZodiacFromDate(birthDate)
  }, [astro?.sunSign, birthDate])
  const zodiacLabel = zodiacEn ? (isKo ? ZODIAC_KO[zodiacEn] || zodiacEn : zodiacEn) : null
  const zodiacEmoji = zodiacEn ? ZODIAC_EMOJI[zodiacEn] || '✨' : null

  const birthLine = formatBirthLine(birthDate, birthTime, birthTimeUnknown, lang)
  const genderLabel = formatGender(gender, lang)
  const displayName = name || (isKo ? '나' : 'Me')

  if (!birthDate) {
    return null
  }

  return (
    <div
      className={styles.profileHeader}
      aria-label={isKo ? '내 프로필 요약' : 'My profile summary'}
    >
      <div className={styles.row}>
        <span className={styles.name}>{displayName}</span>
        {genderLabel && <span className={styles.meta}>{genderLabel}</span>}
      </div>
      <div className={styles.row}>
        <span className={styles.meta}>{birthLine}</span>
        {city && <span className={styles.meta}>· {city}</span>}
      </div>
      {(ilju || zodiacLabel) && (
        <div className={styles.tags}>
          {ilju && (
            <span className={styles.tag}>
              <span className={styles.tagLabel}>{isKo ? '일주' : 'Day Pillar'}</span>
              <span className={styles.tagValue}>{ilju}</span>
            </span>
          )}
          {zodiacLabel && (
            <span className={styles.tag}>
              <span className={styles.tagLabel}>{isKo ? '별자리' : 'Zodiac'}</span>
              <span className={styles.tagValue}>
                {zodiacEmoji && <span aria-hidden="true">{zodiacEmoji} </span>}
                {zodiacLabel}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
