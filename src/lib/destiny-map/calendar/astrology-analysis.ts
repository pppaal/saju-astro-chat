/**
 * astrology-analysis.ts - facade module
 *
 * Most of the astrology/ subfolder it used to re-export through
 * `export * from './astrology'` (aspects, eclipse, retrograde,
 * transits, voidOfCourse, planetaryHours, plus the index barrel) had
 * zero importers anywhere in the tree — duplicated by the live
 * calendar/planetary-hours.ts + calendar/transit-analysis.ts pair.
 * Those have been removed.
 *
 * What's still live: getLunarPhase, which calendar/temporal-scoring
 * re-exports through this facade and analyzers/astrology-analyzer
 * consumes by date. Surface it directly so the next deletion round
 * doesn't have to chase a `export *` barrel.
 */

export { getLunarPhase } from './astrology/moonPhase'
