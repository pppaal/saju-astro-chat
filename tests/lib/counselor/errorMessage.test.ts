import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '@/lib/counselor/errorMessage'

const FALLBACK = '__fallback__'

describe('getErrorMessage (상담사 에러 로컬라이저)', () => {
  describe('401 / 인증', () => {
    const inputs = ['API_ERROR:401', 'Unauthorized', 'Authentication required']
    for (const msg of inputs) {
      it(`ko: "${msg}" → 로그인 안내`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('로그인이 필요')
      })
      it(`en: "${msg}" → sign-in 안내`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toContain('Sign-in required')
      })
    }
  })

  describe('403 / CSRF', () => {
    for (const msg of ['API_ERROR:403', 'CSRF token invalid']) {
      it(`ko: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('보안 검증에 실패')
      })
      it(`en: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toBe(
          'Security validation failed. Refresh the page and try again.'
        )
      })
    }
  })

  describe('크레딧 부족', () => {
    for (const msg of ['INSUFFICIENT_CREDITS', 'API_ERROR:402']) {
      it(`ko: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('크레딧이 부족')
      })
      it(`en: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toContain('Insufficient credits')
      })
    }
  })

  describe('타임아웃 / 연결', () => {
    for (const msg of ['Request timeout', 'connection reset']) {
      it(`ko: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('연결이 원활하지')
      })
      it(`en: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toContain('Connection issue')
      })
    }
  })

  describe('429 / rate limit', () => {
    for (const msg of ['429 Too Many Requests', 'rate limit exceeded']) {
      it(`ko: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('요청이 많아')
      })
      it(`en: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toContain('Rate limit')
      })
    }
  })

  describe('5xx 명시 (500/502/503)', () => {
    for (const msg of ['500 Internal', '502 Bad Gateway', '503 Unavailable']) {
      it(`ko: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'ko', FALLBACK)).toContain('일시적인 문제')
      })
      it(`en: "${msg}"`, () => {
        expect(getErrorMessage(new Error(msg), 'en', FALLBACK)).toContain('Temporary server issue')
      })
    }
  })

  describe('Failed (5xx) 패턴 (궁합 라우트 body)', () => {
    // 504 는 위 500/502/503 분기에 안 잡히지만 이 정규식이 잡는다.
    it('ko: "Failed (504): gateway timeout"', () => {
      // 주의: "timeout" 포함 → timeout 분기가 먼저 매치된다(아래 별도 케이스).
      expect(getErrorMessage(new Error('Failed (504): upstream down'), 'ko', FALLBACK)).toContain(
        '일시적인 문제'
      )
    })
    it('en: "Failed (511): network auth"', () => {
      expect(getErrorMessage(new Error('Failed (511): boom'), 'en', FALLBACK)).toContain(
        'Temporary server issue'
      )
    })
    it('대소문자 무시 — "failed (500): x"', () => {
      expect(getErrorMessage(new Error('failed (500): x'), 'ko', FALLBACK)).toContain(
        '일시적인 문제'
      )
    })
  })

  describe('일반 API_ERROR: 폴백 분기', () => {
    it('ko: "API_ERROR:418" → 서버 응답 문제 카피', () => {
      expect(getErrorMessage(new Error('API_ERROR:418'), 'ko', FALLBACK)).toContain(
        '상담 서버 응답에 문제'
      )
    })
    it('en: "API_ERROR:418"', () => {
      expect(getErrorMessage(new Error('API_ERROR:418'), 'en', FALLBACK)).toContain(
        'The counselor server returned an error'
      )
    })
  })

  describe('매칭 없음 → 호출자 fallback', () => {
    it('알 수 없는 메시지', () => {
      expect(getErrorMessage(new Error('weird thing happened'), 'ko', FALLBACK)).toBe(FALLBACK)
    })
    it('빈 Error 메시지', () => {
      expect(getErrorMessage(new Error(''), 'en', FALLBACK)).toBe(FALLBACK)
    })
  })

  describe('비-Error 입력 coercion', () => {
    it('문자열을 그대로 검사', () => {
      expect(getErrorMessage('429 limit', 'ko', FALLBACK)).toContain('요청이 많아')
    })
    it('null → 빈 문자열 → fallback', () => {
      expect(getErrorMessage(null, 'ko', FALLBACK)).toBe(FALLBACK)
    })
    it('undefined → fallback', () => {
      expect(getErrorMessage(undefined, 'en', FALLBACK)).toBe(FALLBACK)
    })
    it('객체 → String() 후 검사 (매칭 없으면 fallback)', () => {
      expect(getErrorMessage({ foo: 'bar' }, 'ko', FALLBACK)).toBe(FALLBACK)
    })
  })

  describe('분기 우선순위', () => {
    it('401 이 5xx 보다 먼저 — "API_ERROR:401 500" → 로그인 안내', () => {
      expect(getErrorMessage(new Error('API_ERROR:401 500'), 'ko', FALLBACK)).toContain(
        '로그인이 필요'
      )
    })
    it('ko 외 lang 은 영문 카피로 폴백 (lang !== ko)', () => {
      // 함수 시그니처상 'en'|'ko' 지만 분기는 lang === 'ko' 만 검사하므로
      // 그 외엔 영문. en 으로 동일 동작 확인.
      expect(getErrorMessage(new Error('429'), 'en', FALLBACK)).toContain('Rate limit')
    })
  })
})
