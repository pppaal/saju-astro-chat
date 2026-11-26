import { describe, it, expect } from 'vitest'
import { safeNextPath } from '@/lib/security/safeNext'

const ORIGIN = 'https://destinypal.com'

/** 실제 경로처럼 쿼리 문자열에서 디코딩된 값을 읽는다. */
const fromQuery = (raw: string) => new URLSearchParams(`?next=${raw}`).get('next')

describe('safeNextPath — ?next= open redirect guard (PMS-1)', () => {
  it.each([
    ['/%09/evil.example', 'tab'],
    ['/%0A/evil.example', 'line feed'],
    ['/%0D/evil.example', 'carriage return'],
    ['/%09/evil.example/login', 'tab with path'],
    ['/%5C%5Cevil.example', 'backslashes'],
    ['/%5Cevil.example', 'single backslash'],
    ['//evil.example', 'protocol-relative'],
    ['https://evil.example', 'absolute URL'],
    ['https%3A%2F%2Fevil.example', 'encoded absolute URL'],
    ['javascript:alert(1)', 'javascript scheme'],
  ])('rejects %s (%s)', (raw) => {
    const next = fromQuery(raw)
    expect(safeNextPath(next, ORIGIN)).toBeNull()
  })

  it('the decoded control-character variants would otherwise resolve off-site', () => {
    // 이 가드가 막는 까닭 — URL 파서가 탭·줄바꿈을 지워 '//evil.example' 이 된다.
    for (const raw of ['/%09/evil.example', '/%0A/evil.example', '/%0D/evil.example']) {
      const next = fromQuery(raw) as string
      expect(new URL(next, ORIGIN).origin).toBe('https://evil.example')
    }
  })

  it('rejects raw strings with control characters, DEL or backslashes', () => {
    expect(safeNextPath('/\t/evil.example', ORIGIN)).toBeNull()
    expect(safeNextPath('/\n/evil.example', ORIGIN)).toBeNull()
    expect(safeNextPath('/\r/evil.example', ORIGIN)).toBeNull()
    expect(safeNextPath('/\u0000/x', ORIGIN)).toBeNull()
    expect(safeNextPath('/\u007F/x', ORIGIN)).toBeNull()
    expect(safeNextPath('/\\evil.example', ORIGIN)).toBeNull()
    expect(safeNextPath('/\\\\evil.example', ORIGIN)).toBeNull()
  })

  it('rejects empty and missing values', () => {
    expect(safeNextPath(null, ORIGIN)).toBeNull()
    expect(safeNextPath(undefined, ORIGIN)).toBeNull()
    expect(safeNextPath('', ORIGIN)).toBeNull()
    expect(safeNextPath('calendar', ORIGIN)).toBeNull()
  })

  it('keeps a normal same-site path with query and hash', () => {
    expect(safeNextPath(fromQuery('/calendar?x=1'), ORIGIN)).toBe('/calendar?x=1')
    expect(safeNextPath(fromQuery(encodeURIComponent('/calendar?x=1')), ORIGIN)).toBe(
      '/calendar?x=1'
    )
    expect(safeNextPath('/calendar?x=1', ORIGIN)).toBe('/calendar?x=1')
    expect(safeNextPath('/destiny?date=1997-03-21#life', ORIGIN)).toBe(
      '/destiny?date=1997-03-21#life'
    )
    expect(safeNextPath('/', ORIGIN)).toBe('/')
  })

  it('normalises dot segments but stays on the same origin', () => {
    expect(safeNextPath('/a/../calendar', ORIGIN)).toBe('/calendar')
  })

  it('compares against the origin only (a full page URL works as the base)', () => {
    expect(safeNextPath('/calendar', 'https://destinypal.com/some/page?q=1')).toBe('/calendar')
  })

  it('returns null for an unparsable origin', () => {
    expect(safeNextPath('/calendar', 'not a url')).toBeNull()
  })
})
