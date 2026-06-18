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
  // 시스템 프롬프트는 buildDestinyCounselorPrompt(프롬프트 모듈), [Meta] 컨텍스트는
  // counselorContextCache 로 추출됨(route 에서 분리). 룰이 *어느 파일이든* 살아
  // 있으면 통과하도록 세 소스의 합집합을 grep 대상으로 둔다.
  const route =
    read('app/api/counselor/realtime/route.ts') +
    read('lib/prompts/destinyCounselorPrompt.ts') +
    read('lib/destiny/counselorContextCache.ts')

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
  // 시스템 프롬프트는 buildCompatibilityCounselorPrompt(프롬프트 모듈)로 분리됨.
  // route + 프롬프트 모듈 합집합을 grep 대상으로 둔다.
  const route =
    read('app/api/compatibility/counselor/route.ts') +
    read('lib/prompts/compatibilityCounselorPrompt.ts')

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
    // (라우트 리팩터로 배열이 cachedUserContextRaw 에 담겨 ko 라벨링을 거친다 —
    //  Raw 접미사를 옵셔널로 허용해 기존 의도만 검증.)
    expect(route).toMatch(/cachedUserContext(?:Raw)?\s*=\s*\[[\s\S]*personsInfo[\s\S]*metaBlock/)
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

  // 개인 타임라인(세운/월운/일진) prompt emit 은 synastry-only 설계로 제거됨.
  // current cycle 계산값(saeunCurrent/wolunCurrent/ilunCurrent)도 이후 통째
  // 제거되어 routeSupport 에 더 이상 존재하지 않는다 → 해당 검증 삭제.

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

describe('궁합 follow-up UI — chip render + sendMessage refactor (#306, 공용 훅 이동 후)', () => {
  // 궁합 상담사 채팅 오케스트레이션이 page.tsx 에서 공용 훅
  // (lib/counselor/useCounselorChat) + compat 어댑터(useCompatCounselorChat)
  // + 채팅 영역 컴포넌트(CompatChatArea)로 분해됨. 가드가 지키려는 *행동*
  // (sendMessage 의 options.isRetry, followUp 칩의 sendMessage(q) 위임,
  // result.followUps 소비, 새 send 시 칩 비움)은 새 위치에서 동일하게 단언.
  const hook = read('lib/counselor/useCounselorChat.ts')
  const compatAdapter = read('app/compatibility/counselor/useCompatCounselorChat.ts')
  const chatArea = read('app/compatibility/counselor/CompatChatArea.tsx')

  it('followUpQuestions state — 공용 훅이 소유', () => {
    expect(hook).toMatch(/setFollowUpQuestions/)
  })

  it('sendMessage 가 (textOverride?: string, options?) signature', () => {
    // 2nd param (options?: { isRetry?, historyOverride? }) 가 retry 배선의
    // 핵심. Prettier 개행을 허용한다.
    expect(hook).toMatch(
      /sendMessage = React\.useCallback\(\s*async \(\s*textOverride\?: string,\s*options\?:/
    )
    expect(hook).toMatch(/isRetry\?: boolean/)
    expect(hook).toMatch(/historyOverride\?: TMsg\[\]/)
  })

  it('isRetry 시 직전 turn 의 idempotencyKey 재사용 (credit 중복 차감 방지)', () => {
    expect(hook).toMatch(/options\?\.isRetry \? lastTurnIdemKeyRef\.current : null/)
  })

  it('streamProcessor result 에서 followUps 받음 (compat 어댑터)', () => {
    expect(compatAdapter).toMatch(/result\.followUps/)
  })

  it('chip pick 시 sendMessage(q) 호출 (분해된 채팅 영역)', () => {
    // 칩 렌더는 FollowUpChips 컴포넌트 — onPick prop 으로 위임.
    expect(chatArea).toMatch(/onPick=\{\(q\) => sendMessage\(q\)\}/)
  })

  it('새 send 시 followUpQuestions 비움 (stale 방지)', () => {
    expect(hook).toMatch(/setFollowUpQuestions\(\[\]\)/)
  })

  it('끊긴 턴 복원 — pendingTurn TTL 가드 유지', () => {
    // 마운트 복원은 localStorage pendingTurn 의 TTL(서버 result 캐시와 동기)
    // 안에서만 시도해야 한다.
    expect(hook).toMatch(/PENDING_TURN_TTL_MS/)
  })
})
