'use client'

import { Plus, Trash2, Users } from 'lucide-react'
import { logger } from '@/lib/logger'
import {
  type Locale,
  type SavedPerson,
  SectionSkeleton,
  cardCls,
  emptyCls,
  formatBirthDate,
  inkBtnCls,
  relationLabel,
  rowCls,
  sectionLabelCls,
  serifStyle,
} from './profileShared'

interface Props {
  circle: SavedPerson[]
  loading: boolean
  locale: Locale
  onAdd: () => void
  /** 삭제 성공 시 부모의 circle state 에서 제거 */
  onRemoved: (id: string) => void
}

// 내 지인 — 저장된 지인 목록 + 추가/삭제.
export function CircleSection({ circle, loading, locale, onAdd, onRemoved }: Props) {
  const handleDeletePerson = async (id: string, name: string) => {
    const ok = window.confirm(
      locale === 'ko'
        ? `'${name}' 을(를) 지인 목록에서 삭제할까요?`
        : `Remove '${name}' from your circle?`
    )
    if (!ok) return
    try {
      const res = await fetch(`/api/me/circle?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onRemoved(id)
    } catch (err) {
      logger.warn('[profile/circle] delete failed', err)
      window.alert(
        locale === 'ko'
          ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to delete. Please try again in a moment.'
      )
    }
  }

  return (
    <section className={`mt-6 ${cardCls}`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionLabelCls}>
          <Users className="h-3.5 w-3.5 text-[#a07a3c]" />
          {locale === 'ko' ? '내 지인' : 'My circle'}
        </h2>
        <button type="button" onClick={onAdd} className={inkBtnCls}>
          <Plus className="h-3.5 w-3.5" />
          {locale === 'ko' ? '추가' : 'Add'}
        </button>
      </div>

      {loading ? (
        <SectionSkeleton rows={2} />
      ) : circle.length === 0 ? (
        <div className={emptyCls}>
          <p className="text-[14px] text-[#57534e]">
            {locale === 'ko' ? '아직 등록한 지인이 없어요' : 'No one in your circle yet'}
          </p>
          <p className="mt-1 text-[12px] text-[#a8a29e]">
            {locale === 'ko'
              ? '지인의 생년월일을 저장해두면 궁합 상담을 더 빠르게 받을 수 있어요'
              : 'Save birth info to speed up compatibility readings'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {circle.map((p) => (
            <li key={p.id} className={rowCls}>
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#e7e5e4] bg-white text-[13px] font-semibold text-[#1c1917]"
                style={serifStyle}
              >
                {p.name[0]?.toUpperCase() || '·'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-[#1c1917]">
                  {p.name}
                  <span className="rounded-full bg-[#f1efeb] px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-[#78716c]">
                    {relationLabel(p.relation, locale)}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-[#a8a29e]">
                  {[formatBirthDate(p.birthDate, locale), p.birthTime ?? null, p.birthCity ?? null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDeletePerson(p.id, p.name)}
                className="rounded-full p-1.5 text-[#a8a29e] transition hover:bg-rose-50 hover:text-rose-500"
                aria-label={locale === 'ko' ? '삭제' : 'Delete'}
                title={locale === 'ko' ? '삭제' : 'Delete'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
