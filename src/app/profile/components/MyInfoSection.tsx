'use client'

import { Calendar, Clock, MapPin, Pencil, User as UserIcon } from 'lucide-react'
import { isBirthTimeUnknown } from '@/lib/saju/birthTimeAnchor'
import {
  type Locale,
  type MeProfile,
  cardCls,
  formatBirthDate,
  genderLabel,
  ghostBtnCls,
  sectionLabelCls,
} from './profileShared'

interface Props {
  profile: MeProfile | null
  locale: Locale
  loading: boolean
  onEdit: () => void
}

// 내 정보 — 생년월일/출생시간/출생도시/성별 읽기 전용 카드 + 수정 버튼.
export function MyInfoSection({ profile, locale, loading, onEdit }: Props) {
  return (
    <section className={`mt-9 ${cardCls}`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionLabelCls}>{locale === 'ko' ? '내 정보' : 'My info'}</h2>
        <button type="button" onClick={onEdit} className={ghostBtnCls}>
          <Pencil className="h-3.5 w-3.5" />
          {locale === 'ko' ? '수정' : 'Edit'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <InfoRow
          Icon={Calendar}
          label={locale === 'ko' ? '생년월일' : 'Birth date'}
          value={formatBirthDate(profile?.birthDate, locale)}
          loading={loading}
        />
        <InfoRow
          Icon={Clock}
          label={locale === 'ko' ? '출생 시간' : 'Birth time'}
          // tri-state SSOT — 레거시 '00:00'(미상 표기)은 미입력으로, 명시 플래그
          // false 의 '00:00' 은 실제 자정 출생이라 그대로 표시.
          value={
            isBirthTimeUnknown(profile?.birthTime, profile?.birthTimeUnknown)
              ? locale === 'ko'
                ? '미입력'
                : 'Not set'
              : profile!.birthTime!
          }
          loading={loading}
        />
        <InfoRow
          Icon={MapPin}
          label={locale === 'ko' ? '출생 도시' : 'Birth city'}
          value={profile?.birthCity || (locale === 'ko' ? '미입력' : 'Not set')}
          loading={loading}
        />
        <InfoRow
          Icon={UserIcon}
          label={locale === 'ko' ? '성별' : 'Gender'}
          value={genderLabel(profile?.gender, locale)}
          loading={loading}
        />
      </div>
    </section>
  )
}

function InfoRow({
  Icon,
  label,
  value,
  loading,
}: {
  Icon: typeof Calendar
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e7e5e4] bg-[#fcfbfa] px-3.5 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f1efeb] text-[#a07a3c]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#a8a29e]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13.5px] font-medium text-[#292524]">
          {loading ? '·' : value}
        </p>
      </div>
    </div>
  )
}
