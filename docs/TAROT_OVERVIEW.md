# Tarot Subsystem Overview

Last audited: 2026-05-17 (Asia/Hong_Kong)

## Intent

Single reference for the tarot product: which routes exist, where the
shared prompt lives, what the result page renders, and how the card
assets are stored and sized. Pair with `src/lib/tarot/promptShared.ts`
when changing prompt behavior — the doc explains the *why*, the file is
the source of truth for the rules.

## Surfaces

| Surface | Entry | Purpose |
| --- | --- | --- |
| Main reading | `src/app/tarot/[categoryName]/[spreadId]/page.tsx` | Category × spread × question → interpretation |
| Couple reading | `src/app/tarot/couple/[readingId]/page.tsx` | Two-person reading detail view |
| Inline modal | `src/components/destiny-map/InlineTarotModal.tsx` | Tarot inside the destiny counselor flow |
| History | `src/app/tarot/history/` | Saved readings list |

## LLM Routes

Three routes share one persona. Output schemas are intentionally route-local.

| Route | Mode | Return shape |
| --- | --- | --- |
| `src/app/api/tarot/interpret-stream/route.ts` | SSE streaming | `{ overall, cards[], advice }` |
| `src/app/api/tarot/interpret/route.ts` | Non-streaming JSON | `{ overall_message, guidance, affirmation, card_insights[] }` |
| `src/app/api/tarot/followup/route.ts` | Free text turn on existing reading | `{ answer: string }` |

Schema drift between `interpret` and `interpret-stream` is a known
audit item — both consumers (main result view, inline modal) map their
own shapes. Unifying these is tracked under tarot improvement work.

## Shared Prompt — `src/lib/tarot/promptShared.ts`

The three routes call `pickTarotRules(lang)` (or `pickTarotFollowupRules`
for followup). The file is intentionally short — the long persona block
that lived in each route pre-PR #210 has been removed; centralization
means future tweaks land in one place.

Current rules (KO/EN parity required):

- Question is the center; weave card name/imagery into the question's situation
- Multiple cards → name the relationship in `overall` at least once (continuation / reversal / echo / contrast) — no isolated lists *(added 2026-05-17, PR #260)*
- Reversed = blockage / delay / internalization / immaturity / excess (never plain "negative")
- Answer weight matches question weight
- Wrap key phrases in `*asterisks*` — 1–2 per card depending on length, 1–2 in overall *(loosened from "1 per card" in PR #260)*
- Never reveal model identity

Followup rules are tighter: 3–6 sentences, no new cards, close with one
concrete action + time anchor.

## Result Page Typography

Bumped in PR #260 (2026-05-17) — readability complaint baseline.

| Selector / scope | Before | After |
| --- | --- | --- |
| `.chatText` (main counselor body) | 1.12rem | 1.28rem |
| `.cardQuickLine` (per-card core/explanation) | 1rem | 1.15rem |
| `.adviceText` | 1.12rem | 1.28rem |
| Overall / card AI text (Tailwind in `ResultsStage.tsx`, `DetailedCardItem.tsx`) | 17px md | 19px md |
| Advice / followup chat (Tailwind) | 15px | 17px |
| `InlineTarotModal` `.resultText` | 1.05rem | 1.2rem |
| Couple result inline `<div>`/`<p>` | browser default | 1.15–1.25rem explicit |

Mobile media queries scaled proportionally.

## Card Assets

| Folder | Format | Frames | Resolution | Per-file | Total | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `public/images/tarot/*.webp` | animated WebP | 125 | 280×420 | ~0.9MB | ~73MB (79 files) | Card faces — all readings |
| `public/images/tarot/backs/*.webp` | static WebP | 1 | 280×420 | ~28KB | ~215KB (8 files) | Deck back (active when drawn) |
| `public/images/tarot/backs/previews/*.webp` | static WebP | 1 | small | ~20KB | ~160KB (8 files) | Deck selector thumbnails |

Total assets ≈ **73MB** (from 591MB before 2026-05-17).

Compression history:

- PR #263 — card faces 572.7MB → 73.1MB (-87.2%): kept 125-frame
  animation, resized 320×480 → 280×420, WebP q=32 effort=5
- PR #265 — deck backs 18.2MB → 215KB (-98.8%): PNG → WebP at 280×420,
  q=80 effort=6 (static single frame, so quality kept high)

Card display sizes top out around 220px (full-spread detailed view),
typically 120–180px. 280px source covers up to ~1.3× retina at the
largest size; acceptable trade-off for the ~8× asset shrink.

## Known Improvement Items

Tracked but not yet shipped:

1. **Schema unification** between `interpret` and `interpret-stream`
   return shapes
2. **Card detail modal** — clicking a card to drill into upright/reversed
   meanings, archetype, element. Card data exists in
   `src/lib/tarot/data/`; no UI surface
3. **Same-question redraw** — `handleReset` currently routes to
   `/tarot` (full restart); a "redraw with same question" button is
   debated philosophically (tarot purists argue against re-drawing)
4. **Zod schemas for LLM JSON parsing** — current `as unknown[]` casts
   in chunk-merging logic can drop tail cards silently on partial
   parse failure

## Related Files

- `src/lib/tarot/promptShared.ts` — the only source of truth for the rules
- `src/lib/tarot/tarot.types.ts` — `DECK_STYLES`, `DECK_STYLE_INFO`, `getCardImagePath`
- `src/lib/tarot/data/` — per-suit card meaning data
- `src/app/api/tarot/{interpret,interpret-stream,followup}/route.ts` — three LLM endpoints
- `docs/EVAL_TAROT_PROMPTS.jsonl` — routing/safety evaluation cases
