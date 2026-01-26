# i18n Refactoring Migration Guide

## Summary

The i18n system has been refactored to split large monolithic translation files into smaller, domain-specific files. This improves maintainability, reduces file size, and makes translations easier to manage.

## What Changed

### File Structure

**Before:**
```
src/i18n/locales/
├── ko.json (2,142 lines, ~104KB)
└── en.json (1,974 lines, ~94KB)
```

**After:**
```
src/i18n/locales/
├── ko/
│   ├── common.json         (~150 lines)
│   ├── landing.json        (~200 lines)
│   ├── chat.json           (~80 lines)
│   ├── tarot.json          (~180 lines)
│   ├── calendar.json       (~500 lines)
│   ├── personality.json    (~250 lines)
│   └── ... (10 more files)
├── en/ (same structure)
├── ko.ts (compatibility export)
└── en.ts (compatibility export)
```

### Chat i18n Consolidation

**Before:** 3 separate implementations
- `src/components/destiny-map/chat-i18n.ts`
- `src/components/tarot/data/tarot-chat-i18n.ts`
- Inline in main i18n

**After:** Unified system
- `src/i18n/locales/{locale}/chat.json`
- `src/lib/i18n/chat-utils.ts` (unified hook)

## Migration Steps

### For Most Components (No Changes Required)

Components using `useI18n()` hook continue to work without any changes:

```tsx
import { useI18n } from "@/i18n/I18nProvider";

function MyComponent() {
  const { t } = useI18n();
  return <h1>{t("landing.heroTitle")}</h1>;
}
```

**No action needed!** ✅

### For Components Using Old Chat i18n

#### destiny-map components

**Before:**
```tsx
import { CHAT_I18N, LangKey } from "@/components/destiny-map/chat-i18n";

const copy = CHAT_I18N[lang as LangKey];
<input placeholder={copy.placeholder} />
```

**After:**
```tsx
import { useChatI18n } from "@/lib/i18n/chat-utils";

const chat = useChatI18n();
<input placeholder={chat.placeholder} />
```

#### tarot components

**Before:**
```tsx
import { I18N } from "@/components/tarot/data/tarot-chat-i18n";

const copy = I18N[locale];
<button>{copy.send}</button>
```

**After:**
```tsx
import { useChatI18n } from "@/lib/i18n/chat-utils";

const chat = useChatI18n();
<button>{chat.send}</button>
```

### For API Routes (Already Migrated)

API routes that imported translation JSONs directly now use compatibility exports:

**Before:**
```tsx
import koTranslations from "@/i18n/locales/ko.json";
import enTranslations from "@/i18n/locales/en.json";
```

**After:**
```tsx
import koTranslations from "@/i18n/locales/ko";
import enTranslations from "@/i18n/locales/en";
```

This change has been applied to:
- `src/app/api/calendar/route.ts`

## Files Modified

### Core i18n System
- ✅ `src/i18n/I18nProvider.tsx` - Updated to load from split files
- ✅ `src/i18n/locales/ko.ts` - Compatibility export
- ✅ `src/i18n/locales/en.ts` - Compatibility export

### New Files Created
- ✅ `src/i18n/locales/ko/*.json` (15 files)
- ✅ `src/i18n/locales/en/*.json` (15 files)
- ✅ `src/lib/i18n/chat-utils.ts` - Unified chat utilities
- ✅ `src/i18n/README.md` - Documentation
- ✅ `scripts/split-i18n.py` - Split automation script

### Backup Files
- `src/i18n/locales/ko.json.backup`
- `src/i18n/locales/en.json.backup`
- `src/i18n/I18nProvider.tsx.backup`

## Benefits

1. **Smaller Files**: ~10-15KB per file vs 100KB+ monolithic
2. **Faster Development**: Easier to find and edit translations
3. **Better Git Diffs**: Changes isolated to relevant files
4. **No Duplication**: Single source of truth for chat UI
5. **Organized Structure**: Clear domain separation

## File Organization

| File | Contains | Size |
|------|----------|------|
| `common.json` | App-wide UI (buttons, errors, menu) | ~150 lines |
| `landing.json` | Marketing pages | ~200 lines |
| `chat.json` | All chat interfaces | ~80 lines |
| `{service}.json` | Service-specific (tarot, calendar, etc.) | ~180-500 lines |
| `features.json` | Feature modules (community, profile) | ~250 lines |
| `misc.json` | Everything else (pricing, policies) | ~150 lines |

## Testing Checklist

After migration, verify:

- [ ] Build succeeds (`npm run build`)
- [ ] All pages render correctly
- [ ] Language switching works (EN ↔ KO)
- [ ] Chat interfaces work
  - [ ] Destiny Map chat
  - [ ] Tarot chat
- [ ] Service pages work
  - [ ] Tarot
  - [ ] Calendar
  - [ ] Personality
  - [ ] Dream
  - [ ] Numerology
  - [ ] I Ching
- [ ] Community features work
- [ ] No console errors

## Rollback Plan

If issues arise, rollback is simple:

```bash
cd src/i18n
mv I18nProvider.tsx.backup I18nProvider.tsx

cd locales
mv ko.json.backup ko.json
mv en.json.backup en.json
```

Then rebuild: `npm run build`

## Future Improvements

Potential enhancements (not in current scope):

1. **Lazy Loading**: Load service translations on-demand
2. **Type Safety**: Generate TypeScript types from translation keys
3. **Validation**: Automated checks for missing translations
4. **Tree Shaking**: Remove unused translations from bundles

## Questions?

See `src/i18n/README.md` for detailed usage examples.

## Summary of Changes

- ✅ Split 2 large files (4,116 lines) into 30 small files (avg ~140 lines each)
- ✅ Unified 3 chat i18n systems into 1
- ✅ Created reusable chat utilities hook
- ✅ Maintained backward compatibility for API routes
- ✅ Preserved all existing functionality
- ✅ No breaking changes for components using `useI18n()`
