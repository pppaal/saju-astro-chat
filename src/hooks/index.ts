// src/hooks/index.ts
// Central export for custom hooks

export {
  useChatSession,
  generateMessageId,
  type FeedbackType,
  type UseChatSessionOptions,
} from "./useChatSession.unified";

export { useUserProfile } from "./useUserProfile";
export { useConsultationHistory } from "./useConsultationHistory";

// Life Prediction Hooks
export { useLifePredictionProfile } from './useLifePredictionProfile';
export { useLifePredictionPhase } from './useLifePredictionPhase';
export { useLifePredictionState } from './useLifePredictionState';
export { useLifePredictionAnimation } from './useLifePredictionAnimation';
export { useLifePredictionAPI } from './useLifePredictionAPI';
// Unified life prediction flow (combines Phase + State)
export {
  useLifePredictionFlow,
  type PredictionPhase,
  type PredictionEventType,
  type TimingPeriod,
  type PredictionState,
  type UseLifePredictionFlowOptions,
  type UseLifePredictionFlowReturn,
} from './useLifePredictionFlow';

// Shared Hooks
export { useConfetti } from './useConfetti';

// Modal Hooks
export {
  useModalBase,
  useModalState,
  useConfirmDialog,
  type UseModalBaseOptions,
  type UseModalBaseReturn,
  type ConfirmDialogState,
} from './useModalBase';

// Share Hooks
export {
  useShare,
  useShareMenu,
  useReferralShare,
  type ShareOptions,
  type UseShareReturn,
  type UseShareMenuReturn,
} from './useShare';

// Chat Core Hooks
export {
  useChatCore,
  useVoiceRecording,
  useStreamingChat,
  useFollowUpGenerator,
  type Message as ChatMessage,
  type FeedbackType as ChatFeedbackType,
  type ChatCoreConfig,
  type ChatCoreState,
  type VoiceRecordingState,
  type StreamingConfig,
  type StreamingState,
} from './useChatCore';

// Tab Data Hooks
export {
  useTabData,
  useSajuData,
  useAstroData,
  useAllData,
  TabLoading,
  TabEmpty,
  type TabProps,
} from './useTabData';

// Animation Hooks
export {
  useAnimationFrame,
  useParticleSystem,
  useStarfield,
  type UseAnimationFrameOptions,
  type AnimationFrameContext,
  type DrawFrameCallback,
  type UseAnimationFrameReturn,
  type Particle,
  type UseParticleSystemOptions,
  type UseStarfieldOptions,
} from './useAnimationFrame';

// Async State Hooks
export {
  useAsyncState,
  useFetch,
  useMutation,
  type AsyncStatus,
  type AsyncState,
  type UseAsyncStateOptions,
  type UseAsyncStateReturn,
  type UseFetchOptions,
  type UseMutationOptions,
} from './useAsyncState';

// Storage State Hooks
export {
  useStorageState,
  useSessionState,
  useLocalState,
  useChatStorage,
  type StorageType,
  type UseStorageStateOptions,
  type UseStorageStateReturn,
} from './useStorageState';

// Form Hooks
export {
  useField,
  useSearchField,
  useForm,
  type FieldState,
  type UseFieldOptions,
  type UseFieldReturn,
  type UseSearchFieldOptions,
  type UseSearchFieldReturn,
  type UseFormOptions,
  type UseFormReturn,
} from './useFormField';
