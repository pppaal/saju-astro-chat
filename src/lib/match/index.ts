/**
 * Match Engine — public API for the matching/discovery system.
 *
 * Usage pattern:
 *   1. On signup or birth-info entry:
 *      const profile = await buildMatchProfile(birthInfo)
 *      // Save profile to DB / Redis (it's ~1KB JSON)
 *
 *   2. Discover feed (50-100 candidates):
 *      const ranked = tier1RankCandidates(myProfile, candidates)
 *      // ~5ms total, sorted by score desc
 *
 *   3. Card detail tap:
 *      const detail = tier2MediumScore(myProfile, candidate.profile)
 *      // ~50ms, includes tagline + reasons + top attraction/friction
 *
 *   4. After mutual match:
 *      const starters = buildConversationStarters(myProfile, matched)
 *      // First-message hooks
 *
 *   5. Full report (post-match deep dive):
 *      // Use existing src/lib/compatibility/* engine — see tier3 wrapper
 */

export {
  buildMatchProfile,
  isProfileFresh,
  type MatchProfile,
  type BirthInfo,
  type Element,
  type YinYang,
  type PlanetSummary,
} from './matchProfile'

export {
  tier1QuickScore,
  tier1RankCandidates,
  type QuickMatchResult,
  type MatchBand,
} from './tier1Quick'

export { tier2MediumScore, type MediumMatchResult } from './tier2Medium'

export {
  buildConversationStarters,
  type ConversationStarter,
} from './conversationStarters'
