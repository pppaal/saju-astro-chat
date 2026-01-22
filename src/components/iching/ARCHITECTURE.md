# I Ching ResultDisplay Architecture

## Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ResultDisplay.tsx                            │
│                         (272 lines)                                  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Props Interface                                             │    │
│  │  - result: IChingResult | null                              │    │
│  │  - question?: string                                         │    │
│  │  - autoStartAi?: boolean                                     │    │
│  │  - onAiComplete?: (aiText) => void                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Custom Hooks Layer                                          │    │
│  │                                                              │    │
│  │  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐│    │
│  │  │ useHexagramData │  │ useAiStreaming │  │useAiCompletion││    │
│  │  │                 │  │                │  │              ││    │
│  │  │ • Premium data  │  │ • AI status    │  │ • Refs       ││    │
│  │  │ • Trigrams      │  │ • Streaming    │  │ • Notification││   │
│  │  │ • Lucky info    │  │ • Error handle │  │ • Timing     ││    │
│  │  │ • Wisdom        │  │ • Abort ctrl   │  │              ││    │
│  │  │ • Patterns      │  │                │  │              ││    │
│  │  └─────────────────┘  └────────────────┘  └──────────────┘│    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Presentation Layer (13 Section Components)                 │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Primary Hexagram Card                                 │  │    │
│  │  │  • Header                                             │  │    │
│  │  │  • TrigramComposition                                 │  │    │
│  │  │  • QuickSummarySection                               │  │    │
│  │  │  • VisualImagerySection                              │  │    │
│  │  │  • Core Meaning                                       │  │    │
│  │  │  • PlainLanguageExplanation                          │  │    │
│  │  │  • Judgment & Image                                   │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Life Areas & Advice                                   │  │    │
│  │  │  • LifeAreasGrid                                      │  │    │
│  │  │  • ActionableAdviceSection                           │  │    │
│  │  │  • SituationTemplateSection                          │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Deeper Insights                                        │  │    │
│  │  │  • DeeperInsightCard                                  │  │    │
│  │  │  • TraditionalWisdomSection                          │  │    │
│  │  │  • SequenceAnalysisSection                           │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Transformation                                         │  │    │
│  │  │  • ChangingLinesSection                               │  │    │
│  │  │  • ResultingHexagramCard                             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ AI Interpretation                                      │  │    │
│  │  │  • AIInterpretationSection                            │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Data Flow Diagram                             │
└──────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   User Input     │
                    │  • question      │
                    │  • autoStartAi   │
                    └────────┬─────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │    ResultDisplay Component      │
            └────────┬──────────────┬─────────┘
                     │              │
        ┌────────────▼────┐    ┌───▼──────────────┐
        │ useHexagramData  │    │ useAiStreaming    │
        │                  │    │                   │
        │ Fetches & Memos: │    │ Manages:          │
        │ • Premium data   │    │ • API calls       │
        │ • Trigrams       │    │ • SSE parsing     │
        │ • Lucky info     │    │ • Text streaming  │
        │ • Wisdom         │    │ • Error handling  │
        │ • Patterns       │    │                   │
        └────────┬─────────┘    └──────┬────────────┘
                 │                     │
                 │    ┌────────────────▼──────────┐
                 │    │   useAiCompletion         │
                 │    │                           │
                 │    │ Triggers:                 │
                 │    │ • onAiComplete callback   │
                 │    │ • Parent notification     │
                 │    └───────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │   Section Components        │
    │                            │
    │  Each receives:            │
    │  • Specific data slice     │
    │  • Translate function      │
    │  • Language preference     │
    │                            │
    │  Renders:                  │
    │  • Memoized output         │
    │  • Conditional UI          │
    │  • Styled components       │
    └────────────┬───────────────┘
                 │
                 ▼
        ┌────────────────┐
        │   Final Output  │
        │   • HTML/JSX    │
        │   • Styled UI   │
        │   • Interactive │
        └────────────────┘
