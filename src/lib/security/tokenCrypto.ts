// Server-side only utility (not a Server Action)
import crypto from 'crypto'

const KEY_ENV = process.env.TOKEN_ENCRYPTION_KEY

type TokenLike = string | null | undefined

function getKey(): Buffer | null {
  if (!KEY_ENV) {
    return null
  }

  const base64Candidate = Buffer.from(KEY_ENV, 'base64')
  const utf8Candidate = Buffer.from(KEY_ENV, 'utf-8')

  const candidate =
    base64Candidate.length === 32
      ? base64Candidate
      : utf8Candidate.length >= 32
        ? utf8Candidate.slice(0, 32)
        : null

  return candidate ?? null
}

export const hasTokenEncryptionKey = () => Boolean(getKey())

export function encryptToken(value: TokenLike): string | null {
  if (!value) {
    return null
  }
  const key = getKey()
  if (!key) {
    // 프로덕션에서 키가 없거나 무효하면 *조용히 평문 저장*하던 동작은 위험하다
    // — 배포 설정 실수 한 번으로 OAuth 토큰이 평문으로 DB 에 쌓이고, 경고도
    // 없으니 아무도 모른다. 프로덕션에선 차라리 하드 실패시켜 토큰 저장 자체를
    // 막는다. dev/test 에선 로컬 편의를 위해 평문 fallback 을 유지한다.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY is missing or invalid (need a 32-byte base64 or >=32-char key); refusing to persist OAuth tokens in plaintext.'
      )
    }
    return value
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    '.'
  )
}

export function decryptToken(payload: TokenLike): string | null {
  if (!payload) {
    return null
  }
  const key = getKey()
  if (!key) {
    return typeof payload === 'string' ? payload : null
  }

  const parts = String(payload).split('.')
  if (parts.length !== 3) {
    return null
  }

  const [ivB64, tagB64, dataB64] = parts

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}
