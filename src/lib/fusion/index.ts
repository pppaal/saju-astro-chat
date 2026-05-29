// 사주/점성 normalizer adapters — counselor realtime 등에서 raw 데이터를
// 통일된 형태로 만드는 용도. fusion cross-rules 엔진은 dead code 라 제거됨
// (자세한 내력 git history). 차트 / 통합 분석이 필요하면 여기서 다시 시작.
export { buildSajuNormalizerInput } from './adapters/saju'
export { buildAstroNormalizerInput } from './adapters/astro'
export type { SajuNormalizerInput } from './normalizer/saju'
export type { AstroNormalizerInput } from './normalizer/astro'
