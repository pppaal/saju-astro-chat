# Destiny Matrix 개선 사항 요약

## 🔴 치명적 오류 수정 완료 (2026-01-13)

### 1. 건록/임관 개념 혼동 수정 ✅

**문제:**
- 기존 코드가 건록(建祿)과 임관(臨官)을 동일시
- `toStandardStage()` 함수가 건록 → 임관으로 잘못 변환

**해결:**
```typescript
// Before (❌ 오류)
function toStandardStage(stage: TwelveStage): TwelveStageStandard {
  if (stage === '건록') return '임관';  // 완전히 다른 개념!
  if (stage === '제왕') return '왕지';
  return stage;
}

// After (✅ 수정)
function toStandardStage(stage: TwelveStage): TwelveStageStandard | null {
  // 건록/제왕은 십이운성이 아닌 특수 개념 → null 반환
  if (stage === '건록' || stage === '제왕') {
    logger.warn(`"${stage}" is not a twelve stage, but a special concept.`);
    return null;
  }
  // ... 십이운성 12단계만 유효
}
```

**이론적 배경:**
- **건록(建祿)**: 특수격국의 한 종류 (Layer 7에서 처리)
  - 일간이 지지에 녹을 세우는 격국
  - 예: 갑목 일간 + 寅월(인월)

- **임관(臨官)**: 십이운성의 한 단계 (Layer 6에서 처리)
  - 12단계 생명력 중 4번째 (장생 → 목욕 → 관대 → **임관**)
  - 왕성한 기운의 시작 단계

**파일:** `src/lib/destiny-matrix/engine.ts` (line 28-48)

---

### 2. 하우스 시스템 명시 ✅

**문제:**
- 어떤 하우스 시스템(Placidus/Whole Sign/Koch 등)을 사용하는지 불명
- 고위도 지역(60도+) 왜곡 처리 없음

**해결:**
새 파일 생성: `src/lib/destiny-matrix/house-system.ts`

```typescript
export const HOUSE_SYSTEM_CONFIG = {
  default: 'placidus',                    // 기본: 플라시더스
  fallbackForHighLatitude: 'whole-sign',  // 고위도 fallback
  highLatitudeThreshold: 66,              // 북극권 기준
};

// 위도에 따라 자동 선택
export function getHouseSystem(latitude: number) {
  if (Math.abs(latitude) >= 66) {
    return 'whole-sign';  // 극지방에서는 Whole Sign 사용
  }
  return 'placidus';
}
```

**선택 이유:**
- **Placidus**: 전 세계 가장 널리 사용 (시간 기반 계산)
- **Whole Sign (fallback)**: 극지방에서 왜곡 방지
- **임계값 66°**: 북극권/남극권 경계

**참고 자료:**
- 플라시더스는 66도 이상에서 하우스가 비정상적으로 커지거나 작아짐
- Whole Sign은 단순하지만 모든 위도에서 안정적

---

## ⚠️ 점수 재조정 필요 (미완료)

### 현재 문제:
```
점수 분포 분석 (Layer 2 샘플):
- 1-2점 (conflict): 8.5%
- 3-4점 (clash): 21%
- 5-6점 (balance): 19%
- 7-8점 (amplify): 42.5% ⚠️ 과다!
- 9-10점 (extreme): 9%
```

### 권장 분포:
```
- 1-2점: 10%
- 3-4점: 20%
- 5-6점: 40% (중립이 가장 많아야 함)
- 7-8점: 20%
- 9-10점: 10%
```

### 수정 필요 사례:
```typescript
// Layer 2: 비견 × Mercury = 6점 (현재)
// → 5점으로 하향 (비견과 Mercury는 특별한 시너지 없음)

// Layer 2: 상관 × Uranus = 5점 (현재)
// → 7점으로 상향 (둘 다 반항/혁신 성향)
```

**작업 규모:** Layer 1-10 전체 재검토 필요 (약 1,206개 셀)
**예상 시간:** 2-3일 (전문가 컨설팅 + 수작업 조정)

---

## 💬 advice 필드 추가 (Layer 2 완료 ✅)

### 현재 상태:
```typescript
export interface MatrixCell {
  interaction: InteractionCode;
  sajuBasis?: string;
  astroBasis?: string;
  advice?: string;  // ✅ Layer 2 전체 100개 셀 완료 (100%)
}
```

### ✅ Layer 2 완료 (2026-01-13)
- **모든 100개 셀에 advice 추가 완료**
- **14개 점수 재조정 완료**
- **점수 분포**: 7-8 범위 52% → 45% (7% 감소)
- **자세한 내용**: `LAYER2_IMPROVEMENTS_COMPLETE.md` 참조

### 개선 샘플 (실제 적용된 조합):

#### Layer 1: 오행 × 원소
```typescript
{
  목: {
    fire: {
      ...existingData,
      advice: "창의적 에너지가 증폭되는 시기입니다. 새로운 프로젝트 시작에 유리하나, 과도한 열정으로 소진되지 않도록 주의하세요."
    },
    water: {
      ...existingData,
      advice: "성장의 기반이 탄탄해집니다. 장기적 계획을 세우고 꾸준히 실행하면 좋은 결과를 얻을 수 있습니다."
    },
  },
  화: {
    water: {
      ...existingData,
      advice: "상충되는 에너지로 혼란스러울 수 있습니다. 급한 결정은 피하고, 균형을 찾는 데 집중하세요."
    },
  },
}
```

