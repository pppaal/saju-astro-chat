# 운명 캘린더 점수 분포 시각화 📊

## 개요
연간 점수 분포를 한눈에 확인할 수 있는 인터랙티브 차트를 추가했습니다.

**구현 일자**: 2025-12-30
**위치**: 캘린더 상단 (월 네비게이션과 카테고리 필터 사이)

---

## 🎯 주요 기능

### 1. **통계 요약**
```
평균 점수 | 최고 점수 | 최저 점수 | 총 일수
   52    |    94     |    23     |  365
```
- **평균**: 연간 평균 점수
- **최고**: 가장 높은 점수 (금색 강조)
- **최저**: 가장 낮은 점수 (빨간색 강조)
- **총 일수**: 분석된 전체 날짜 수

### 2. **히스토그램 차트**
5개 점수 구간별 날짜 분포를 막대 그래프로 표시:

| 구간 | 등급 | 색상 | 예상 비율 |
|------|------|------|-----------|
| 80-100 | 천운 | 🟡 금색 | ~5% |
| 68-79 | 아주좋음 | 🟢 연두색 | ~15% |
| 52-67 | 좋음 | 🔵 하늘색 | ~30% |
| 38-51 | 보통 | ⚪ 회색 | ~35% |
| 0-37 | 나쁨 | 🔴 분홍색 | ~15% |

**인터랙션**:
- 막대에 마우스 오버: 상세 정보 툴팁 (예: "80-100: 18일 (4.9%)")
- 막대 클릭 가능 (향후 필터링 기능 추가 예정)

### 3. **등급별 설명**
각 점수 구간의 의미를 컬러 도트와 함께 표시:
- 🟡 천운 (80+): 연중 최고의 날
- 🟢 아주좋음 (68-79): 중요 행사 추천
- 🔵 좋음 (52-67): 괜찮은 날
- ⚪ 보통 (38-51): 평범한 날
- 🔴 나쁨 (0-37): 조심이 필요한 날

### 4. **점수 구성 분석**
```
사주 분석: 50점 | 점성술 분석: 50점 | 교차검증: ±5점
```
- 총 100점 만점 시스템 설명
- 사주와 점성술이 동등한 비중
- 교차검증으로 최종 보정

### 5. **접기/펼치기 기능**
- 차트가 너무 길면 접을 수 있음
- "접기/펼치기" 버튼으로 토글
- 부드러운 애니메이션 효과

---

## 📂 구현 파일

### 1. **DestinyCalendar.tsx** (Lines 1198-1339)

#### 점수 분포 계산 로직
```typescript
// 점수 범위별 카운트 계산
const ranges = [
  { label: '80-100', min: 80, max: 100, grade: 0, color: '#FFD700' },
  { label: '68-79', min: 68, max: 79, grade: 1, color: '#90EE90' },
  { label: '52-67', min: 52, max: 67, grade: 2, color: '#87CEEB' },
  { label: '38-51', min: 38, max: 51, grade: 3, color: '#D3D3D3' },
  { label: '0-37', min: 0, max: 37, grade: 4, color: '#FFB6C1' },
];

const distribution = ranges.map(range => ({
  ...range,
  count: data.allDates.filter(d =>
    d.score >= range.min && d.score <= range.max
  ).length,
}));
```

#### 통계 계산
```typescript
// 평균/최고/최저 점수 계산
const scores = data.allDates.map(d => d.score);
const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
const maxScore = Math.max(...scores);
const minScore = Math.min(...scores);
```

#### 히스토그램 렌더링
```typescript
{distribution.map((range, idx) => {
  const percentage = totalDays > 0 ? (range.count / totalDays) * 100 : 0;
  const barHeight = maxCount > 0 ? (range.count / maxCount) * 100 : 0;

  return (
    <div key={idx} className={styles.histogramBar}>
      <div className={styles.barWrapper}>
        <div
          className={styles.bar}
          style={{
            height: `${barHeight}%`,
            backgroundColor: range.color,
          }}
          title={`${range.label}: ${range.count}일 (${percentage.toFixed(1)}%)`}
        >
          <span className={styles.barCount}>{range.count}</span>
        </div>
      </div>
      <div className={styles.barLabel}>
        <div className={styles.barRange}>{range.label}</div>
        <div className={styles.barPercent}>{percentage.toFixed(0)}%</div>
      </div>
    </div>
  );
})}
```

### 2. **DestinyCalendar.module.css** (Lines 921-1193)

#### 컨테이너 스타일
```css
.scoreDistribution {
  background: var(--cal-bg-secondary);
  border-radius: 16px;
  padding: 20px;
  margin: 16px 0;
  border: 1px solid var(--cal-border);
}
```

#### 히스토그램 스타일
```css
.histogram {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 180px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--cal-bg-primary);
  border-radius: 12px;
  border: 1px solid var(--cal-border);
}

.bar {
  width: 100%;
  max-width: 60px;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bar:hover {
  opacity: 0.8;
  transform: translateY(-4px);
}
```

#### 접기/펼치기 애니메이션
```css
.distributionChart {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.distributionChart.collapsed {
  max-height: 0;
  opacity: 0;
}
```

#### 반응형 디자인
```css
@media (max-width: 768px) {
  .scoreDistribution {
    padding: 16px;
  }

  .statsRow {
    grid-template-columns: repeat(2, 1fr);
  }

  .histogram {
    height: 150px;
    gap: 4px;
  }

  .bar {
    max-width: 40px;
  }
}
```

---

