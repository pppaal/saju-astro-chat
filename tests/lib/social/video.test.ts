import { describe, it, expect, afterEach } from 'vitest'
import { buildReelArgs, isVideoConfigured } from '@/lib/social/video'

const saved = { ...process.env }
afterEach(() => {
  process.env.SOCIAL_VIDEO = saved.SOCIAL_VIDEO
  process.env.BLOB_READ_WRITE_TOKEN = saved.BLOB_READ_WRITE_TOKEN
})

describe('isVideoConfigured', () => {
  it('SOCIAL_VIDEO=on + Blob 토큰 둘 다 있어야 켜진다 (기본 off — 기존 이미지 발행 유지)', () => {
    delete process.env.SOCIAL_VIDEO
    process.env.BLOB_READ_WRITE_TOKEN = 'tok'
    expect(isVideoConfigured()).toBe(false)

    process.env.SOCIAL_VIDEO = 'on'
    delete process.env.BLOB_READ_WRITE_TOKEN
    expect(isVideoConfigured()).toBe(false)

    process.env.SOCIAL_VIDEO = 'on'
    process.env.BLOB_READ_WRITE_TOKEN = 'tok'
    expect(isVideoConfigured()).toBe(true)
  })
})

describe('buildReelArgs', () => {
  const args = buildReelArgs('/tmp/in.png', '/tmp/out.mp4')

  it('릴스 규격을 강제한다 — 9:16 패딩 + 8초(192프레임@24fps) + H.264/yuv420p', () => {
    const filter = args[args.indexOf('-filter_complex') + 1]
    expect(filter).toContain('pad=1080:1920')
    expect(filter).toContain('d=192')
    expect(filter).toContain('fps=24')
    expect(filter).toContain('format=yuv420p')
    expect(args).toContain('libx264')
    expect(args[args.indexOf('-frames:v') + 1]).toBe('192')
  })

  it('모바일/Meta 호환 faststart + 입력/출력 경로가 그대로 들어간다', () => {
    expect(args).toContain('+faststart')
    expect(args[args.indexOf('-i') + 1]).toBe('/tmp/in.png')
    expect(args[args.length - 1]).toBe('/tmp/out.mp4')
  })
})
