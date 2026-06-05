/**
 * 이번 세션의 운명/궁합 상담사 fix 회귀 보호.
 *
 * 각 fix 가 *코드의 어디에* 들어갔는지 fs.readFile + regex grep 으로
 * 검사. unit test 가 아니라 grep-style guard — 리팩토링 중 누가
 * 무심코 한 줄 빼면 catch. trade-off: false negative (rule 이
 * paraphrase 되면 통과) 가능. 그러나 이번 세션 fix 들은 "정확한
 * 텍스트 라인 추가" 라 grep 으로 충분.
 *
 * 관련 PR:
 *   #298 birthCityUnknown skipAngles
 *   #306 [Meta] raw birthDate + BirthInfoModal PATCH + ||FOLLOWUP|| 룰
 *   #306 궁합 prompt 정합 (말투/통합/[Meta])
 *   #317 PersonCard 톤 + CircleAddModal 제거
 *   #319 사주 측 세운/월운/일진 timingBlock 복구
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = (p: string) => join(process.cwd(), 'src', p)
const read = (p: string) => readFileSync(SRC(p), 'utf-8')

describe('운명상담사 (route.ts) — system prompt + cachedUserContext', () => {
  const route = read('app/api/counselor/realtime/route.ts')

  it('system prompt 에 "다정한 멘토" 톤 한 줄 (#293)', () => {
    expect(route).toMatch(/다정.*공감.*따뜻한 멘토/)
    expect(route).toMatch(/warm.*empathetic mentor/i)
  })

  it('system prompt 에 두 시스템 통합 디테일 (#293)', () => {
    expect(route).toMatch(/하나의 비유\/스토리로 엮/)
    expect(route).toMatch(/weave them into one metaphor\/story/i)
  })

  it('system prompt 에 [Meta] 룰 (#293)', () => {
    expect(route).toMatch(/\[Meta\] 의 birthTimeUnknown=true.*인용 금지/)
    expect(route).toMatch(/\[Meta\] has birthTimeUnknown=true/)
  })

  it('system prompt 에 ||FOLLOWUP|| 마커 룰 (#306)', () => {
    expect(route).toContain('||FOLLOWUP||')
    expect(route).toMatch(/정확히 2개/)
    expect(route).toMatch(/Exactly 2\b/)
  })

  it('[Meta] 라인에 raw birthDate / birthTime / location / timezone (#306)', () => {
    expect(route).toMatch(/\[Meta\] birthDate: \$\{body\.birthDate\}/)
    expect(route).toMatch(/birthTime: \$\{timeTag\}/)
    expect(route).toMatch(/location: \$\{locTag\}/)
    expect(route).toMatch(/timezone: \$\{body\.timezone/)
  })

  it('birthCityUnknown 시 위치 의존 결론 금지 — prompt rule (#298)', () => {
    // formatAstroSelf/skipAngles 체인은 slim 리팩터(#426)로 제거됨. 이제
    // birthCityUnknown 가드는 시스템 프롬프트 룰로 enforce.
    expect(route).toMatch(/birthCityUnknown=true면 위치 의존 결론 금지/)
    expect(route).toMatch(/birthCityUnknown=true: skip place-dependent claims/i)
  })

  it('priorTurns 가 frontend 메시지 그대로 (clamp 없음)', () => {
    // route.ts 내부에 clampMessages 호출이 없어야 (이번 세션 후로
    // 운명상담사는 client 가 alread cap). 운명만, 궁합과 구분.
    expect(route).not.toMatch(/clampMessages/)
  })

  it('메시지당 과금 (per-message billing)', () => {
    // 빌링 모델이 세션당(CREDIT_PER_SESSION/세션키 추적)에서 다시
    // 메시지당 1 credit 차감으로 단순화됨. canUseCredits + consumeCredits
    // 로 매 메시지 차감하며, 옛 세션키 마커는 더 이상 없다.
    expect(route).toMatch(/canUseCredits/)
    expect(route).toMatch(/consumeCredits/)
    expect(route).not.toMatch(/CREDIT_PER_SESSION/)
    expect(route).not.toMatch(/counselor:session:/)
  })

  it('스트림 빈 응답 시 크레딧 환불 배선 (stream refund)', () => {
    // 차감했는데 스트림이 빈 응답이면 onFailure 에서 refundCredits 로 원복.
    expect(route).toMatch(/refundCredits/)
    expect(route).toMatch(/onFailure/)
    expect(route).toMatch(/counselor_stream_empty/)
  })
})

describe('궁합상담사 (route.ts) — system prompt + cachedUserContext', () => {
  const route = read('app/api/compatibility/counselor/route.ts')

  it('system prompt 에 "다정한 멘토" 톤 한 줄 (#306)', () => {
    expect(route).toMatch(/다정.*공감.*따뜻한 멘토/)
    expect(route).toMatch(/warm.*empathetic mentor/i)
  })

  it('system prompt 에 두 시스템 통합 디테일 (#306)', () => {
    expect(route).toMatch(/같은 방향을 가리킬 때.*하나의 비유\/스토리/)
    expect(route).toMatch(/same way for one side.*one metaphor\/story/i)
  })

  it('system prompt 에 [Meta] 룰 (운명과 동일 패턴) (#306)', () => {
    // 필드명이 timeUnknown / cityUnknown 으로 단순화됨 (KO/EN 동일).
    expect(route).toMatch(/\[Meta\] timeUnknown=true →.*시주/)
    expect(route).toMatch(/\[Meta\] timeUnknown=true →.*hour pillar/i)
  })

  it('system prompt 에 ||FOLLOWUP|| 마커 룰 (#306)', () => {
    expect(route).toContain('||FOLLOWUP||')
    expect(route).toMatch(/정확히 2개/)
    expect(route).toMatch(/Exactly 2\b/)
  })

  it('[Meta] cachedUserContext 안에 A/B 각자 emit (#306)', () => {
    // location/timezone 은 LLM 한테 무의미라 Meta 에서 제거됨. unknown
    // 플래그만 emit (timeUnknown / cityUnknown).
    expect(route).toMatch(/\[Meta\] \$\{label\}: timeUnknown=\$\{timeUnknown\}/)
    expect(route).toMatch(/cityUnknown=\$\{cityUnknown\}/)
  })

  it('cachedUserContext 에 metaBlock 포함 (#306)', () => {
    // personsInfo 다음에 metaBlock 가 cachedUserContext 에 합쳐져야.
    expect(route).toMatch(/cachedUserContext\s*=\s*\[[\s\S]*personsInfo[\s\S]*metaBlock/)
  })

  it('self(개인) 블록 없음 — synastry-only 보장 (#449)', () => {
    // 이전엔 self 블록을 만들어 void 처리했지만, #449에서 self 차트 블록
    // 자체를 제거 (synastry-only). self 포매터 호출이 없어야 한다.
    expect(route).not.toMatch(/formatSajuSelf\s*\(/)
    expect(route).not.toMatch(/formatAstroSelf\s*\(/)
  })
})

describe('궁합 timingBlock — 사주 시기 (세운/월운/일진) (#319)', () => {
  const support = read('app/api/compatibility/counselor/routeSupport.ts')

  // 개인 타임라인(세운/월운/일진) 텍스트 prompt emit 은 synastry-only 설계로
  // 제거됨 — renderSide 의 saju timing block / KO·EN 라벨 / dateStr emit 은
  // 더 이상 존재하지 않는다. 단, current cycle 계산값은 synastry 용으로 유지.

  it('saeunCurrent / wolunCurrent / ilunCurrent 모두 계산', () => {
    expect(support).toContain('saeunCurrent')
    expect(support).toContain('wolunCurrent')
    expect(support).toContain('ilunCurrent')
  })

  it('옛 stale 코멘트 ("already in the cached saju table") 제거', () => {
    // sajuTableFormatter 는 Phase D (2026-06-06) 에 dead 로 제거됐지만,
    // 옛 가정 코멘트가 다시 들어오면 같은 stale 패턴 반복 가능 → 가드 유지.
    expect(support).not.toMatch(/already in the cached saju table/)
  })
})

describe('BirthInfoModal handleSave — DB sync (#306)', () => {
  const modal = read('app/(main)/components/BirthInfoModal.tsx')

  it('handleSave 가 async (PATCH await 필요)', () => {
    expect(modal).toMatch(/const handleSave = async \(\)/)
  })

  it('PATCH /api/me/profile 호출', () => {
    expect(modal).toMatch(/fetch\(['"]\/api\/me\/profile['"][\s\S]*method:\s*['"]PATCH['"]/)
  })

  it('payload 에 birthDate / birthTime / gender / birthCity', () => {
    expect(modal).toMatch(
      /JSON\.stringify\(\{[\s\S]*birthDate[\s\S]*birthTime[\s\S]*gender[\s\S]*birthCity/
    )
  })

  it('PATCH 실패 catch (게스트 401 swallow)', () => {
    // try { fetch... } catch { /* localStorage already saved */ } 패턴.
    expect(modal).toMatch(/try \{[\s\S]*fetch\(['"]\/api\/me\/profile[\s\S]*\} catch/)
  })

  it('localStorage 저장 (saveBirthInfo) 도 그대로 유지', () => {
    expect(modal).toMatch(/saveBirthInfo\(payload\)/)
  })
})

