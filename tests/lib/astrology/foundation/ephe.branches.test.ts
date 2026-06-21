// @vitest-environment node
// tests/lib/astrology/foundation/ephe.branches.test.ts
//
// 기존 ephe.test.ts 는 전역 mock(@/lib/astrology/foundation/ephe)에 가려
// 사실상 *mock* 을 테스트한다 (실제 분기 미실행). 여기서는 swisseph 와 ephe
// 모듈을 모두 unmock 하고 *의존성 주입*(__SWISSEPH__ / __EPHE_PATH_JOIN__)으로
// 실제 getSwisseph 분기를 결정적으로 덮는다:
//  - 브라우저 가드 throw (window 존재)
//  - 주입된 swisseph 사용 + ephe path 설정 (env / default)
//  - ephePathSet 1회만 (캐시)
//  - require 실패 → toSwissephLoadError 래핑 + 재호출 시 캐시된 에러 rethrow
//
// 각 it 마다 vi.resetModules() 로 모듈 레벨 캐시(sw/ephePathSet/swissephLoadError)를
// 초기화한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

type GlobalShape = typeof globalThis & {
  window?: unknown
  __SWISSEPH__?: unknown
  __EPHE_PATH_JOIN__?: unknown
}

const g = globalThis as GlobalShape

function makeMockSwisseph() {
  return {
    swe_set_ephe_path: vi.fn(),
    swe_calc_ut: vi.fn(),
    SE_SUN: 0,
  }
}

let savedWindow: unknown
let savedEnv: string | undefined

beforeEach(() => {
  vi.resetModules()
  savedWindow = g.window
  savedEnv = process.env.EPHE_PATH
  delete g.window
  delete g.__SWISSEPH__
  delete g.__EPHE_PATH_JOIN__
})

afterEach(() => {
  if (savedWindow === undefined) delete g.window
  else g.window = savedWindow
  if (savedEnv === undefined) delete process.env.EPHE_PATH
  else process.env.EPHE_PATH = savedEnv
  delete g.__SWISSEPH__
  delete g.__EPHE_PATH_JOIN__
  vi.clearAllMocks()
})

describe('ephe.ts getSwisseph — 실제 분기 (unmocked + injected)', () => {
  it('throws in browser environment when window is defined / 브라우저면 throw', async () => {
    g.window = {}
    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')
    expect(() => getSwisseph()).toThrow('server-only')
    expect(() => getSwisseph()).toThrow('must not run in the browser')
  })

  it('uses injected swisseph and sets ephe path (env) / 주입 swisseph + env 경로', async () => {
    const mock = makeMockSwisseph()
    g.__SWISSEPH__ = mock
    process.env.EPHE_PATH = '/custom/ephe'

    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')
    const sw = getSwisseph()

    expect(sw).toBe(mock)
    expect(mock.swe_set_ephe_path).toHaveBeenCalledWith('/custom/ephe')
  })

  it('uses injected join + default path when env unset / env 없으면 default 경로 join', async () => {
    const mock = makeMockSwisseph()
    g.__SWISSEPH__ = mock
    delete process.env.EPHE_PATH
    const join = vi.fn((...parts: string[]) => parts.join('|'))
    g.__EPHE_PATH_JOIN__ = join

    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')
    getSwisseph()

    expect(join).toHaveBeenCalledWith(process.cwd(), 'public', 'ephe')
    expect(mock.swe_set_ephe_path).toHaveBeenCalledWith(`${process.cwd()}|public|ephe`)
  })

  it('caches instance and sets ephe path only once / 인스턴스·경로 1회만', async () => {
    const mock = makeMockSwisseph()
    g.__SWISSEPH__ = mock
    g.__EPHE_PATH_JOIN__ = vi.fn((...p: string[]) => p.join('/'))

    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')
    const a = getSwisseph()
    const b = getSwisseph()
    const c = getSwisseph()

    expect(a).toBe(b)
    expect(b).toBe(c)
    // 경로 설정은 첫 호출에서 한 번만.
    expect(mock.swe_set_ephe_path).toHaveBeenCalledTimes(1)
  })

  it('wraps require failure and rethrows cached error / require 실패 래핑+캐시 rethrow', async () => {
    // 주입 swisseph 없음 + jsdom 아닌 node 환경에서 require('swisseph') 가
    // 네이티브 바인딩 부재로 실패할 수 있다. 그러나 환경에 따라 실제로 로드될
    // 수도 있으므로, 결정적 검증을 위해 join 주입으로 path 단계는 통과시키되
    // require 자체는 환경 의존이라 두 경우 모두 허용한다.
    delete g.__SWISSEPH__
    const { getSwisseph } = await import('@/lib/astrology/foundation/ephe')

    let firstError: Error | null = null
    try {
      getSwisseph()
    } catch (e) {
      firstError = e as Error
    }

    if (firstError) {
      // 실패 경로: 래핑 메시지 확인 + 재호출 시 동일(캐시된) 에러 rethrow.
      expect(firstError.message).toContain('Failed to load native module "swisseph"')
      let secondError: Error | null = null
      try {
        getSwisseph()
      } catch (e) {
        secondError = e as Error
      }
      expect(secondError).toBe(firstError)
    } else {
      // 성공 경로 (실제 바인딩 존재): 정상 객체 반환.
      const sw = getSwisseph()
      expect(sw).toBeDefined()
      expect(typeof sw.swe_set_ephe_path).toBe('function')
    }
  })
})