```

---

## Hook Dependencies

```
useHexagramData
├── Dependencies:
│   ├── result (prop)
│   └── language (derived from locale)
├── External Libraries:
│   ├── @/lib/iChing/iChingPremiumData
│   ├── @/lib/iChing/enhancedData
│   ├── @/lib/iChing/ichingWisdom
│   └── @/lib/iChing/ichingPatterns
└── Returns:
    ├── premiumData
    ├── resultingPremiumData
    ├── upperTrigram
    ├── lowerTrigram
    ├── luckyInfo
    ├── nuclearHexagram
    ├── relatedHexagrams
    ├── enhancedData
    ├── wisdomData
    ├── sequenceData
    └── xuguaPairData

useAiStreaming
├── Dependencies:
│   ├── result (prop)
│   ├── question (prop)
│   ├── locale (i18n)
│   ├── lang (derived)
│   └── premiumData (from useHexagramData)
├── External APIs:
│   └── POST /api/iching/stream (SSE)
└── Returns:
    ├── aiStatus
    ├── currentSection
    ├── overviewText
    ├── changingText
    ├── adviceText
    ├── aiError
    ├── startAiInterpretation
    └── abortControllerRef

useAiCompletion
├── Dependencies:
│   ├── aiStatus (from useAiStreaming)
│   ├── overviewText (from useAiStreaming)
│   ├── changingText (from useAiStreaming)
│   ├── adviceText (from useAiStreaming)
│   └── onAiComplete (prop)
└── Side Effects:
    └── Calls onAiComplete when done
```

---

## Component Props Interface Map

```typescript
// Main Component
interface ResultDisplayProps {
  result: IChingResult | null;
  question?: string;
  autoStartAi?: boolean;
  onAiComplete?: (aiText: AiTextSections) => void;
}

// Section Components Props Patterns

// Pattern 1: Basic Info Display
interface BasicDisplayProps {
  translate: (key: string, fallback: string) => string;
  lang: "ko" | "en";
  data: any; // Specific data type varies
}

// Pattern 2: Enhanced Data Display
interface EnhancedDisplayProps {
  enhancedData: any;
  translate: (key: string, fallback: string) => string;
}

// Pattern 3: Premium Data Display
interface PremiumDisplayProps {
  premiumData: any;
  lang: "ko" | "en";
  translate: (key: string, fallback: string) => string;
}

// Pattern 4: Interactive Component
interface InteractiveProps {
  aiStatus: AiStatus;
  startAiInterpretation: () => void;
  translate: (key: string, fallback: string) => string;
  // ... streaming state
}
```

---

## File Size Distribution

```
Total Refactored Code: ~1,946 lines

┌────────────────────────────────────────────┐
│ Hooks (458 lines)          23.5%           │
│ ████████████                               │
├────────────────────────────────────────────┤
│ Sections (1,216 lines)     62.5%           │
│ ████████████████████████████████           │
├────────────────────────────────────────────┤
│ Main Component (272 lines) 14.0%           │
│ ███████                                    │
└────────────────────────────────────────────┘

Original: 1,103 lines (single file)
Refactored: 1,946 lines (19 files, better organized)
```

---

## Render Tree Structure

```
<ResultDisplay>
  │
  ├─ <div className={styles.resultContainer}>
  │  │
  │  ├─ <div className={styles.resultCard}> (Primary Hexagram)
  │  │  ├─ Header section
  │  │  ├─ <TrigramComposition />
  │  │  ├─ <QuickSummarySection />
  │  │  ├─ <VisualImagerySection />
  │  │  ├─ Core Meaning section
  │  │  ├─ <PlainLanguageExplanation />
  │  │  ├─ Judgment section
  │  │  └─ Image section
  │  │
  │  ├─ <LifeAreasGrid />
  │  │
  │  ├─ <ActionableAdviceSection />
  │  │
  │  ├─ <SituationTemplateSection /> (conditional)
  │  │
  │  ├─ <DeeperInsightCard />
  │  │
  │  ├─ <TraditionalWisdomSection />
  │  │
  │  ├─ <SequenceAnalysisSection />
  │  │
  │  ├─ <ChangingLinesSection />
  │  │
  │  ├─ <ResultingHexagramCard /> (conditional)
  │  │
  │  └─ <AIInterpretationSection />
  │
  └─ </div>
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    State Management                      │
└─────────────────────────────────────────────────────────┘

Component Mount
      │
      ▼
