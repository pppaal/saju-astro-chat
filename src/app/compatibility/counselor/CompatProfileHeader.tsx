'use client'

import styles from './CompatProfileHeader.module.css'

export interface CompatPerson {
  name?: string
  date?: string
  time?: string
  city?: string
  gender?: string
  relation?: string
}

interface CompatProfileHeaderProps {
  personA: CompatPerson | null
  personB: CompatPerson | null
  sajuA?: Record<string, unknown> | null
  sajuB?: Record<string, unknown> | null
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

function extractIlju(saju?: Record<string, unknown> | null): string | null {
  if (!saju) return null
  const dp = (saju as { dayPillar?: unknown }).dayPillar as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  if (!dp) return null
  const stem = dp.heavenlyStem?.name ?? ''
  const branch = dp.earthlyBranch?.name ?? ''
  const combined = `${stem}${branch}`.trim()
  return combined || null
}

function formatGender(gender?: string, isKo?: boolean): string {
  if (!gender) return ''
  const g = gender.toLowerCase()
  if (g === 'female' || g === 'f') return isKo ? '여성' : 'Female'
  if (g === 'male' || g === 'm') return isKo ? '남성' : 'Male'
  return gender
}

function PersonCard({
  person,
  saju,
  isKo,
  align,
  fallbackLabel,
}: {
  person: CompatPerson | null
  saju?: Record<string, unknown> | null
  isKo: boolean
  align: 'start' | 'end'
  fallbackLabel: string
}) {
  if (!person) {
    return (
      <div className={`${styles.card} ${align === 'end' ? styles.cardRight : styles.cardLeft}`}>
        <div className={styles.name}>{fallbackLabel}</div>
        <div className={styles.meta}>{isKo ? '정보 미입력' : 'No info'}</div>
      </div>
    )
  }
  const ilju = extractIlju(saju)
  const zodiacEn = getZodiacFromDate(person.date)
  const zodiacLabel = zodiacEn ? (isKo ? ZODIAC_KO[zodiacEn] || zodiacEn : zodiacEn) : null
  const zodiacEmoji = zodiacEn ? ZODIAC_EMOJI[zodiacEn] || '✨' : null
  const birthLine = [person.date, person.time].filter(Boolean).join(' · ')
  const genderLabel = formatGender(person.gender, isKo)

  return (
    <div className={`${styles.card} ${align === 'end' ? styles.cardRight : styles.cardLeft}`}>
      <div className={styles.name}>{person.name || fallbackLabel}</div>
      {(birthLine || genderLabel) && (
        <div className={styles.meta}>
          {birthLine}
          {genderLabel && (birthLine ? ` · ${genderLabel}` : genderLabel)}
        </div>
      )}
      {person.city && <div className={styles.meta}>{person.city}</div>}
      {(ilju || zodiacLabel) && (
        <div className={styles.tags}>
          {ilju && (
            <span className={styles.tag}>
              <span className={styles.tagLabel}>{isKo ? '일주' : 'Day'}</span>
              <span className={styles.tagValue}>{ilju}</span>
            </span>
          )}
          {zodiacLabel && (
            <span className={styles.tag}>
              {zodiacEmoji && <span aria-hidden="true">{zodiacEmoji}</span>}
              <span className={styles.tagValue}>{zodiacLabel}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function CompatProfileHeader({
  personA,
  personB,
  sajuA,
  sajuB,
  lang = 'ko',
}: CompatProfileHeaderProps) {
  const isKo = lang !== 'en'
  return (
    <div className={styles.wrap} aria-label={isKo ? '궁합 인물 정보' : 'Compatibility pair'}>
      <PersonCard
        person={personA}
        saju={sajuA}
        isKo={isKo}
        align="start"
        fallbackLabel={isKo ? '나' : 'Person 1'}
      />
      <div className={styles.heartCol}>
        <span className={styles.heart} aria-hidden="true">
          💖
        </span>
      </div>
      <PersonCard
        person={personB}
        saju={sajuB}
        isKo={isKo}
        align="end"
        fallbackLabel={isKo ? '상대' : 'Person 2'}
      />
    </div>
  )
}