describe('PersonCard — BirthInfoModal 톤 + CircleAddModal 제거 (#317)', () => {
  const card = read('app/compatibility/components/form/PersonCard.tsx')

  it('CircleAddModal import 제거', () => {
    expect(card).not.toMatch(/import.*CircleAddModal/)
    expect(card).not.toMatch(/<CircleAddModal/)
  })

  it('Plus 아이콘 (지인 추가 CTA) 제거', () => {
    expect(card).not.toMatch(/from\s+['"]lucide-react['"].*\bPlus\b/)
    expect(card).not.toMatch(/<Plus\s/)
  })

  it('showAddCircle state 제거', () => {
    expect(card).not.toMatch(/showAddCircle/)
  })

  // #475 화이트 디자인 이행: violet+navy → white/ink 톤. 카드/인풋/필드 위임을
  // 현재 디자인 토큰으로 검증한다.
  it('카드 배경: 화이트 톤 (white bg + hairline border)', () => {
    expect(card).toMatch(/border-\[#e7e5e4\]/)
    expect(card).toMatch(/bg-white/)
  })

  it('input 톤: 화이트 배경 + hairline border', () => {
    expect(card).toMatch(/border-\[#e0ddd7\]/)
    expect(card).toMatch(/bg-white/)
  })

  it('생년월일/시간/성별 필드는 공용 BirthInfoFields(라이트 톤)로 위임', () => {
    expect(card).toMatch(/BirthInfoFields/)
    expect(card).toMatch(/lightFieldClasses/)
  })

  it('cyan/indigo 색상 톤 완전 제거 (잔재 catch)', () => {
    expect(card).not.toMatch(/cyan-/)
    expect(card).not.toMatch(/indigo-/)
  })

  it('지인 dropdown UI 는 유지 (불러오기 기능)', () => {
    expect(card).toMatch(/onFillFromCircle/)
    expect(card).toMatch(/onToggleLoadDropdown/)
    expect(card).toMatch(/data-circle-dropdown/)
  })

  it('"내 프로필 불러오기" (idx 0) 유지', () => {
    // '내 정보'(me) 항목은 onLoadOption 경로로 통합됨 (옛 loadMyProfile 단일 버튼 대체).
    expect(card).toMatch(/onLoadOption/)
    expect(card).toMatch(/o\.key === 'me'/)
  })
})

describe('궁합 follow-up UI (page.tsx) — chip render + sendMessage refactor (#306)', () => {
  const page = read('app/compatibility/counselor/page.tsx')

  it('followUpQuestions state 추가', () => {
    expect(page).toMatch(/setFollowUpQuestions/)
  })

  it('sendMessage 가 (textOverride?: string, options?) signature', () => {
    // 2nd param (options?: { isRetry?: boolean }) 가 retry 배선 위해 추가됨.
    expect(page).toMatch(
      /sendMessage = useCallback\(\s*async \(textOverride\?: string, options\?:/
    )
  })

  it('streamProcessor result 에서 followUps 받음', () => {
    expect(page).toMatch(/result\.followUps/)
  })

  it('chip pick 시 sendMessage(q) 호출', () => {
    // 칩 렌더가 FollowUpChips 컴포넌트로 추출됨 — onPick prop 으로 위임.
    expect(page).toMatch(/onPick=\{\(q\) => sendMessage\(q\)\}/)
  })

  it('새 send 시 followUpQuestions 비움 (stale 방지)', () => {
    expect(page).toMatch(/setFollowUpQuestions\(\[\]\)/)
  })
})
