# Interactive Dream Symbol Cards 🎴

## 개요
꿈 해석 결과에 3D 플립 카드 인터랙션을 추가하여 Jung/Stoic/Tarot 관점에서 심볼을 탐색할 수 있습니다.

**구현 일자**: 2025-12-30
**컴포넌트**: `DreamSymbolCard`
**애니메이션**: Framer Motion

---

## 🎯 주요 기능

### 1. **3D Flip Animation**
- 카드를 클릭하면 180도 회전 (Y축)
- 앞면: 심볼 이름 + 기본 의미
- 뒷면: Jung/Stoic/Tarot 해석

### 2. **다층적 해석**
```typescript
interface SymbolInterpretation {
  jung?: string;   // 융 심리학 (원형, 그림자, 집단 무의식)
  stoic?: string;  // 스토아 철학 (덕, 지혜, 자연과의 조화)
  tarot?: string;  // 타로 상징 (영적 여정, 인생 교훈)
}
```

### 3. **색상 코딩**
각 카드마다 고유한 그라데이션:
- **Purple**: `#6366f1` (첫 번째 심볼)
- **Violet**: `#8b5cf6` (두 번째)
- **Pink**: `#ec4899` (세 번째)
- **Orange**: `#f59e0b` (네 번째)
- **Green**: `#10b981` (다섯 번째)
- **Blue**: `#3b82f6` (여섯 번째)

---

## 📂 파일 구조

### 1. **DreamSymbolCard.tsx**
**위치**: `src/components/dream/DreamSymbolCard.tsx`

```typescript
export interface DreamSymbolCardProps {
  symbol: string;              // 심볼 이름 (예: "물", "하늘")
  meaning: string;             // 기본 의미
  interpretations?: {
    jung?: string;
    stoic?: string;
    tarot?: string;
  };
  color?: string;              // 카드 색상 (기본: #6366f1)
  locale?: 'ko' | 'en';
}
```

**주요 코드**:
```typescript
const [isFlipped, setIsFlipped] = useState(false);

<motion.div
  animate={{ rotateY: isFlipped ? 180 : 0 }}
  transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
  style={{ transformStyle: 'preserve-3d' }}
>
  {/* 앞면 */}
  <div className={styles.cardFront}>
    <div className={styles.symbolIcon}>✨</div>
    <h3>{symbol}</h3>
    <p>{meaning}</p>
    <div className={styles.flipHint}>🔄 뒤집어보기</div>
  </div>

  {/* 뒷면 */}
  <div className={styles.cardBack} style={{ transform: 'rotateY(180deg)' }}>
    {interpretations.jung && (
      <div className={styles.interpretation}>
        <span>👤 융 심리학</span>
        <p>{interpretations.jung}</p>
      </div>
    )}
    {/* stoic, tarot... */}
  </div>
</motion.div>
```

### 2. **DreamSymbolCard.module.css**
**위치**: `src/components/dream/DreamSymbolCard.module.css`

**핵심 스타일**:
```css
.cardContainer {
  perspective: 1000px;
  width: 280px;
  height: 360px;
}

.cardFront, .cardBack {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.cardBack {
  transform: rotateY(180deg);
  overflow-y: auto;
}

/* Glow 애니메이션 */
@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

### 3. **page.tsx 통합**
**위치**: `src/app/dream/page.tsx`

**변경 사항**:
```typescript
// Before
<div className={styles.symbolCard}>
  <span className={styles.symbolEmoji}>✨</span>
  <span className={styles.symbolLabel}>{sym.label}</span>
  <p className={styles.symbolMeaning}>{sym.meaning}</p>
</div>

// After
<DreamSymbolCard
  symbol={sym.label}
  meaning={sym.meaning}
  interpretations={sym.interpretations}
  color={colors[i % colors.length]}
  locale={locale as 'ko' | 'en'}
/>
```

**Interface 업데이트**:
```typescript
interface InsightResponse {
  dreamSymbols?: {
    label: string;
    meaning: string;
    interpretations?: {  // NEW
      jung?: string;
      stoic?: string;
      tarot?: string;
    };
  }[];
  // ...
}
```

### 4. **Backend API 수정**
**위치**: `backend_ai/app/dream_logic.py`

**Prompt 업데이트 (Lines 323-333)**:
```python
"dreamSymbols": [
  {
    "label": "symbol name",
    "meaning": "detailed interpretation...",
    "interpretations": {  # NEW
      "jung": "Jungian psychological interpretation (1-2 sentences)...",
      "stoic": "Stoic philosophical interpretation (1-2 sentences)...",
      "tarot": "Tarot symbolism interpretation (1-2 sentences)..."
    }
  }
]
```

---

## 🎨 디자인 특징

### 1. **앞면 (Front)**
- ✨ 심볼 아이콘 (48px, drop-shadow)
- **심볼 이름** (24px, 700 weight)
- **기본 의미** (14px, 라인 높이 1.6)
- 🔄 **뒤집기 힌트** (pulse 애니메이션 2s)
- **Glow 효과** (radial gradient, 3s 애니메이션)

### 2. **뒷면 (Back)**
- 🔮 헤더 아이콘 (32px)
- **심볼 제목** (20px, 700 weight)
- **해석 섹션**:
  - 👤 **Jung** (아이콘 + 라벨)
  - 🏛️ **Stoic** (아이콘 + 라벨)
  - 🃏 **Tarot** (아이콘 + 라벨)
- 각 해석: 반투명 카드 (backdrop-filter blur)
- 🔄 **뒤집기 힌트** (아래 고정)

### 3. **애니메이션**
- **Flip**: Spring 애니메이션 (0.6s, stiffness 100)
- **Hover**: Box-shadow 확대 (0.3s ease)
- **Pulse**: 뒤집기 힌트 (2s infinite)
- **Rotate**: 🔄 아이콘 회전 (2s linear infinite)
- **Glow**: 배경 glow (3s ease-in-out infinite)

---

## 📊 사용 예시

### Example 1: 물 꿈
```json
{
  "label": "물",
  "meaning": "물은 무의식과 감정의 흐름을 상징합니다. 맑은 물이라면 긍정적 감정을, 탁한 물이라면 억압된 감정을 의미할 수 있습니다.",
  "interpretations": {
    "jung": "물은 무의식의 원형입니다. 깊은 물은 집단 무의식을, 흐르는 물은 변화를 의미합니다.",
    "stoic": "물처럼 유연하게 흐르세요. 막히면 돌아가고, 낮은 곳으로 흐르는 물의 지혜를 배우십시오.",
    "tarot": "컵(Cups) 수트와 연결됩니다. 감정, 관계, 직관의 영역을 탐색하라는 메시지입니다."
  }
}
```

**렌더링**:
```
[앞면]
✨
물
물은 무의식과 감정의 흐름을...
🔄 뒤집어보기