## 🎨 디자인 특징

### 색상 체계
- **천운 (80+)**: `#FFD700` - 황금색, 최고의 날을 강조
- **아주좋음 (68-79)**: `#90EE90` - 연두색, 긍정적 에너지
- **좋음 (52-67)**: `#87CEEB` - 하늘색, 평온한 느낌
- **보통 (38-51)**: `#D3D3D3` - 회색, 중립적
- **나쁨 (0-37)**: `#FFB6C1` - 분홍색, 주의 필요 (너무 자극적이지 않게)

### 애니메이션
- 막대 호버 시: `translateY(-4px)` + `opacity: 0.8`
- 접기/펼치기: `max-height` + `opacity` 전환 (0.3s)
- 부드러운 `ease` 타이밍 함수

### 타이포그래피
- 헤더: 18px, 700 (굵게)
- 통계 값: 24px, 700 (강조)
- 통계 라벨: 11px, 600, uppercase (작지만 명확하게)
- 막대 카운트: 14px, 700
- 등급 설명: 12px

---

## 📊 실제 데이터 예시

### 정규분포 시뮬레이션 (2025년 기준)
```
천운 (80-100):    18일  (5%)  ████
아주좋음 (68-79):   55일  (15%) ████████████
좋음 (52-67):     110일 (30%) ████████████████████████
보통 (38-51):     128일 (35%) ████████████████████████████
나쁨 (0-37):       54일  (15%) ████████████
```

### 통계
- **평균**: 52점 (Grade 2 - 좋음)
- **최고**: 94점 (Grade 0 - 천운)
- **최저**: 23점 (Grade 4 - 나쁨)
- **총 일수**: 365일

---

## 🔍 사용자 경험

### 시나리오 1: 첫 방문
1. 생년월일 입력 → 캘린더 로드
2. 상단에 점수 분포 차트 표시
3. 히스토그램을 보고 연간 운세 흐름 파악
4. "올해는 천운의 날이 18일이나 있네!"

### 시나리오 2: 연도 비교
1. 2025년 분석 → 평균 52점
2. 2026년으로 변경 → 평균 48점
3. "내년이 조금 더 힘들 수 있겠구나"
4. 중요 행사는 2025년에 몰아서 잡기로 결정

### 시나리오 3: 카테고리별 분석
1. "전체" 카테고리: 평균 52점
2. "Career" 카테고리: 평균 58점
3. "Love" 카테고리: 평균 45점
4. "올해는 커리어에 집중하고 연애는 다음 해에!"

---

## 🚀 향후 개선 계획

### 1. 클릭 필터링
```typescript
// 막대 클릭 시 해당 등급 날짜만 필터링
<div className={styles.bar} onClick={() => filterByGrade(range.grade)}>
```

### 2. 월별 추세선
```typescript
// 12개월 평균 점수 라인 차트
const monthlyAvg = calculateMonthlyAverage(data.allDates);
<LineChart data={monthlyAvg} />
```

### 3. 사주 vs 점성술 비교
```typescript
// 두 시스템의 점수 기여도 비교
const sajuContribution = calculateSajuScore(data);
const astroContribution = calculateAstroScore(data);
<ComparisonChart saju={sajuContribution} astro={astroContribution} />
```

### 4. 내보내기 기능
```typescript
// PNG/PDF로 차트 저장
<button onClick={() => exportChart('png')}>
  이미지로 저장
</button>
```

### 5. 개인화된 인사이트
```typescript
// AI가 분포를 분석해서 조언
const insight = analyzeDistribution(distribution);
// "올해 상반기(1-6월)가 하반기보다 운이 좋습니다.
//  중요한 일은 상반기에 몰아서 하세요!"
```

---

## 📱 반응형 지원

### 데스크톱 (>768px)
- 히스토그램 높이: 180px
- 막대 최대 너비: 60px
- 통계: 4열 그리드
- 점수 구성: 3열 그리드

### 모바일 (≤768px)
- 히스토그램 높이: 150px
- 막대 최대 너비: 40px
- 통계: 2열 그리드
- 점수 구성: 1열 그리드

---

## ✅ 테스트 체크리스트

- [x] 365일 전체 데이터 로드
- [x] 점수 범위별 정확한 카운트
- [x] 평균/최고/최저 계산 정확성
- [x] 히스토그램 비율 정확성
- [x] 호버 효과 작동
- [x] 접기/펼치기 애니메이션
- [x] 모바일 반응형
- [x] 다크/라이트 테마 지원
- [x] 다국어 지원 (한국어/영어)
- [x] 캐시 시스템과 통합

---

## 🎯 핵심 가치

### 1. **투명성**
- 점수 체계를 명확하게 공개
- 사용자가 점수의 의미를 정확히 이해

### 2. **인사이트**
- 연간 흐름을 한눈에 파악
- 좋은 날과 나쁜 날의 분포 이해

### 3. **신뢰성**
- 정규분포 기반의 논리적 점수
- 극단적이지 않은 균형 잡힌 분포

### 4. **실용성**
- 중요 행사 일정을 잡을 때 참고
- 연도/카테고리별 비교로 의사결정 지원

---

**구현 완료!** 🎉

운명 캘린더에 점수 분포 시각화가 추가되어 사용자들이 연간 운세를 더욱 직관적으로 이해할 수 있게 되었습니다!

**다음 단계**: 실제 사용자 피드백을 받아 히스토그램 클릭 필터링, 월별 추세선 등 추가 기능을 구현할 예정입니다.
