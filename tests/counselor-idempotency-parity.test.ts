// tests/counselor-idempotency-parity.test.ts
//
// 가드(=훅): 유료 상담 라우트(운명/궁합)는 둘 다 멱등 키에 content 태그를
// 섞어야 한다. 안 그러면 같은 x-idempotency-key 를 다른 질문에 재사용해 첫
// 차감 후 공짜로 받는 free-replay 누수가 생긴다.
//
// 배경: 이 보호는 운명상담사 realtime 엔 먼저 들어갔는데 궁합 라우트엔 빠져
// 있었다("한쪽엔 있고 한쪽엔 없는" 드리프트). 코드를 공용 함수(idemContentTag)
// 로 모은 뒤, 재발을 막기 위해 이 소스 레벨 불변식 테스트를 둔다 — 새 유료
// 상담 라우트가 추가되거나 기존 보호가 제거되면 CI 가 잡는다.
//
// (소스 grep 방식은 이 레포의 counselor-session-regression 테스트와 동일 패턴.)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROUTES: Array<{ label: string; path: string }> = [
  { label: '운명상담사 realtime', path: 'src/app/api/counselor/realtime/route.ts' },
  { label: '궁합 상담사', path: 'src/app/api/compatibility/counselor/route.ts' },
]

describe('상담 라우트 멱등 키 — content 태그 패리티 가드', () => {
  for (const { label, path } of ROUTES) {
    it(`${label}: keyFor 에 idemContentTag 를 전달한다 (free-replay 차단)`, () => {
      const src = readFileSync(resolve(process.cwd(), path), 'utf8')
      // 공용 헬퍼를 import 해서 쓰는지.
      expect(src, `${path} 가 idemContentTag 를 import/사용해야 함`).toContain('idemContentTag')
      // keyFor(...) 호출 안에 idemContentTag 가 인자로 들어가는지 (줄바꿈 허용).
      const passedIntoKeyFor = /keyFor\([\s\S]{0,200}?idemContentTag\s*\(/.test(src)
      expect(
        passedIntoKeyFor,
        `${path}: idemStore.keyFor(...) 의 contentTag 인자로 idemContentTag(...) 가 전달돼야 함`
      ).toBe(true)
    })
  }
})