[뒷면 - 클릭 후]
🔮 물
👤 융 심리학
물은 무의식의 원형입니다...

🏛️ 스토아 철학
물처럼 유연하게 흐르세요...

🃏 타로
컵(Cups) 수트와 연결됩니다...
```

### Example 2: 하늘 꿈
```json
{
  "label": "하늘",
  "meaning": "자유, 무한한 가능성, 영적 성장을 의미합니다. 맑은 하늘은 명확한 비전을, 어두운 하늘은 불확실성을 나타냅니다.",
  "interpretations": {
    "jung": "하늘은 자기실현(Self)의 상징입니다. 위를 향한 욕구, 초월적 경험을 나타냅니다.",
    "stoic": "하늘처럼 넓은 마음을 가지세요. 모든 것을 포용하고 내려놓는 자유를 얻으십시오.",
    "tarot": "Star 카드와 연결됩니다. 희망, 영감, 우주와의 연결을 의미합니다."
  }
}
```

---

## 🔧 기술 스택

| 기술 | 역할 |
|------|------|
| **React** | 컴포넌트 기반 UI |
| **TypeScript** | 타입 안전성 |
| **Framer Motion** | 3D 플립 애니메이션 |
| **CSS Modules** | 스코프 스타일링 |
| **Python (Backend)** | GPT-4o로 해석 생성 |

---

## 📱 반응형 디자인

### Desktop (>768px)
- 카드 크기: 280px × 360px
- 심볼 아이콘: 48px
- 심볼 이름: 24px

### Tablet (≤768px)
- 카드 크기: 240px × 320px
- 심볼 아이콘: 40px
- 심볼 이름: 20px

### Mobile (≤480px)
- 카드 크기: 220px × 300px
- 심볼 아이콘: 36px
- 심볼 이름: 18px

---

## 🚀 향후 개선 계획

### 1. **카드 드래그 & 조합**
```typescript
// 두 카드를 드래그해서 합치면 조합 해석
<motion.div
  drag
  onDragEnd={(e, info) => handleCardCombination(card1, card2)}
>
  <DreamSymbolCard {...props} />
</motion.div>
```

### 2. **심볼 타임라인**
과거 꿈에서 자주 나온 심볼을 시간순으로 표시:
```
2024.12.30 - 물 🌊
2024.12.25 - 하늘 ☁️
2024.12.20 - 나무 🌳
```

### 3. **AI 추천 조합**
GPT-4o가 심볼 조합을 분석:
```
"물 + 하늘 = 바다로의 여행"
"나무 + 불 = 변화와 성장"
```

### 4. **3D Constellation Map**
React Three Fiber로 심볼들을 별자리처럼 배치:
```typescript
import { Canvas } from '@react-three/fiber';

<Canvas>
  <SymbolConstellation symbols={dreamSymbols} />
</Canvas>
```

### 5. **Share Card Image**
카드를 이미지로 저장:
```typescript
import html2canvas from 'html2canvas';

const shareCard = async (cardRef) => {
  const canvas = await html2canvas(cardRef.current);
  const image = canvas.toDataURL();
  // 공유...
};
```

---

## ✅ 체크리스트

- [x] DreamSymbolCard 컴포넌트 생성
- [x] Framer Motion 플립 애니메이션
- [x] Jung/Stoic/Tarot 해석 섹션
- [x] CSS 그라데이션 & 그림자
- [x] 색상 코딩 시스템
- [x] Dream page 통합
- [x] TypeScript 인터페이스 업데이트
- [x] Backend prompt 수정
- [x] 반응형 디자인
- [x] 다크/라이트 테마 지원
- [ ] 드래그 & 조합 기능
- [ ] 심볼 타임라인
- [ ] 3D Constellation Map
- [ ] Share 기능

---

## 🎯 핵심 가치

### 1. **깊이 있는 탐색**
단순한 해석이 아닌 Jung/Stoic/Tarot 3가지 관점 제공

### 2. **인터랙티브 경험**
카드를 뒤집으며 능동적으로 탐색

### 3. **비주얼 매력**
그라데이션, 애니메이션, 그림자로 프리미엄 느낌

### 4. **교육적 가치**
각 철학/심리학의 관점을 자연스럽게 학습

---

**구현 완료!** 🎉

Dream Counselor에 Interactive Symbol Cards가 추가되어 사용자들이 꿈 심볼을 다층적으로 탐색할 수 있게 되었습니다!

**다음 단계**: 실제 API 응답에서 Jung/Stoic/Tarot 해석이 잘 생성되는지 테스트하고, 드래그 & 조합 기능 추가를 고려합니다.
