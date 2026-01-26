# i18n Refactoring

This directory contains the refactored internationalization (i18n) system for the application.

## Changes Made

### 1. File Structure

**Before:**
```
src/i18n/locales/
├── ko.json (2,142 lines, 104KB)
├── en.json (1,974 lines, 94KB)
└── (6 other incomplete locales)
```

**After:**
```
src/i18n/locales/
├── ko/
│   ├── common.json         (app, ui, error, menu, emoji)
│   ├── landing.json        (landing, about, contact, faq, footer)
│   ├── chat.json           (unified chat translations)
│   ├── services.json
│   ├── tarot.json
│   ├── calendar.json
│   ├── personality.json
│   ├── dream.json
│   ├── numerology.json
│   ├── iching.json
│   ├── pastlife.json
│   ├── compatibility.json
│   ├── destinymap.json
│   ├── features.json       (community, myjourney, history, profile, auth)
│   └── misc.json           (pricing, policy, form, success)
└── en/ (same structure)
```

### 2. Consolidated Chat i18n

**Before:** 3 separate implementations
- `src/components/destiny-map/chat-i18n.ts` (9 languages, 43 keys)
- `src/components/tarot/data/tarot-chat-i18n.ts` (2 languages, 15 keys)
- Inline translations in main i18n

**After:** Unified system
- `src/i18n/locales/{locale}/chat.json` - All chat translations
- `src/lib/i18n/chat-utils.ts` - Unified chat utilities and hooks

### 3. Benefits

- **Smaller files**: ~10-15KB per file vs 100KB+ monolithic files
- **Faster loading**: Can lazy-load service-specific translations
- **Easier maintenance**: Changes isolated to relevant files
- **Better git diffs**: Smaller, focused changes
- **No duplication**: Single source of truth for chat UI

## Usage

### Basic Translation

```tsx
import { useI18n } from "@/i18n/I18nProvider";

function MyComponent() {
  const { t } = useI18n();

  return <h1>{t("landing.heroTitle")}</h1>;
}
```

### Chat Translations

```tsx
import { useChatI18n } from "@/lib/i18n/chat-utils";

function ChatComponent() {
  const chat = useChatI18n();

  return (
    <div>
      <input placeholder={chat.placeholder} />
      <button>{chat.send}</button>
      {chat.thinking && <p>{chat.thinking}</p>}
    </div>
  );
}
```

### Crisis Detection

```tsx
import { detectCrisis } from "@/lib/i18n/chat-utils";

const isCrisis = detectCrisis(userMessage, "ko");
if (isCrisis) {
  // Show crisis support modal
}
```

## Migration Guide

### For Components Using Old chat-i18n

**Before:**
```tsx
import { CHAT_I18N, LangKey } from "@/components/destiny-map/chat-i18n";

const copy = CHAT_I18N[lang as LangKey];
```

**After:**
```tsx
import { useChatI18n } from "@/lib/i18n/chat-utils";

const chat = useChatI18n();
```

### Adding New Translations

1. Add to appropriate file in `src/i18n/locales/{locale}/`
2. Keep key structure consistent across locales
3. Run type generation (if using TypeScript types)

Example:
```json
// src/i18n/locales/ko/features.json
{
  "community": {
    "newFeature": "새 기능",
    "newFeatureDesc": "새로운 기능 설명"
  }
}
```

## File Organization Strategy

Files are organized by **domain/feature**:

- **common.json**: App-wide UI elements (buttons, errors, navigation)
- **landing.json**: Marketing and about pages
- **chat.json**: All chat/conversation interfaces
- **{service}.json**: Service-specific content (tarot, calendar, etc.)
- **features.json**: Feature modules (community, profile, etc.)
- **misc.json**: Everything else (pricing, policies, etc.)

## Backup

Original files are backed up as:
- `ko.json.backup`
- `en.json.backup`
- `I18nProvider.tsx.backup`

## Testing

After refactoring:
1. Run `npm run build` to verify no build errors
2. Test each major page:
   - Landing page
   - Services (tarot, calendar, personality, etc.)
   - Chat interfaces
   - Community features
3. Test language switching (EN ↔ KO)
4. Verify no missing translations

## Performance Notes

The new structure maintains the same runtime performance as before since all translations are imported at build time and bundled together. Future optimization could add:

- Lazy loading for service-specific translations
- Tree-shaking of unused translations
- Dynamic imports for on-demand loading

## Maintenance

When adding new features:
1. Add translations to appropriate domain file
2. If creating a major new feature, consider creating a new file
3. Keep files under ~500 lines for maintainability
4. Document any new translation keys in this README
