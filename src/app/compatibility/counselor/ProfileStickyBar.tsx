'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './compatibility-counselor.module.css'
import { getRecentPairs, type RecentPair } from '@/app/compatibility/lib'
import type { PersonData } from './types'

/**
 * 헤더 sticky 바 — 클릭하면 최근 본 페어 popover 가 열려서 다른 관계로
 * 즉시 전환할 수 있다. 현재 페어는 popover 에서 제외 (이미 보고 있음).
 * "다른 사람으로 보기" 항목은 인라인 인물 피커(CompatPersonPickerModal)를
 * 열어 채팅을 떠나지 않고 새 커플로 전환한다.
 */
export function ProfileStickyBar({
  persons,
  isKo,
  onSwitchPair,
  onPickOther,
}: {
  persons: PersonData[]
  isKo: boolean
  onSwitchPair: (pair: RecentPair) => void
  onPickOther: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pairs, setPairs] = useState<RecentPair[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setPairs(getRecentPairs())
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 현재 페어와 같은 항목은 popover 에서 제외 — 자기 자신으로 전환은 의미 X.
  const currentKey = `${persons[0]?.name?.trim()}|${persons[0]?.date}|${persons[1]?.name?.trim()}|${persons[1]?.date}`
  const otherPairs = pairs.filter(
    (p) =>
      `${p.persons[0].name.trim()}|${p.persons[0].date}|${p.persons[1].name.trim()}|${p.persons[1].date}` !==
      currentKey
  )

  return (
    <div ref={wrapperRef} className={styles.profileStickyBarWrap}>
      <button
        type="button"
        className={styles.profileStickyBar}
        onClick={() => setOpen((o) => !o)}
        aria-label={isKo ? '대상 인물 — 다른 관계로 전환' : 'Subjects — switch relationship'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.profileStickyName}>{persons[0].name}</span>
        <span className={styles.profileStickyArrow} aria-hidden="true">
          ↔
        </span>
        <span className={styles.profileStickyName}>{persons[1].name}</span>
        <span className={styles.profileStickyChevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div role="menu" className={styles.profileStickyDropdown}>
          {otherPairs.length > 0 && (
            <>
              <div className={styles.profileStickyDropdownLabel}>
                {isKo ? '최근 본 관계' : 'Recent relationships'}
              </div>
              {otherPairs.map((pair, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="menuitem"
                  className={styles.profileStickyDropdownItem}
                  onClick={() => {
                    setOpen(false)
                    onSwitchPair(pair)
                  }}
                >
                  <span className={styles.profileStickyName}>{pair.persons[0].name}</span>
                  <span className={styles.profileStickyArrow} aria-hidden="true">
                    ↔
                  </span>
                  <span className={styles.profileStickyName}>{pair.persons[1].name}</span>
                </button>
              ))}
              <div className={styles.profileStickyDropdownDivider} />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className={styles.profileStickyDropdownItem}
            onClick={() => {
              setOpen(false)
              onPickOther()
            }}
          >
            {isKo ? '+ 다른 사람으로 보기' : '+ Pick someone else'}
          </button>
        </div>
      )}
    </div>
  )
}
