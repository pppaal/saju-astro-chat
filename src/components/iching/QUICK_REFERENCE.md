# Quick Reference Guide - ResultDisplay Refactoring

## 📋 TL;DR

- **Original**: 1,103 lines in one file
- **Refactored**: 272 lines main component + 19 modular files
- **Reduction**: 75% smaller main component
- **Status**: ✅ Complete, production-ready

---

## 🗂️ File Locations

### Hooks
```
src/components/iching/hooks/
├── useAiStreaming.ts      - AI streaming logic
├── useHexagramData.ts     - Data consolidation
├── useAiCompletion.ts     - Completion handling
└── index.ts               - Exports
```

### Sections
```
src/components/iching/sections/
├── TrigramComposition.tsx
├── QuickSummarySection.tsx
├── VisualImagerySection.tsx
├── PlainLanguageExplanation.tsx
├── LifeAreasGrid.tsx
├── ActionableAdviceSection.tsx
├── SituationTemplateSection.tsx
├── DeeperInsightCard.tsx
├── TraditionalWisdomSection.tsx
├── SequenceAnalysisSection.tsx
├── ChangingLinesSection.tsx
├── ResultingHexagramCard.tsx
├── AIInterpretationSection.tsx
└── index.ts
```

### Main
```
src/components/iching/
├── ResultDisplay.tsx          - Refactored (272 lines)
├── ResultDisplay.tsx.backup   - Original (1,103 lines)
└── types.ts                   - Type definitions
```

---

## 🔍 What's Where?

### Need to modify AI streaming?
→ `hooks/useAiStreaming.ts`

### Need to add hexagram data source?
→ `hooks/useHexagramData.ts`

### Need to change a specific UI section?
→ `sections/[SectionName].tsx`

### Need to adjust component props?
→ `ResultDisplay.tsx` (main orchestrator)

### Need to add/modify types?
→ `types.ts`

---

## 📝 Common Tasks

### Task 1: Add a New Section

```typescript
// 1. Create section file
// sections/MyNewSection.tsx
import React from "react";
import styles from "../ResultDisplay.module.css";

export interface MyNewSectionProps {
  data: any;
  translate: (key: string, fallback: string) => string;
}

export const MyNewSection: React.FC<MyNewSectionProps> = React.memo(({
  data,
  translate,
}) => {
  if (!data) return null;

  return (
    <div className={styles.mySection}>
      {/* Your JSX */}
    </div>
  );
});

MyNewSection.displayName = "MyNewSection";

// 2. Export from sections/index.ts
export { MyNewSection } from "./MyNewSection";
export type { MyNewSectionProps } from "./MyNewSection";

// 3. Import and use in ResultDisplay.tsx
import { MyNewSection } from "./sections";

// In JSX:
<MyNewSection data={...} translate={translate} />
```

### Task 2: Modify AI Streaming Logic

```typescript
// Edit hooks/useAiStreaming.ts
// Locate the startAiInterpretation function
// Make your changes
// Test the hook independently
```

### Task 3: Add New Hexagram Data Source

```typescript
// Edit hooks/useHexagramData.ts
// Add new useMemo computation
const myNewData = useMemo(() => {
  if (!primaryNumber) return null;
  return getMyNewData(primaryNumber);
}, [primaryNumber]);

// Add to return object
return {
  // ... existing data
  myNewData,
};
```

### Task 4: Update Section Styling

```css
/* Edit ResultDisplay.module.css */
.myNewClass {
  /* Your styles */
}
```

---

## 🐛 Debugging Guide

### Issue: Section not rendering
```
1. Check if data prop is undefined/null
2. Verify conditional rendering logic
3. Check parent component props passing
4. Inspect React DevTools component tree
```

### Issue: AI streaming not working
```
1. Check useAiStreaming hook state
2. Verify API endpoint /api/iching/stream
3. Check network tab for SSE connection
4. Inspect abortController state
5. Check environment variables (NEXT_PUBLIC_API_TOKEN)
```

### Issue: Performance problems
```
1. Verify React.memo is applied to sections
2. Check useMemo dependencies in hooks
3. Use React DevTools Profiler
4. Look for unnecessary re-renders
```

### Issue: TypeScript errors
```
1. Check types.ts for proper exports
2. Verify prop interfaces match
3. Ensure hook return types are correct
4. Run: npx tsc --noEmit
```