┌──────────────────┐
│ Initialize Hooks  │
└────────┬──────────┘
         │
         ├─► useHexagramData
         │   └─► Compute all derived data (memoized)
         │
         ├─► useAiStreaming
         │   └─► Initialize AI state (idle)
         │
         └─► useAiCompletion
             └─► Setup completion refs

      │
      ▼
┌──────────────────┐
│ Auto-start Check │ (if autoStartAi && result)
└────────┬──────────┘
         │
         ▼
┌──────────────────┐
│ Start AI Stream  │
└────────┬──────────┘
         │
         ├─► aiStatus: loading
         ├─► Fetch API call
         ├─► aiStatus: streaming
         ├─► Parse SSE data
         ├─► Update text states
         └─► aiStatus: done

      │
      ▼
┌──────────────────┐
│ Trigger Complete │
└────────┬──────────┘
         │
         └─► onAiComplete callback

      │
      ▼
┌──────────────────┐
│ Component Render │
└──────────────────┘
```

---

## Performance Optimization Strategy

### 1. Memoization Layers

```
Level 1: Hook Memoization
  └─ useMemo for expensive computations
     • Hexagram data calculations
     • Pattern analysis
     • Wisdom lookups

Level 2: Component Memoization
  └─ React.memo for all section components
     • Prevents re-render unless props change
     • Shallow props comparison

Level 3: Callback Memoization
  └─ useCallback for functions
     • startAiInterpretation
     • Event handlers
```

### 2. Conditional Rendering

```typescript
// Each section checks data availability
if (!data) return null;

// Benefits:
// • No unnecessary DOM nodes
// • Reduced render time
// • Better tree shaking
```

### 3. Code Splitting Potential

```typescript
// Future enhancement: Dynamic imports
const AIInterpretationSection = lazy(() =>
  import('./sections/AIInterpretationSection')
);

// Benefits:
// • Smaller initial bundle
// • Faster page load
// • On-demand loading
```

---

## Testing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Testing Strategy                      │
└─────────────────────────────────────────────────────────┘

Unit Tests (Isolated)
├─ Hooks
│  ├─ useAiStreaming.test.ts
│  │  ├─ Should initialize with idle status
│  │  ├─ Should handle streaming data
│  │  ├─ Should handle errors
│  │  └─ Should cleanup on unmount
│  ├─ useHexagramData.test.ts
│  │  ├─ Should compute all data correctly
│  │  ├─ Should handle missing data
│  │  └─ Should memoize results
│  └─ useAiCompletion.test.ts
│     ├─ Should call onComplete once
│     └─ Should capture latest text
│
└─ Components
   ├─ TrigramComposition.test.tsx
   ├─ QuickSummarySection.test.tsx
   ├─ ... (each section)
   └─ AIInterpretationSection.test.tsx

Integration Tests
├─ ResultDisplay.integration.test.tsx
│  ├─ Should render all sections
│  ├─ Should handle AI streaming
│  ├─ Should switch languages
│  └─ Should handle errors gracefully

E2E Tests
└─ iching-reading.e2e.test.ts
   ├─ Complete reading flow
   ├─ AI interpretation flow
   └─ Error recovery
```

---

## Maintenance Guidelines

### Adding a New Section

1. Create component in `sections/`
```typescript
// sections/NewSection.tsx
export const NewSection: React.FC<NewSectionProps> = React.memo(({...}) => {
  if (!data) return null;
  return <div>...</div>;
});
```

2. Add export to `sections/index.ts`
```typescript
export { NewSection } from "./NewSection";
export type { NewSectionProps } from "./NewSection";
```

3. Import and use in `ResultDisplay.tsx`
```typescript
import { NewSection } from "./sections";

// In JSX:
<NewSection {...props} />
```

### Modifying a Hook

1. Update hook implementation
2. Update return type if needed
3. Test in isolation
4. Verify all consumers still work

### Updating Styles

- All styles in `ResultDisplay.module.css`
- Shared by all components
- CSS Modules scope prevents conflicts

---

## Migration Checklist

- [x] All hooks extracted and tested
- [x] All sections extracted and memoized
- [x] Main component refactored
- [x] Types properly defined
- [x] Documentation complete
- [x] Original file backed up
- [x] No breaking changes
- [x] Ready for production

---

**Architecture Version**: 2.0 (Refactored)
**Last Updated**: 2026-01-22
**Maintainer**: Development Team
