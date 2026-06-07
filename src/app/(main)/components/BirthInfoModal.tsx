'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import styles from '../main-page.module.css'
import {
  saveBirthInfo,
  getStoredBirthInfo,
  clearBirthInfo,
  normGender,
  timeToState,
  type StoredBirthInfo,
} from '../birthInfoStorage'
import { BirthInfoFields, type BirthFieldsPatch } from '@/components/birth/BirthInfoFields'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface BirthInfoModalProps {
  open: boolean
  initial: StoredBirthInfo | null
  onClose: () => void
  onSaved: (info: StoredBirthInfo) => void
  // 저장된 생년월일을 삭제했을 때 — 부모가 상태를 비우고 모달을 닫는다.
  onDeleted?: () => void
  locale?: 'ko' | 'en'
  // false 면 내 프로필/localStorage 에 저장하지 않고 입력값만 onSaved 로 넘긴다.
  // "다른 사람으로 보기"(임시 조회)처럼 내 정체성을 덮어쓰면 안 되는 경우용.
  // 기본 true — 기존 "내 정보 저장" 동작.
  persist?: boolean
  // 헤더/버튼 카피 커스터마이즈 (예: '이 사람으로 보기').
  title?: string
  submitLabel?: string
}

interface LoadOption {
  key: string
  label: string
  sub?: string
  name: string
  birthDate: string
  birthTime: string
  timeUnknown: boolean
  gender: 'male' | 'female' | ''
  city: string
  // 출생지 좌표/타임존 — 있으면 불러오기 시 같이 복원해 "도시 다시 선택"
  // 요구 없이 바로 유효해진다. 없으면(구버전 데이터) null → 도시 재선택 안내.
  latitude?: number | null
  longitude?: number | null
  timeZone?: string | null
}

