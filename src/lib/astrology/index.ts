//src/lib/astrology/index.ts

// 서버 전용 입구. 클라이언트에서 직접 import 금지.

// ======================================================
// 🌞 Natal (기본 차트 / 하위 호환 API)
// ======================================================
export { calculateNatalChart, toChart } from "./foundation/astrologyService";
export type {
  NatalChartInput,    // 차트 생성 입력
  NatalChartData,     // 기본 차트 데이터 형태
  PlanetData,         // 행성 좌표 정보
} from "./foundation/astrologyService";

// ======================================================
// 🪐 Transit / Aspects / Houses (기초 확장 API)
// ======================================================
export { calculateTransitChart } from "./foundation/transit";
export { findAspects, findNatalAspects } from "./foundation/aspects";
export { calcHouses } from "./foundation/houses";

// ======================================================
// 📘 공통 타입 (기초 구조)
// ======================================================
export type {
  Chart,             // 차트 전체 모델
  House,             // 하우스(궁)
  AspectHit,         // 위상 히트 단위
  AspectRules,       // 위상 규칙
  TransitInput,      // 트랜짓 입력 타입
  HouseSystem,       // 하우스 시스템
  AspectType,        // 위상 타입
  ChartMeta,         // 메타 정보 구조
} from "./foundation/types";

// ======================================================
// 🧠 Advanced (테마 / 옵션 / 강화 위상 / 엔진 메타)
// ======================================================
export { resolveOptions, defaultOptions, presets } from "./advanced/options";
export type { AstroOptions, AstroTheme } from "./advanced/options";

export { findAspectsPlus, findNatalAspectsPlus } from "./advanced/aspectsPlus";

export { buildEngineMeta } from "./advanced/meta";
export type { ExtendedMeta } from "./advanced/meta";

// ======================================================
// 🪄 Narrative Engine 및 분석기용 타입 Export
// ======================================================

// ✨ 핵심: 엔진에서 사용하는 구조체 타입
export type { AstrologyChartFacts } from "./foundation/types";