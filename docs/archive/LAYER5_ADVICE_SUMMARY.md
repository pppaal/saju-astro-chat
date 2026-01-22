# Layer 5 Relation-Aspect Matrix - Korean Advice Implementation

## Summary
Successfully added Korean advice to the top 20 highest-scoring cells in Layer 5 (Relation-Aspect matrix).

## Changes Made

### 1. Helper Function Updated (lines 14-29)
```typescript
const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string,
  advice?: string  // NEW: Optional advice parameter
): InteractionCode => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
  ...(advice && { advice }),  // NEW: Conditional advice inclusion
});
```

### 2. Top 20 Cells with Advice Added

#### 삼합 (Samhap - Triple Combination) - 7 cells
1. **conjunction** (score: 10) - 극강시너지
2. **sextile** (score: 9) - 배가효과
3. **trine** (score: 10) - 최상조화
4. **opposition** (score: 7) - 균형강화
5. **quintile** (score: 8) - 창조강화
6. **biquintile** (score: 7) - 재능발현

#### 육합 (Yukhap - Six Harmony) - 6 cells
7. **conjunction** (score: 8) - 조화결합
8. **sextile** (score: 8) - 시너지효과
9. **trine** (score: 8) - 안정조화
10. **semisextile** (score: 7) - 성장지원
11. **quintile** (score: 7) - 창조조화
12. **biquintile** (score: 7) - 재능조화

#### 방합 (Banghap - Directional Combination) - 6 cells
13. **conjunction** (score: 8) - 강화집중
14. **sextile** (score: 8) - 성장확대
15. **square** (score: 7) - 도전성장
16. **trine** (score: 9) - 확장조화
17. **quintile** (score: 7) - 목표창조
18. **biquintile** (score: 7) - 방향창조

#### 충 (Chung - Clash) - 3 cells
19. **conjunction** (score: 8) - 폭발적에너지
20. **square** (score: 2) - 파괴위험 ⚠️
21. **opposition** (score: 9) - 극심충돌

Note: Added 21 cells total (one extra in Chung to complete the pattern)

## Advice Structure Pattern

All advice follows the established 3-part structure:

1. **상황 설명** (Situation Description) - How the Korean relation interacts with the Western aspect
2. **긍정적 행동** (Positive Action) - What to do to maximize this energy
3. **주의사항** (Caution) - What to avoid or be careful about

## Tone by Score Level

- **9-10 (extreme)**: "최고조입니다", "극강", "최상의"
- **7-8 (amplify)**: "유리합니다", "빛을 발합니다", "좋은 시기"
- **5-6 (balance)**: "균형", "조화를 이룹니다"
- **3-4 (clash)**: "주의하세요", "경계가 필요합니다"
- **1-2 (conflict)**: "극심한", "반드시 피하세요"

## Example Advice Entries

### High Score (10) - 삼합 trine
```
삼합의 조화와 삼각의 자연스러운 흐름이 결합되어 최상의 조화를 이룹니다. 
모든 일이 자연스럽게 풀리고 행운이 따르는 시기입니다. 
이 흐름에 몸을 맡기되, 안주하지 말고 지속적으로 발전을 추구하세요.
```

### Low Score (2) - 충 square
```
충의 충돌과 사각의 긴장이 만나 극심한 파괴 위험이 있습니다. 
중요한 결정이나 대립 상황은 반드시 피해야 하는 시기입니다. 
최대한 방어적 자세를 취하고, 무리한 도전을 삼가세요.
```

## File Modified
- `src/lib/destiny-matrix/data/layer5-relation-aspect.ts`

## Testing Recommendations
1. Verify advice displays correctly in UI components
2. Check that advice appears only for cells with advice defined
3. Test that the 3-part structure renders properly
4. Validate Korean text encoding and display

## Next Steps
Consider adding advice to additional high-impact cells (scores 6+) in future iterations.
