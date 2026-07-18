// src/lib/social/video.ts
//
// 카드 이미지(1080×1350 PNG) → 릴스/Shorts 규격(1080×1920) 슬로우줌 MP4.
// 인스타 알고리즘이 정적 이미지 대비 릴스에 노출을 몰아주므로, 같은 카드를
// 8초 Ken Burns 영상으로 감싸 REELS 로 발행한다(+ TikTok/Shorts 수동 업로드
// 재료). 렌더는 ffmpeg(@ffmpeg-installer — postinstall 다운로드 없는 npm
// 바이너리), 저장은 Vercel Blob(aiImage 와 동일 패턴).
//
// SOCIAL_VIDEO=on + BLOB_READ_WRITE_TOKEN 있을 때만 동작 — 미설정이면 전부
// null 을 돌려 기존 이미지 발행 경로가 그대로 유지된다(graceful degrade).

import { spawn } from 'child_process'
import { mkdtemp, readFile, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { put } from '@vercel/blob'
import { logger } from '@/lib/logger'
import type { SocialCategory } from './types'

/** 영상 파이프라인 활성 여부 — 명시 opt-in(SOCIAL_VIDEO=on) + Blob 토큰. */
export function isVideoConfigured(): boolean {
  const toggle = (process.env.SOCIAL_VIDEO || '').trim().toLowerCase()
  const on = toggle === 'on' || toggle === 'true' || toggle === '1'
  return on && (process.env.BLOB_READ_WRITE_TOKEN || '').trim() !== ''
}

// 8초 × 24fps. zoompan 은 입력 1프레임당 d 프레임을 생성한다.
const FPS = 24
const DURATION_SEC = 8
const FRAMES = FPS * DURATION_SEC

/**
 * ffmpeg 인자 조립 — 순수 함수(테스트 대상). 파이프라인:
 *  1) 카드(1080×1350)를 2160×2700 으로 업스케일 — zoompan 서브픽셀 지터 방지
 *  2) zoompan: 8초 동안 1.0→~1.09 배 슬로우줌(가운데 고정)
 *  3) 1080×1920(9:16) 다크 패딩 — 릴스/Shorts 풀스크린 규격
 *  4) H.264 yuv420p + faststart — Meta/YouTube 호환 인코딩
 */
export function buildReelArgs(inPng: string, outMp4: string): string[] {
  const filter = [
    'scale=2160:2700:flags=lanczos',
    `zoompan=z='min(1.0+0.0005*on,1.10)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${FRAMES}:s=1080x1350:fps=${FPS}`,
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0d0b14',
    'format=yuv420p',
  ].join(',')
  return [
    '-y',
    '-loop',
    '1',
    '-i',
    inPng,
    '-filter_complex',
    filter,
    '-frames:v',
    String(FRAMES),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-movflags',
    '+faststart',
    outMp4,
  ]
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  // 서버 번들 외부화(serverExternalPackages — next.config)된 패키지를 런타임
  // require — 실행 시점에만 로드돼 렌더 안 쓰는 경로의 콜드스타트에 무영향.
  const ffmpegPath = (require('@ffmpeg-installer/ffmpeg') as { path: string }).path
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => {
      // 마지막 에러 라인만 보존(로그 폭주 방지).
      stderr = `${stderr}${d.toString()}`.slice(-2000)
    })
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error(`ffmpeg timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`))
    })
  })
}

/**
 * 카드 이미지 URL → 릴스 MP4 렌더 → Blob 업로드 → 공개 URL.
 * 실패는 전부 null(로그만) — 호출부는 이미지 발행으로 폴백한다.
 */
export async function renderCardReel(params: {
  cardImageUrl: string
  date: string
  category: SocialCategory
  locale: 'ko' | 'en'
  /** 렌더 제한(ms) — 크론 maxDuration 예산 안에서 호출부가 정한다. */
  timeoutMs?: number
}): Promise<string | null> {
  if (!isVideoConfigured()) return null
  const { cardImageUrl, date, category, locale, timeoutMs = 90_000 } = params

  let dir: string | null = null
  try {
    const res = await fetch(cardImageUrl)
    if (!res.ok) {
      logger.warn('[social/video] card image fetch failed', { category, status: res.status })
      return null
    }
    const png = Buffer.from(await res.arrayBuffer())

    dir = await mkdtemp(join(tmpdir(), 'social-reel-'))
    const inPng = join(dir, 'card.png')
    const outMp4 = join(dir, 'reel.mp4')
    await writeFile(inPng, png)

    await runFfmpeg(buildReelArgs(inPng, outMp4), timeoutMs)

    const mp4 = await readFile(outMp4)
    const blob = await put(`social/reel/${date}-${category}-${locale}.mp4`, mp4, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    logger.info('[social/video] reel rendered', { category, bytes: mp4.length, url: blob.url })
    return blob.url
  } catch (error) {
    logger.warn('[social/video] render failed — falling back to image publish', {
      category,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
