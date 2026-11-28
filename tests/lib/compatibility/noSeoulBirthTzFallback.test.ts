/**
 * 가드 — 궁합·초대 출생 타임존 경로에 'Asia/Seoul' 하드코딩 폴백이 다시 들어오지 않는다(G13).
 *
 * 제품은 전 세계에 팔린다. 출생 tz 가 없는 사람을 서울 기둥으로 계산하던 폴백을 F5-2 resolver
 * 순서로 바꿨다 — 화면: 저장 tz → 출생 도시 tz → 보는 사람 기기 tz(resolveBirthTimezoneOnDevice),
 * 서버: 명시 tz → 출생 도시 tz, 둘 다 없으면 422(resolveBirthTimezoneStrict). 한국 고유 코드
 * (관리자 통계 SQL 의 사업 tz, zoneReference/타임존 표, calculationStandards, 캘린더 미리보기
 * 샘플)는 이 가드 밖이다.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

const BIRTH_TZ_PATHS = [
  'src/hooks/useCompatibilityForm.ts',
  'src/app/compatibility/lib/helpers.ts',
  'src/app/compatibility/counselor/page.tsx',
  'src/app/compatibility/counselor/CompatPersonPickerModal.tsx',
  'src/app/compatibility/counselor/useCompatCounselorChat.ts',
  'src/app/compatibility/free/page.tsx',
  'src/lib/compatibility/invitePairing.ts',
  'src/app/api/compatibility/counselor/route.ts',
  'src/app/api/compatibility/counselor/routeSupport.ts',
  'src/app/api/compatibility/share/invite/route.ts',
]

describe('궁합·초대 출생 tz 경로 — Asia/Seoul 리터럴 없음 (G13)', () => {
  it.each(BIRTH_TZ_PATHS)('%s', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    const hits = src
      .split('\n')
      .map((line, i) => ({ line: i + 1, text: line }))
      .filter((l) => l.text.includes('Asia/Seoul'))
    expect(hits, `${rel}: ${hits.map((h) => `${h.line}: ${h.text.trim()}`).join(' | ')}`).toEqual(
      []
    )
  })

  it('화면 경로는 같은 resolver(resolveBirthTimezoneOnDevice)를 쓴다', () => {
    for (const rel of [
      'src/hooks/useCompatibilityForm.ts',
      'src/app/compatibility/counselor/page.tsx',
      'src/app/compatibility/counselor/CompatPersonPickerModal.tsx',
      'src/app/compatibility/counselor/useCompatCounselorChat.ts',
      'src/app/compatibility/free/page.tsx',
    ]) {
      expect(readFileSync(join(ROOT, rel), 'utf8'), rel).toContain('resolveBirthTimezoneOnDevice')
    }
  })

  it('서버 경로는 엄격 resolver(resolveBirthTimezoneStrict)를 쓴다', () => {
    for (const rel of [
      'src/lib/compatibility/invitePairing.ts',
      'src/app/api/compatibility/counselor/route.ts',
      'src/app/api/compatibility/counselor/routeSupport.ts',
      'src/app/api/compatibility/share/invite/route.ts',
    ]) {
      expect(readFileSync(join(ROOT, rel), 'utf8'), rel).toContain('resolveBirthTimezoneStrict')
    }
  })
})
