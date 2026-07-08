'use client'

// src/lib/share/kakao.ts
//
// 카카오톡 공유(Kakao Share JS SDK)의 얇은 클라이언트 래퍼. 결과 카드를 카톡
// 친구에게 예쁜 "피드" 카드(제목·설명·이미지·버튼)로 바로 보낼 수 있게 한다.
// 한국 바이럴의 핵심 채널 — navigator.share(OS 기본 공유창) 폴백만으로는 카톡
// 인앱 공유 경험을 만들지 못한다.
//
// SDK 는 CSP(script-src)에 이미 허용된 t1.kakaocdn.net 에서 지연 로드하고
// NEXT_PUBLIC_KAKAO_JS_KEY 로 init 한다. 키가 없으면 조용히 비활성 상태로 남아
// 호출부가 기존 폴백(Web Share/클립보드)을 그대로 쓰게 둔다.

import { logger } from '@/lib/logger'

// SDK 는 t1.kakaocdn.net 에서만 로드(= CSP script-src 허용 도메인).
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'

// SDK 로드/init 은 한 번만 — 결과(성공/실패)를 캐시해 재호출을 즉시 처리한다.
let loadPromise: Promise<boolean> | null = null

function jsKey(): string {
  return (process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '').trim()
}

/**
 * 카톡 공유가 가능한 환경인지(키 설정 + 브라우저). 버튼 노출 여부 판단용 —
 * 미설정 환경(로컬/키 미주입)에선 버튼을 숨기고 폴백만 노출한다.
 */
export function isKakaoConfigured(): boolean {
  return typeof window !== 'undefined' && jsKey().length > 0
}

/** SDK 스크립트를 지연 로드하고 init. 성공 시 true. 한 번만 수행하고 캐시. */
function ensureKakao(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const key = jsKey()
  if (!key) return Promise.resolve(false)
  if (loadPromise) return loadPromise

  loadPromise = new Promise<boolean>((resolve) => {
    const init = (): boolean => {
      try {
        const k = window.Kakao
        if (!k) return false
        if (!k.isInitialized()) k.init(key)
        return k.isInitialized()
      } catch (err) {
        logger.error('[kakao] init failed', err instanceof Error ? err : undefined)
        return false
      }
    }

    // 이미 SDK 전역이 있으면 바로 init.
    if (window.Kakao) {
      resolve(init())
      return
    }

    const onError = () => {
      logger.error('[kakao] sdk load failed')
      resolve(false)
    }

    // 동일 src 스크립트가 이미 삽입돼 있으면 그 load 를 기다린다(중복 삽입 방지).
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`)
    if (existing) {
      if (window.Kakao) {
        resolve(init())
        return
      }
      existing.addEventListener('load', () => resolve(init()), { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }

    const s = document.createElement('script')
    s.src = SDK_SRC
    s.async = true
    // 무결성 검증(SRI)에 필요.
    s.crossOrigin = 'anonymous'
    s.addEventListener('load', () => resolve(init()), { once: true })
    s.addEventListener('error', onError, { once: true })
    document.head.appendChild(s)
  })

  return loadPromise
}

export type KakaoShareArgs = {
  title: string
  description: string
  /** 반드시 공개 https 이미지 URL(카톡 서버가 크롤). blob/data URL 불가. */
  imageUrl: string
  /** 반드시 공개 https URL. */
  link: string
  buttonTitle: string
}

/**
 * 카톡 "피드" 카드 전송. 성공 여부를 boolean 으로 돌려준다 — 실패하면 호출부가
 * Web Share/클립보드로 폴백해 사용자 경험이 끊기지 않게 한다. imageUrl·link 는
 * 반드시 공개적으로 접근 가능한 https URL 이어야 한다(카톡 서버가 미리보기를
 * 크롤하기 때문).
 */
export async function shareToKakao(args: KakaoShareArgs): Promise<boolean> {
  const ok = await ensureKakao()
  const k = typeof window !== 'undefined' ? window.Kakao : undefined
  if (!ok || !k) return false
  try {
    k.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: args.title,
        description: args.description,
        imageUrl: args.imageUrl,
        link: { mobileWebUrl: args.link, webUrl: args.link },
      },
      buttons: [
        {
          title: args.buttonTitle,
          link: { mobileWebUrl: args.link, webUrl: args.link },
        },
      ],
    })
    return true
  } catch (err) {
    logger.error('[kakao] sendDefault failed', err instanceof Error ? err : undefined)
    return false
  }
}