---

## 📦 Import Patterns

### In Section Components
```typescript
import React from "react";
import styles from "../ResultDisplay.module.css";
import { SomeType } from "@/components/iching/types";
```

### In Custom Hooks
```typescript
import { useState, useCallback, useMemo } from "react";
import { IChingResult } from "@/components/iching/types";
import { someFunction } from "@/lib/iChing/someModule";
```

### In Main Component
```typescript
import React, { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAiStreaming, useHexagramData, useAiCompletion } from "./hooks";
import { SectionComponent } from "./sections";
import styles from "./ResultDisplay.module.css";
```

---

## 🎯 Best Practices

### ✅ DO
- Use React.memo for all section components
- Add JSDoc comments to new functions
- Keep sections focused and single-purpose
- Use proper TypeScript types
- Test hooks independently
- Maintain backward compatibility
- Update documentation when changing APIs

### ❌ DON'T
- Modify styles directly in JSX (use CSS modules)
- Add side effects to section components
- Skip conditional rendering checks
- Ignore TypeScript warnings
- Create circular dependencies
- Break the component hierarchy

---

## 🔧 Development Commands

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Building
npm run build

# Testing (when implemented)
npm test -- hooks/useAiStreaming.test.ts
npm test -- sections/
npm test -- ResultDisplay.integration.test.tsx

# Development server
npm run dev
```

---

## 📊 Component Stats

| Component | Lines | Complexity | Dependencies |
|-----------|-------|------------|--------------|
| ResultDisplay | 272 | Medium | 3 hooks, 13 sections |
| useAiStreaming | 195 | High | Fetch API, SSE |
| useHexagramData | 135 | Medium | 4 lib modules |
| useAiCompletion | 71 | Low | Refs, effects |
| Section (avg) | 87 | Low | Props only |

---

## 🚨 Breaking Changes to Avoid

### DON'T change these interfaces:
```typescript
// ResultDisplayProps - External API
interface ResultDisplayProps {
  result: IChingResult | null;
  question?: string;
  autoStartAi?: boolean;
  onAiComplete?: (aiText: AiTextSections) => void;
}

// IChingResult - Used by parent components
interface IChingResult {
  primaryHexagram: HexagramData;
  changingLines: ChangingLine[];
  resultingHexagram?: HexagramData;
  error?: string;
}
```

### Safe to change:
- Internal section props
- Hook implementations (maintain API)
- CSS classes (scoped by modules)
- Section order in main component
- Hook internal state management

---

## 📞 Support

### Documentation Files
1. `REFACTORING_SUMMARY.md` - Detailed refactoring process
2. `REFACTORING_COMPLETE.md` - Completion report
3. `ARCHITECTURE.md` - Architecture diagrams
4. `QUICK_REFERENCE.md` - This file

### Backup
- Original file: `ResultDisplay.tsx.backup`
- Can rollback if needed (not recommended)

---

## 🎓 Learning Resources

### Understanding the Refactoring
1. Read `REFACTORING_SUMMARY.md` for step-by-step process
2. Review `ARCHITECTURE.md` for system design
3. Check individual hook files for implementation details

### React Patterns Used
- Custom Hooks
- Component Composition
- Memoization (React.memo, useMemo, useCallback)
- Conditional Rendering
- Props Interface Design

### TypeScript Patterns
- Interface definitions
- Type exports
- Generic types
- Type inference

---

## ✅ Checklist for Changes

Before committing changes:
- [ ] TypeScript compiles without errors
- [ ] All imports resolve correctly
- [ ] Components render without warnings
- [ ] No breaking changes to external API
- [ ] Documentation updated if needed
- [ ] JSDoc comments added/updated
- [ ] React DevTools shows proper component tree
- [ ] No console errors in browser

---

## 🔄 Version History

### v2.0 (Current - 2026-01-22)
- Complete refactoring to modular architecture
- 19 files, 272-line main component
- Full TypeScript support
- Comprehensive documentation

### v1.0 (Original)
- Single file, 1,103 lines
- Monolithic structure
- Basic documentation

---

**Quick Reference Version**: 1.0
**Last Updated**: 2026-01-22
**For Questions**: Check documentation files or component JSDoc comments
