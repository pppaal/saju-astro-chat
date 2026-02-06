// src/hooks/index.ts
// Central export for custom hooks

export {
  useChatSession,
  generateMessageId,
  type FeedbackType,
  type UseChatSessionOptions,
} from './useChatSession.unified'

export { useUserProfile } from './useUserProfile'

// Life Prediction Hooks
export { useLifePredictionProfile } from './useLifePredictionProfile'
export { useLifePredictionPhase } from './useLifePredictionPhase'
export { useLifePredictionState } from './useLifePredictionState'
export { useLifePredictionAnimation } from './useLifePredictionAnimation'
export { useLifePredictionAPI } from './useLifePredictionAPI'

// Shared Hooks
export { useConfetti } from './useConfetti'

// Share Hooks
export {
  useShare,
  useShareMenu,
  useReferralShare,
  type ShareOptions,
  type UseShareReturn,
  type UseShareMenuReturn,
} from './useShare'
