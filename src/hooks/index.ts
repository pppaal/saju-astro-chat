// src/hooks/index.ts
// Central export for custom hooks

export {
  useChatSession,
  generateMessageId,
  type ChatSessionMessage,
  type FeedbackType,
  type UseChatSessionOptions,
} from "./useChatSession";

export { useUserProfile } from "./useUserProfile";
export { useConsultationHistory } from "./useConsultationHistory";
export { usePersonaMemory } from "./usePersonaMemory";

// Life Prediction Hooks
export { useLifePredictionProfile } from './useLifePredictionProfile';
export { useLifePredictionPhase } from './useLifePredictionPhase';
export { useLifePredictionState } from './useLifePredictionState';
export { useLifePredictionAnimation } from './useLifePredictionAnimation';
export { useLifePredictionAPI } from './useLifePredictionAPI';
