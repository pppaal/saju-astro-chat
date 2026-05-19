// astrology/themes/types.ts
// 캘린더 엔진과 free-report가 함께 쓰는 5대 테마 키.
//
// 옛 18개 (love/money/career/family/health/personality/study/children/parents/
// travel/social/business/reputation/spirituality/karma/crisis/creativity/legal)
// → 사용자가 실제로 묻는 5분류로 통합:
//   - love     ← love, family, children, parents (가까운 인간관계)
//   - money    ← money, business
//   - career   ← career, study, reputation, legal (사회적 성취·평판·계약)
//   - health   ← health, crisis (몸·위기)
//   - growth   ← personality, creativity, spirituality, social, karma, travel
//                (자기·확장)
//
// 18테마 시절 themes 배열은 dedupe해서 5테마 안에 들어가도록 매핑됨.
//
// LifeReport 의 9 챕터 (career/love/children/money/health/family/wisdom/
// creativity/spirituality) 와의 대응 — 캘린더는 데일리 점수 5축, 리포트는
// 깊이 9챕터로 의도적으로 다름:
//   - love (calendar) ⇄ love + children + family (report) — 가까운 인연
//   - money           ⇄ money
//   - career          ⇄ career
//   - health          ⇄ health
//   - growth          ⇄ wisdom + creativity + spirituality (자기 성장 축)

export type AstroThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'