export default function BirthInfoModal({
  open,
  initial,
  onClose,
  onSaved,
  onDeleted,
  locale = 'ko',
  persist = true,
  title,
  submitLabel,
}: BirthInfoModalProps) {
  const isKo = locale === 'ko'
  const trapRef = useFocusTrap(open)
  // initial 이 안 넘어와도(메인 '생년월일 입력하세요' CTA 처럼) 저장된 내
  // 생년월일이 있으면 그걸로 폼을 채운다 — "매번 비어 보임" 회귀 fix.
  const seed = initial ?? getStoredBirthInfo()
  const [name, setName] = useState(seed?.name || '')
  const [birthDate, setBirthDate] = useState(seed?.birthDate || '')
  const [birthTime, setBirthTime] = useState(
    seed?.birthTime && seed.birthTime !== '00:00' ? seed.birthTime : ''
  )
  // Default to "time known" for new users so the time input is enabled.
  // Only mark as unknown when a prior save explicitly used the 00:00
  // placeholder or set the flag.
  const [timeUnknown, setTimeUnknown] = useState(
    seed?.birthTimeUnknown === true || seed?.birthTime === '00:00'
  )
  const [gender, setGender] = useState<'male' | 'female' | ''>(seed?.gender || '')
  const [city, setCity] = useState(seed?.city || '')
  // 사용자가 [저장하고 시작] 눌렀는데 isValid=false 일 때 어느 필드가
  // 비었는지 inline 안내. silent disabled 회귀 fix. 채우는 즉시 사라짐.
  const [missingNotice, setMissingNotice] = useState<string | null>(null)

  // Coordinates + timezone resolved from the city picker. Persisted so the
  // counselor / calendar / fortune chain can compute the hour pillar and
  // houses against the actual birth place instead of silently falling back
  // to Seoul. Reset every time the user retypes the city (see applyPatch).
  const [latitude, setLatitude] = useState<number | null>(
    typeof seed?.latitude === 'number' ? seed.latitude : null
  )
  const [longitude, setLongitude] = useState<number | null>(
    typeof seed?.longitude === 'number' ? seed.longitude : null
  )
  const [timeZone, setTimeZone] = useState<string | null>(seed?.timeZone || null)

  // 빠진 필드를 채우는 순간 안내가 사라지게. city + latitude 도 같이 — 사용자가
  // 자동완성에서 도시를 고르면 lat 가 채워지면서 안내 자동 사라짐.
  useEffect(() => {
    if (!missingNotice) return
    const stillMissing =
      !birthDate ||
      (gender !== 'male' && gender !== 'female') ||
      (!timeUnknown && !birthTime) ||
      (Boolean(city.trim()) && latitude == null)
    if (!stillMissing) setMissingNotice(null)
  }, [missingNotice, birthDate, gender, timeUnknown, birthTime, city, latitude])

  // 불러오기 — 내 정보 + 등록된 지인
  const [loadOpen, setLoadOpen] = useState(false)
  const [options, setOptions] = useState<LoadOption[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    // 즉시: 로컬 저장본이 있으면 '내 정보'를 먼저 노출해 "불러오기" 버튼이
    // 네트워크(프로필/지인)를 기다리지 않고 바로 뜨게 한다. 아래 collect 가
    // DB 프로필·지인으로 enrich/replace.
    const localSeed = getStoredBirthInfo()
    if (localSeed?.birthDate) {
      setOptions([
        {
          key: 'me',
          label: isKo ? '내 정보' : 'My info',
          name: localSeed.name || '',
          birthDate: localSeed.birthDate,
          birthTime:
            localSeed.birthTime && localSeed.birthTime !== '00:00' ? localSeed.birthTime : '',
          timeUnknown: localSeed.birthTimeUnknown === true || localSeed.birthTime === '00:00',
          gender: localSeed.gender || '',
          city: localSeed.city || '',
          latitude: localSeed.latitude ?? null,
          longitude: localSeed.longitude ?? null,
          timeZone: localSeed.timeZone ?? null,
        },
      ])
    }

    const collect = async () => {
      const opts: LoadOption[] = []

      // 내 정보 — DB 프로필 우선, 없으면 로컬 저장본
      try {
        const res = await fetch('/api/me/profile')
        if (res.ok) {
          const data = await res.json()
          const u = data?.user
          if (u && (u.birthDate || u.birthTime)) {
            opts.push({
              key: 'me',
              label: isKo ? '내 정보' : 'My info',
              sub: u.name || undefined,
              name: u.name || '',
              birthDate: u.birthDate || '',
              ...timeToState(u.birthTime),
              gender: normGender(u.gender),
              city: u.birthCity || '',
              latitude: u.latitude ?? null,
              longitude: u.longitude ?? null,
              timeZone: u.tzId ?? null,
            })
          }
        }
      } catch {
        /* guest or offline — fall back below */
      }
      if (!opts.some((o) => o.key === 'me')) {
        const local = getStoredBirthInfo()
        if (local?.birthDate) {
          opts.push({
            key: 'me',
            label: isKo ? '내 정보' : 'My info',
            name: local.name || '',
            birthDate: local.birthDate,
            birthTime: local.birthTime && local.birthTime !== '00:00' ? local.birthTime : '',
            timeUnknown: local.birthTimeUnknown === true || local.birthTime === '00:00',
            gender: local.gender || '',
            city: local.city || '',
            latitude: local.latitude ?? null,
            longitude: local.longitude ?? null,
            timeZone: local.timeZone ?? null,
          })
        }
      }

      // 등록된 지인
      try {
        const res = await fetch('/api/me/circle?limit=50')
        if (res.ok) {
          const data = await res.json()
          const people = data?.data?.people
          if (Array.isArray(people)) {
            for (const p of people) {
              if (!p?.name) continue
              opts.push({
                key: `circle-${p.id}`,
                label: p.name,
                sub: p.relation || undefined,
                name: p.name || '',
                birthDate: p.birthDate || '',
                ...timeToState(p.birthTime),
                gender: normGender(p.gender),
                city: p.birthCity || '',
                latitude: p.latitude ?? null,
                longitude: p.longitude ?? null,
                timeZone: p.tzId ?? p.timezone ?? null,
              })
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setOptions(opts)
    }

    void collect()
    return () => {
      cancelled = true
    }
  }, [open, isKo])

  if (!open) return null

  const applyPatch = (patch: BirthFieldsPatch) => {
    if (patch.birthDate !== undefined) setBirthDate(patch.birthDate)
    if (patch.birthTime !== undefined) setBirthTime(patch.birthTime)
    if (patch.timeUnknown !== undefined) setTimeUnknown(patch.timeUnknown)
    if (patch.gender !== undefined) setGender(patch.gender)
    if (patch.city !== undefined) setCity(patch.city)
    // BirthInfoFields nulls these out when the user retypes (city = string,
    // coords = null) and fills them in when the user picks a suggestion.
    // Mirror exactly so a stale "Seoul" tz never sticks to a re-typed city.
    if (patch.latitude !== undefined) setLatitude(patch.latitude)
    if (patch.longitude !== undefined) setLongitude(patch.longitude)
    if (patch.timeZone !== undefined) setTimeZone(patch.timeZone)
  }

  const applyOption = (o: LoadOption) => {
    if (o.name) setName(o.name)
    setBirthDate(o.birthDate)
    setBirthTime(o.birthTime)
    setTimeUnknown(o.timeUnknown)
    setGender(o.gender)
    setCity(o.city)
    // 저장된 좌표/타임존이 있으면 복원 → 도시가 바로 "설정됨"으로 인정되어
    // "도시 목록에서 선택" 안내가 안 뜬다. 좌표가 없는(구버전) 옵션이면 null 로
    // 두어 사용자가 dropdown 에서 다시 골라 좌표를 채우도록 유도한다.
    setLatitude(o.latitude ?? null)
    setLongitude(o.longitude ?? null)
    setTimeZone(o.timeZone ?? null)
    setLoadOpen(false)
  }

  const effectiveTime = timeUnknown ? '00:00' : birthTime
  // 도시 입력은 됐는데 좌표가 비어 있음 = 사용자가 자동완성 dropdown 에서 안
  // 고르고 텍스트만 친 상태. 이대로 저장하면 사주 엔진이 server-default tz 로
  // 잘못 계산. 도시 자체는 선택 사항이라 비어도 OK 지만, 비어 있지 않으면
  // 좌표까지 짝지어야 한다.
  const cityNeedsPick = Boolean(city.trim() && latitude == null)
  const isValid = Boolean(
    birthDate && (gender === 'male' || gender === 'female') && effectiveTime && !cityNeedsPick
  )

  // 어느 필드가 비었는지 — 버튼 클릭 시 안내용. 이전엔 isValid=false 면 버튼
  // 자체가 silently disabled 라 사용자가 "왜 저장 안 됨" 모르고 이탈했다.
  // 이제 버튼은 항상 누를 수 있고, missing 이 있으면 inline 안내.
  const missingFieldLabels: string[] = []
  if (!birthDate) missingFieldLabels.push(isKo ? '생년월일' : 'birth date')
  if (gender !== 'male' && gender !== 'female') missingFieldLabels.push(isKo ? '성별' : 'gender')
  if (!effectiveTime) missingFieldLabels.push(isKo ? '태어난 시간' : 'birth time')
  if (cityNeedsPick) missingFieldLabels.push(isKo ? '도시 목록에서 선택' : 'pick city from list')

  const handleSave = async () => {
    if (!isValid) {
      setMissingNotice(
        isKo
          ? `${missingFieldLabels.join(' · ')} 을(를) 입력해주세요`
          : `Please fill in: ${missingFieldLabels.join(', ')}`
      )
      return
    }
    setMissingNotice(null)
    const trimmedName = name.trim()
    const trimmedCity = city.trim() || undefined
    // Only persist coords/tz when the city is still present. Clearing the
    // city must also clear them so a stale resolution doesn't outlive the
    // text it was tied to.
    const lat = trimmedCity && typeof latitude === 'number' ? latitude : undefined
    const lon = trimmedCity && typeof longitude === 'number' ? longitude : undefined
    const tz = trimmedCity && timeZone ? timeZone : undefined
    const payload = {
      name: trimmedName || undefined,
      birthDate,
      birthTime: effectiveTime,
      birthTimeUnknown: timeUnknown,
      gender: gender as 'male' | 'female',
      city: trimmedCity,
      latitude: lat,
      longitude: lon,
      timeZone: tz,
    }
    // persist=false ("다른 사람으로 보기") 면 내 프로필/localStorage 를 건드리지
    // 않고 입력값만 부모로 넘긴다 — 내 정체성을 덮어쓰면 안 되므로.
    if (persist) {
      saveBirthInfo(payload)
      // Sync to DB so /api/me/profile (the counselor route's fallback
      // source — useCounselorData reads it, localStorage is ignored)
      // sees the new value. Without this, logged-in users who change
      // their birth info here keep getting the old DB value in
      // counselor sessions. Guest users get 401; swallow — localStorage
      // is enough for them. Server only persists tzId + birthCity (no
      // lat/lon column yet) so coords stay client-side.
      try {
        await fetch('/api/me/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(trimmedName ? { name: trimmedName } : {}),
            birthDate,
            birthTime: timeUnknown ? null : effectiveTime,
            gender: gender as 'male' | 'female',
            birthCity: trimmedCity ?? null,
            // 출생지 좌표 — 사주 진태양시 보정이 운세 차트·캘린더·궁합·
            // 운명매치에서 동일하게 적용되도록 함께 저장.
            latitude,
            longitude,
            tzId: tz ?? null,
          }),
        })
      } catch {
        // localStorage already saved; tolerate transient API failures.
      }
    }
    onSaved({ ...payload, savedAt: new Date().toISOString() })
  }

  const handleDelete = async () => {
    const ok =
      typeof window === 'undefined' ||
      window.confirm(
        isKo
          ? '저장된 생년월일 정보를 삭제할까요? 다음 상담을 시작할 때 다시 입력해야 해요.'
          : 'Delete your saved birth info? You will need to enter it again next time.'
      )
    if (!ok) return
    clearBirthInfo()
    // 로그인 사용자는 서버 프로필도 비워야 다음 동기화 때 옛 값이 다시
    // 살아나지 않음. 게스트는 401 — 로컬 삭제로 충분하니 swallow.
    try {
      await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: null,
          birthTime: null,
          birthCity: null,
          tzId: null,
        }),
      })
    } catch {
      // localStorage already cleared; tolerate transient API failures.
    }
    onDeleted?.()
  }

  return (
    <div
      ref={trapRef}
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="birth-info-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modalCard}>
        <h2 id="birth-info-title" className={styles.modalTitle}>
          {title ?? (isKo ? '생년월일 정보 입력' : 'Enter birth info')}
        </h2>
        <p className={styles.modalSubtitle}>
          {isKo
            ? '한 번 입력하면 모든 서비스에서 자동으로 사용돼요. 시간 모르면 00:00으로 처리합니다.'
            : 'Saved once, reused across every service. Unknown time defaults to 00:00.'}
        </p>

        {options.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLoadOpen((v) => !v)}
              className={styles.modalLoadButton}
            >
              <Download size={14} />
              {isKo ? '저장된 정보 불러오기' : 'Load saved info'}
              <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
            </button>
            {loadOpen && (
              <ul role="listbox" className={styles.modalLoadList}>
                {options.map((o) => (
                  <li key={o.key}>
                    <button
                      type="button"
                      className={styles.modalLoadItem}
                      onClick={() => applyOption(o)}
                    >
                      <span style={{ fontWeight: 600 }}>{o.label}</span>
                      {o.sub && (
                        <span style={{ marginLeft: 6, fontSize: '0.78rem', opacity: 0.6 }}>
                          · {o.sub}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.modalField}>
          <label htmlFor="birth-info-name" className={styles.modalLabel}>
            {isKo ? '이름' : 'Name'}
          </label>
          <input
            id="birth-info-name"
            type="text"
            className={styles.modalInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isKo ? '이름 (선택)' : 'Name (optional)'}
            maxLength={64}
            autoComplete="name"
          />
        </div>

        <BirthInfoFields
          locale={locale}
          birthDate={birthDate}
          birthTime={birthTime}
          timeUnknown={timeUnknown}
          gender={gender}
          city={city}
          latitude={latitude}
          onChange={applyPatch}
          classes={{
            field: styles.modalField,
            label: styles.modalLabel,
            input: styles.modalInput,
            row: styles.modalRow,
            // 체크박스 흰 박스 + 골드 체크. html 의 color-scheme:dark 가
            // 그대로 적용되면 native checkbox 가 검정으로 렌더됨 — light 모달
            // 카드 위에서 어색해서 [color-scheme:light] 로 강제.
            checkbox: 'h-3.5 w-3.5 cursor-pointer accent-[#a07a3c] [color-scheme:light]',
          }}
        />

        {/* 빠진 필드 안내 — 사용자가 [저장하고 시작] 눌렀는데 isValid=false 면
            여기 inline 으로 무엇이 빠졌는지 한 줄. 채우는 즉시 사라짐. */}
        {missingNotice && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900"
          >
            {missingNotice}
          </p>
        )}

        <div className={styles.modalActions}>
          {seed?.birthDate && (
            <button type="button" className={styles.modalDelete} onClick={handleDelete}>
              {isKo ? '삭제' : 'Delete'}
            </button>
          )}
          <button type="button" className={styles.modalCancel} onClick={onClose}>
            {isKo ? '취소' : 'Cancel'}
          </button>
          <button type="button" className={styles.modalSave} onClick={handleSave}>
            {submitLabel ?? (isKo ? '저장하고 시작' : 'Save & start')}
          </button>
        </div>
      </div>
    </div>
  )
}
