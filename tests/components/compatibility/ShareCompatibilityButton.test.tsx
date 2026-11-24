/**
 * ShareCompatibilityButton — 초대(공유자 출생정보) 옵트인 프라이버시.
 *
 * 잠그는 것:
 *  - "친구가 나와의 궁합을 바로 보게 하기" 는 기본 OFF — 그대로 링크를 만들면
 *    공유 POST 본문에 inviter(출생정보)가 없다.
 *  - 사용자가 직접 켰을 때만 inviter 가 실린다.
 *  - 문구가 무엇이 저장되는지(성별·생년월일·시각·출생지, 90일)와 친구에겐 결과만
 *    보인다는 사실을 ko/en 으로 밝힌다.
 *  - 공유자 정보가 없으면(inviter prop 없음) 옵트인 자체를 띄우지 않는다.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const apiFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const toBlob = vi.fn()
vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlob(...args),
}))

vi.mock('@/lib/share/qr', () => ({ makeShareQr: vi.fn(async () => undefined) }))
vi.mock('@/lib/metrics/trackFunnel', () => ({ trackFunnel: vi.fn() }))

// 캡처용 카드는 스텁 — CompatShareCard 의 그림 의존성을 끌어오지 않는다.
vi.mock('@/components/compatibility/CompatShareCard', () => {
  const Card = React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref} data-testid="compat-share-card" />
  ))
  Card.displayName = 'CompatShareCard'
  return { COMPAT_SHARE_CARD_SIZE: 1080, CompatShareCard: Card }
})

import { ShareCompatibilityButton } from '@/components/compatibility/ShareCompatibilityButton'
import type { CompatInviter } from '@/lib/tarot/shareLink'

const baseData = {
  isKo: true,
  nameA: '지민',
  nameB: '수현',
  verdict: '불꽃은 튀는데 서로 못 참는 조합이에요.',
  verdictTone: 'mixed' as const,
  score: 87,
  grade: '위험할 만큼 잘 맞아',
}

const inviter: CompatInviter = {
  name: '지민',
  birthDate: '1994-03-03',
  birthTime: '14:37',
  timeUnknown: false,
  gender: 'female',
  city: 'Busan',
  lat: 35.1796,
  lon: 129.0756,
  tz: 'Asia/Seoul',
}

const okRes = () => ({
  ok: true,
  status: 200,
  json: async () => ({ data: { url: 'https://destinypal.app/r/abc' } }),
})

async function openPreview(entryName: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: entryName }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /링크로 공유|Share link/ })).toBeInTheDocument()
  )
}

/** 마지막 공유 POST 본문(JSON). */
function lastPostBody(): Record<string, unknown> {
  const call = apiFetch.mock.calls.at(-1) as [string, { body: string }]
  expect(call[0]).toBe('/api/compatibility/share')
  return JSON.parse(call[1].body)
}

describe('ShareCompatibilityButton — 초대 옵트인 (기본 OFF)', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(okRes())
    toBlob.mockReset()
    toBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:preview-url')
    URL.revokeObjectURL = vi.fn()
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      // @ts-expect-error test stub
      globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0)
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    cleanup()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    // @ts-expect-error allow delete in tests
    delete (navigator as Navigator & { share?: unknown }).share
  })

  it('옵트인 체크박스는 기본으로 꺼져 있다', async () => {
    render(<ShareCompatibilityButton data={baseData} inviter={inviter} />)
    await openPreview(/결과 공유하기/)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('그대로 링크를 만들면 공유 본문에 inviter(출생정보)가 없다', async () => {
    render(<ShareCompatibilityButton data={baseData} inviter={inviter} />)
    await openPreview(/결과 공유하기/)
    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    const body = lastPostBody()
    expect(body).not.toHaveProperty('inviter')
    expect(JSON.stringify(body)).not.toContain('1994-03-03')
    expect(body.nameA).toBe('지민')
  })

  it('사용자가 직접 켜면 inviter 가 실린다', async () => {
    render(<ShareCompatibilityButton data={baseData} inviter={inviter} />)
    await openPreview(/결과 공유하기/)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    expect(lastPostBody().inviter).toEqual(inviter)
  })

  it('ko 문구: 저장되는 항목·기간과 친구에겐 결과만 보인다는 사실을 밝힌다', async () => {
    render(<ShareCompatibilityButton data={baseData} inviter={inviter} />)
    await openPreview(/결과 공유하기/)
    const label = screen.getByRole('checkbox').closest('label')
    expect(label?.textContent).toContain('성별·생년월일·태어난 시각·출생지')
    expect(label?.textContent).toContain('90일')
    expect(label?.textContent).toContain('친구에게는 궁합 결과만 보여요')
  })

  it('en 문구도 같은 내용을 밝힌다', async () => {
    render(<ShareCompatibilityButton data={{ ...baseData, isKo: false }} inviter={inviter} />)
    await openPreview(/Share result/)
    const label = screen.getByRole('checkbox').closest('label')
    expect(label?.textContent).toContain('gender, birth date, time and place')
    expect(label?.textContent).toContain('90 days')
    expect(label?.textContent).toContain('friends only see the match result')
  })

  it('inviter 가 없으면 옵트인을 띄우지 않고 본문에도 없다', async () => {
    render(<ShareCompatibilityButton data={baseData} />)
    await openPreview(/결과 공유하기/)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '링크로 공유' }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    expect(lastPostBody()).not.toHaveProperty('inviter')
  })
})
