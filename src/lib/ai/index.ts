// src/lib/ai/index.ts
// AI utilities barrel export

// Recommendations
export {
  generateLifeRecommendations,
  type UserProfile,
  type LifeRecommendation,
  type CareerRecommendation,
  type LoveRecommendation,
  type FitnessRecommendation,
  type HealthRecommendation,
  type WealthRecommendation,
  type LifestyleRecommendation,
} from './recommendations';

// Conversation summarization
export {
  summarizeConversation,
  summarizeWithAI,
  buildLongTermMemory,
  longTermMemoryToPrompt,
  type ConversationSummary,
  type LongTermMemory,
} from './summarize';
