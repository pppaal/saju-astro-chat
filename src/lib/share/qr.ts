import QRCode from 'qrcode'

/**
 * 공유 카드에 박을 QR data URL 을 만든다 — 현재 오리진 + path 로 생성하므로
 * 배포 도메인이 그대로 들어간다. 스크린샷을 찍어 올려도 스캔 한 번에 무료
 * 진입점으로 유입되게 한다(재공유 시 출처·유입이 따라온다).
 *
 * 클라이언트 전용(window 필요). 실패해도 카드는 QR 없이 정상 생성되게 undefined 폴백.
 */
export async function makeShareQr(path: string): Promise<string | undefined> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (!origin) return undefined
    return await QRCode.toDataURL(`${origin}${path}`, {
      margin: 1,
      width: 208,
      color: { dark: '#0b1022', light: '#ffffff' },
    })
  } catch {
    return undefined
  }
}
