//src/lib/astrology/index.ts

// 서버 전용 입구. 클라이언트에서 직접 import 금지.

// ======================================================
// 🌞 Natal (기본 차트 / 하위 호환 API)
// ======================================================
export { calculateNatalChart, toChart } from './foundation/astrologyService'
export type {} from // 차트 생성 입력
// 기본 차트 데이터 형태
// 행성 좌표 정보
'./foundation/astrologyService'

// ======================================================
// 🪐 Transit / Aspects / Houses (기초 확장 API)
// ======================================================
export { calculateTransitChart } from './foundation/transit'

export { findAspects, findNatalAspects } from './foundation/aspects'
// ======================================================
// 📘 공통 타입 (기초 구조)
// ======================================================
export type {
  // 차트 전체 모델
  // 행성 기본 타입
  // 하우스(궁)
  // 위상 히트 단위
  AspectRules, // 위상 규칙
  // 트랜짓 입력 타입
  // 하우스 시스템
  // 위상 타입
  ChartMeta, // 메타 정보 구조
  // 별자리 한글 타입
} from './foundation/types'

// ======================================================
// 🧠 Advanced (테마 / 옵션 / 강화 위상 / 엔진 메타)
// ======================================================
export { resolveOptions } from './advanced/options'

export { findAspectsPlus, findNatalAspectsPlus } from './advanced/aspectsPlus'

export { buildEngineMeta } from './advanced/meta'

// ======================================================
// ⭐ Extra Points (Chiron, Lilith, Part of Fortune, Vertex)
// ======================================================

// ======================================================
// 🔄 Progressions (Secondary Progressions, Solar Arc)
// ======================================================

// Note: ProgressedAspect type removed - not exported from progressions module

// ======================================================
// 🎂 Returns (Solar Return, Lunar Return)
// ======================================================

// ======================================================
// 💕 Synastry (두 차트 비교)
// ======================================================

// (Composite/Midpoints 재수출 제거 — foundation 모듈이 사장돼 코드째 삭제됨.
//  라이브 합성차트는 lib/compatibility/compositeChartFormatter 가 자체 구현.)

// ======================================================
// ⭐ Fixed Stars (항성)
// ======================================================

// ======================================================
// 🌑 Eclipses (이클립스)
// ======================================================

// ======================================================
// 🪄 Narrative Engine 및 분석기용 타입 Export
// ======================================================

// ✨ 핵심: 엔진에서 사용하는 구조체 타입

// ======================================================
// 📅 Electional Astrology (택일 점성학)
// ======================================================

// (Draconic/Harmonics/Asteroids 재수출 제거 — Hellenistic 정통 단일화로
//  추출기 등록 해제 후 소비처 0 이라 foundation 모듈째 삭제됨. git 히스토리 복원 가능.)
