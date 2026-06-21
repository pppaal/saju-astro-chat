import { NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { enforceBodySize } from '@/lib/http'

// 브라우저에서 직접 Firebase 로 올리던 구조는 NextAuth 와 Firebase Auth 가
// 분리돼 있어 storage 규칙·CORS 양쪽에서 자주 막혔다 (60초 timeout 다발).
// 이 라우트는 NextAuth 세션으로 인증 후 Vercel Blob 으로 서버 측 업로드.
// CORS / Firebase 규칙 모두 우회.
//
// 요청: multipart/form-data 의 'file' 필드 (JPG/PNG/WebP, 최대 5MB)
// 응답: { url: string } — Vercel Blob 의 CDN URL. profile.image 에 그대로 저장.

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // content-length 선검사 — formData() 가 전체 멀티파트를 메모리에 버퍼링하기
    // *전에* 거대 업로드를 거부(메모리 DoS 방지). 5MB 파일 + 멀티파트 오버헤드 여유.
    const tooLarge = enforceBodySize(req, 6 * 1024 * 1024)
    if (tooLarge) return tooLarge

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      logger.error('[upload-photo] BLOB_READ_WRITE_TOKEN missing')
      return apiError(
        ErrorCodes.INTERNAL_ERROR,
        'Photo upload is not configured. Please contact support.'
      )
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid form data')
    }

    const file = form.get('file')
    if (!(file instanceof File)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded')
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Unsupported file type. JPG, PNG, WebP only.')
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'File too large. Max 5MB.')
    }

    // 경로 — userId 폴더 안에 timestamp + 확장자. addRandomSuffix:true 로
    // 같은 timestamp 충돌 방지 + 추측 불가 URL 보장.
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
    const pathname = `profile-photos/${userId}/${Date.now()}.${safeExt}`

    try {
      const blob = await put(pathname, file, {
        access: 'public',
        contentType: file.type,
        addRandomSuffix: true,
      })
      logger.info('[upload-photo] uploaded', { userId, pathname: blob.pathname })
      return apiSuccess({ url: blob.url, pathname: blob.pathname })
    } catch (err) {
      logger.error('[upload-photo] Vercel Blob put failed', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Upload failed. Please try again.')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/upload-photo',
    limit: 20,
    windowSeconds: 60,
  })
)