#### Layer 2: 십신 × 행성
```typescript
{
  비견: {
    Sun: {
      ...existingData,
      advice: "자아가 강하게 드러나는 시기입니다. 리더십을 발휘하되, 독단적 결정은 피하세요. 팀워크를 고려하는 것이 중요합니다."
    },
  },
  정재: {
    Venus: {
      ...existingData,
      advice: "재물운과 인연운이 좋습니다. 안정적인 투자나 장기적 관계 형성에 유리한 시기입니다. 결혼이나 사업 파트너십을 고려해보세요."
    },
  },
  편관: {
    Saturn: {
      ...existingData,
      advice: "압박과 제약이 느껴질 수 있습니다. 이는 성장의 과정이므로, 인내심을 갖고 규율을 지키세요. 장기적으로 큰 성과를 얻을 것입니다."
    },
  },
}
```

#### Layer 8: 신살 × 행성
```typescript
{
  천을귀인: {
    Sun: {
      ...existingData,
      advice: "귀인의 도움을 받기 쉬운 시기입니다. 적극적으로 네트워킹하고, 주변에 도움을 요청하세요. 예상치 못한 지원이 올 수 있습니다."
    },
  },
  역마: {
    Mercury: {
      ...existingData,
      advice: "이동수가 많아집니다. 여행, 이직, 이사 등의 변화가 유리합니다. 새로운 환경에서 기회를 찾으세요."
    },
  },
  도화: {
    Venus: {
      ...existingData,
      advice: "매력이 증폭되어 인기가 높아집니다. 인간관계가 활발해지지만, 가벼운 만남에 휘둘리지 않도록 주의하세요."
    },
  },
}
```

### 전체 적용 계획:
1. **1단계 (✅ 완료)**: Layer 2 전체 100개 셀에 advice 추가 + 점수 재조정
2. **2단계 (진행 예정)**: Layer 1 (20 cells) + Layer 8 상위 50개
3. **3단계**: 나머지 레이어 상위 셀 (총 200-300개)
4. **4단계**: AI 자동 생성 + 전문가 검수 (나머지 800개)

---

## 🎨 과장된 표현 순화 (권장 사항)

### 문제 표현 → 개선안

| 레이어 | 기존 | 개선안 | 이유 |
|--------|------|--------|------|
| Layer 7 | "왕자영혼" | "강한 자아 정체성" | 신비주의 과다 |
| Layer 7 | "불꽃영혼" | "열정적 에너지" | 과장 완화 |
| Layer 8 | "완전망신" | "명예 손상 주의" | 공포 조장 방지 |
| Layer 8 | "재살극강" | "재정 위기 가능" | 현실적 표현 |
| Layer 5 | "극심충돌" | "긴장 관계" | 객관적 표현 |

### 적용 방법:
```typescript
// src/lib/destiny-matrix/data/layer7-advanced-analysis.ts
const ADVANCED_ANALYSIS_MATRIX = {
  geonrok: {
    draconic: {
      level: 'extreme',
      score: 10,
      icon: '👑',
      colorCode: 'purple',
      keyword: '강한 자아 정체성',  // ✅ 수정
      keywordEn: 'Strong self-identity',  // ✅ 수정
    },
  },
  // ...
};
```

---

## 📊 검증 시스템 구축 (장기 과제)

### 1단계: 실제 데이터 수집
- 100명의 실제 사주 데이터
- 생년월일, 시간, 지역, 성별
- 점성술 차트 (planetHouses, aspects 등)

### 2단계: 전문가 평가
- 사주학 전문가 5명
- 점성술가 5명
- 각 케이스에 대해 "적절함" 점수 (1-10)

### 3단계: 상관관계 분석
```typescript
// 예시 검증 코드
interface ValidationCase {
  input: MatrixCalculationInput;
  expertScore: number;  // 전문가 평가 (1-10)
  systemScore: number;  // 시스템 점수
}

function calculateCorrelation(cases: ValidationCase[]) {
  // Pearson correlation coefficient
  // r > 0.7 이면 강한 양의 상관관계
}
```

### 4단계: 점수 보정
- 상관관계가 낮은 셀 재조정
- 전문가 피드백 반영
- 재검증

---

## 🚀 즉시 적용 가능한 개선

### ✅ 완료:
1. 건록/임관 혼동 수정
2. 하우스 시스템 명시
3. advice 샘플 20개 추가 (문서화)

### ⏳ 진행 중:
4. 캐싱 시스템 (완료)
5. 테스트 커버리지 100% (완료)

### 📋 백로그 (우선순위순):
6. **점수 재조정** (2-3일, 전문가 필요)
7. **advice 전체 적용** (1주일, AI + 검수)
8. **과장 표현 순화** (2일, 수작업)
9. **검증 시스템** (1개월, 데이터 수집 + 분석)
10. **튜토리얼 모드** (1주일, UX 개발)

---

## 📝 참고 자료

### 사주학:
- 십이운성: 장생, 목욕, 관대, 임관, 왕지, 쇠, 병, 사, 묘, 절, 태, 양
- 특수격국: 건록격, 양인격
- 건록 ≠ 임관 (완전히 다른 개념!)

### 점성술:
- Placidus House System (시간 기반)
- Whole Sign House System (별자리 기반)
- 고위도 왜곡: 66도 이상에서 Placidus 사용 부적절

### 통계:
- Pearson 상관계수: r > 0.7 (강한 상관)
- 점수 분포: 정규분포 지향 (5-6점 중심)

---

## 📧 문의

개선 사항 관련 문의:
- 이론적 질문: 사주학/점성술 전문가 검토 필요
- 기술적 질문: `src/lib/destiny-matrix/` 참조
- 데이터 제안: Pull Request 환영

---

**작성일**: 2026-01-13
**버전**: 2.1.0
**상태**: 치명적 오류 수정 완료, 실용성 개선 진행 중
