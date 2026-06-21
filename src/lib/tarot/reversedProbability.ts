// 타로 역방향(reversed) 확률 단일 출처(SSOT).
//
// 클래리파이어("한 장 더") · 일반 뽑기(/api/tarot) · 데일리(/api/tarot/daily)
// 세 군데가 각자 0.15 를 하드코딩하고 있어, 한 곳만 바꾸면 나머지가 조용히
// 어긋났다(같은 제품인데 흐름마다 역방향 비율이 다른 회귀). 한 상수에서 파생.
//
// 50% 는 부정 카드 비중이 과해 부담된다는 피드백으로 15% 로 통일.
export const TAROT_REVERSED_PROBABILITY = 0.15

// 데일리는 사용자/날짜 해시 바이트(0-255)로 *결정적*으로 역방향을 정한다.
// 같은 확률을 바이트 임계값으로 환산: byte < threshold 이면 역방향.
// Math.round(0.15 * 256) = 38 → 약 15%.
export const TAROT_REVERSED_BYTE_THRESHOLD = Math.round(TAROT_REVERSED_PROBABILITY * 256)
