// src/lib/saju/core/birthInstant.ts
//
// 도메인 무관 시간 변환 helper 는 lib/datetime/ 으로 이동했다 (점성/타로도
// 같은 변환 규칙을 써야 일관). 이 파일은 BC 위해 re-export 만 유지.
//
// 새 코드는 `@/lib/datetime` 에서 직접 import 하라.

export { buildBirthInstant, type BirthInstant } from '@/lib/datetime/birthInstant'
