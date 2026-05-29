/**
 * Photo URL host allowlist — security regression tests.
 *
 * Locks in rejection of javascript:/data:/http:/SSRF/attacker-host URLs that
 * the original `z.string().max(500)` validator let through into
 * MatchProfile.photos and user.image.
 */
import { describe, it, expect } from 'vitest'
import {
  isAllowedPhotoHost,
  PHOTO_HOST_ALLOWLIST,
} from '@/lib/api/photoHostAllowlist'

describe('isAllowedPhotoHost — allowed hosts', () => {
  it('accepts Vercel Blob URL (wildcard subdomain)', () => {
    expect(
      isAllowedPhotoHost(
        'https://abc123store.public.blob.vercel-storage.com/profile-photos/u1/123.jpg'
      )
    ).toBe(true)
  })

  it('accepts another Vercel Blob subdomain', () => {
    expect(
      isAllowedPhotoHost('https://prod.public.blob.vercel-storage.com/x/y.webp')
    ).toBe(true)
  })

  it('accepts Firebase Storage URL', () => {
    expect(
      isAllowedPhotoHost(
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatar.jpg?alt=media'
      )
    ).toBe(true)
  })

  it('accepts GCS direct URL', () => {
    expect(isAllowedPhotoHost('https://storage.googleapis.com/bucket/file.png')).toBe(true)
  })

  it('accepts Google provider avatar (lh3)', () => {
    expect(isAllowedPhotoHost('https://lh3.googleusercontent.com/a/AHcGUjCxyz=s96-c')).toBe(true)
  })

  it('accepts GitHub avatar', () => {
    expect(isAllowedPhotoHost('https://avatars.githubusercontent.com/u/12345?v=4')).toBe(true)
  })
})

describe('isAllowedPhotoHost — XSS / script-injection vectors', () => {
  it('rejects javascript: URL', () => {
    expect(isAllowedPhotoHost('javascript:alert(1)')).toBe(false)
  })

  it('rejects javascript: URL with mixed case scheme', () => {
    expect(isAllowedPhotoHost('JavaScript:alert(1)')).toBe(false)
  })

  it('rejects data:text/html URL', () => {
    expect(
      isAllowedPhotoHost('data:text/html,<script>alert(1)</script>')
    ).toBe(false)
  })

  it('rejects data:image URL (still not a trusted host)', () => {
    expect(isAllowedPhotoHost('data:image/png;base64,AAAA')).toBe(false)
  })

  it('rejects vbscript: URL', () => {
    expect(isAllowedPhotoHost('vbscript:msgbox(1)')).toBe(false)
  })

  it('rejects file: URL', () => {
    expect(isAllowedPhotoHost('file:///etc/passwd')).toBe(false)
  })
})

describe('isAllowedPhotoHost — protocol enforcement', () => {
  it('rejects http:// (must be https)', () => {
    expect(
      isAllowedPhotoHost('http://firebasestorage.googleapis.com/foo.jpg')
    ).toBe(false)
  })

  it('rejects ftp:// even on allowed host', () => {
    expect(isAllowedPhotoHost('ftp://storage.googleapis.com/bucket/file')).toBe(false)
  })
})

describe('isAllowedPhotoHost — SSRF vectors', () => {
  it('rejects AWS EC2 metadata IP', () => {
    expect(isAllowedPhotoHost('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects https variant of metadata IP', () => {
    expect(isAllowedPhotoHost('https://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects localhost', () => {
    expect(isAllowedPhotoHost('https://localhost/foo.jpg')).toBe(false)
  })

  it('rejects 127.0.0.1', () => {
    expect(isAllowedPhotoHost('https://127.0.0.1/foo.jpg')).toBe(false)
  })

  it('rejects internal 10.x.x.x', () => {
    expect(isAllowedPhotoHost('https://10.0.0.5/foo.jpg')).toBe(false)
  })
})

describe('isAllowedPhotoHost — attacker domains', () => {
  it('rejects arbitrary https attacker domain', () => {
    expect(isAllowedPhotoHost('https://attacker.com/payload.jpg')).toBe(false)
  })

  it('rejects look-alike subdomain (suffix-match defeat attempt)', () => {
    // "googleusercontent.com.evil.com" must not match "lh3.googleusercontent.com"
    expect(
      isAllowedPhotoHost('https://lh3.googleusercontent.com.evil.com/x.jpg')
    ).toBe(false)
  })

  it('rejects bare apex when only wildcard is allowed', () => {
    // *.public.blob.vercel-storage.com should NOT match bare apex.
    expect(
      isAllowedPhotoHost('https://public.blob.vercel-storage.com/file.jpg')
    ).toBe(false)
  })

  it('rejects URL with embedded credentials targeting trusted host', () => {
    // Some clients send Authorization to userinfo half — refuse outright.
    expect(
      isAllowedPhotoHost(
        'https://attacker.com@firebasestorage.googleapis.com/file.jpg'
      )
    ).toBe(false)
  })
})

describe('isAllowedPhotoHost — malformed input', () => {
  it('rejects empty string', () => {
    expect(isAllowedPhotoHost('')).toBe(false)
  })

  it('rejects whitespace', () => {
    expect(isAllowedPhotoHost('   ')).toBe(false)
  })

  it('rejects plain string (not a URL)', () => {
    expect(isAllowedPhotoHost('not a url')).toBe(false)
  })

  it('rejects relative URL', () => {
    expect(isAllowedPhotoHost('/photo.jpg')).toBe(false)
  })

  it('rejects protocol-relative URL', () => {
    expect(isAllowedPhotoHost('//firebasestorage.googleapis.com/x.jpg')).toBe(false)
  })

  it('rejects very long URL (> 2000 chars)', () => {
    const longUrl = 'https://firebasestorage.googleapis.com/' + 'a'.repeat(2100)
    expect(isAllowedPhotoHost(longUrl)).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isAllowedPhotoHost(null as unknown as string)).toBe(false)
    expect(isAllowedPhotoHost(undefined as unknown as string)).toBe(false)
    expect(isAllowedPhotoHost(123 as unknown as string)).toBe(false)
    expect(isAllowedPhotoHost({} as unknown as string)).toBe(false)
  })
})

describe('PHOTO_HOST_ALLOWLIST', () => {
  it('mirrors next.config.ts images.remotePatterns hosts', () => {
    // If you add a host to next.config.ts remotePatterns, add it here too —
    // otherwise images render fine but uploads/saves get 400'd, and vice
    // versa. This test exists to make the link explicit.
    expect(PHOTO_HOST_ALLOWLIST).toContain('*.public.blob.vercel-storage.com')
    expect(PHOTO_HOST_ALLOWLIST).toContain('firebasestorage.googleapis.com')
    expect(PHOTO_HOST_ALLOWLIST).toContain('storage.googleapis.com')
    expect(PHOTO_HOST_ALLOWLIST).toContain('lh3.googleusercontent.com')
    expect(PHOTO_HOST_ALLOWLIST).toContain('avatars.githubusercontent.com')
    expect(PHOTO_HOST_ALLOWLIST).toContain('images.unsplash.com')
  })
})
