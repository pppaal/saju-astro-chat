import { describe, it, expect } from 'vitest';

describe('AI Summarize Module Exports', () => {
  it('should export summarizeConversation function', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    expect(typeof summarizeConversation).toBe('function');
  });

  it('should export summarizeWithAI function', async () => {
    const { summarizeWithAI } = await import('@/lib/ai');
    expect(typeof summarizeWithAI).toBe('function');
  });

  it('should export buildLongTermMemory function', async () => {
    const { buildLongTermMemory } = await import('@/lib/ai');
    expect(typeof buildLongTermMemory).toBe('function');
  });

  it('should export longTermMemoryToPrompt function', async () => {
    const { longTermMemoryToPrompt } = await import('@/lib/ai');
    expect(typeof longTermMemoryToPrompt).toBe('function');
  });
});

describe('summarizeConversation', () => {
  it('should return null for empty messages', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const result = await summarizeConversation([], 'love', 'ko');
    expect(result).toBeNull();
  });

  it('should return null for single message', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const result = await summarizeConversation(
      [{ role: 'user', content: 'Hello' }],
      'love',
      'ko'
    );
    expect(result).toBeNull();
  });

  it('should return null for no user messages', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const result = await summarizeConversation(
      [
        { role: 'assistant', content: 'Hello' },
        { role: 'assistant', content: 'How can I help?' },
      ],
      'love',
      'ko'
    );
    expect(result).toBeNull();
  });

  it('should return summary for valid conversation', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const messages = [
      { role: 'user' as const, content: 'Test question' },
      { role: 'assistant' as const, content: 'Test answer' },
    ];
    const result = await summarizeConversation(messages, 'love', 'ko');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('keyTopics');
    expect(result).toHaveProperty('emotionalTone');
  });

  it('should detect anxious emotional tone', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const anxiousMessages = [
      { role: 'user' as const, content: 'worried anxious scared' },
      { role: 'assistant' as const, content: 'I understand' },
    ];
    const result = await summarizeConversation(anxiousMessages, 'love', 'en');
    expect(result?.emotionalTone).toBe('anxious');
  });

  it('should detect hopeful emotional tone', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const hopefulMessages = [
      { role: 'user' as const, content: 'hope excited happy great' },
      { role: 'assistant' as const, content: 'Nice!' },
    ];
    const result = await summarizeConversation(hopefulMessages, 'love', 'en');
    expect(result?.emotionalTone).toBe('hopeful');
  });

  it('should detect curious emotional tone', async () => {
    const { summarizeConversation } = await import('@/lib/ai');
    const curiousMessages = [
      { role: 'user' as const, content: 'curious want to know how when where' },
      { role: 'assistant' as const, content: 'Let me explain' },
    ];
    const result = await summarizeConversation(curiousMessages, 'love', 'en');
    expect(result?.emotionalTone).toBe('curious');
  });
});

describe('buildLongTermMemory', () => {
  it('should build memory from sessions', async () => {
    const { buildLongTermMemory } = await import('@/lib/ai');
    const sessions = [
      {
        summary: 'Love consultation',
        keyTopics: ['love', '2025'],
        theme: 'love',
        updatedAt: new Date(),
      },
    ];
    const personaMemory = {
      dominantThemes: ['love'],
      keyInsights: ['insight1'],
      emotionalTone: 'hopeful',
      growthAreas: ['relationships'],
      recurringIssues: [],
      sessionCount: 5,
    };
    const result = buildLongTermMemory(sessions, personaMemory, 'en');
    expect(result).toHaveProperty('userProfile');
    expect(result).toHaveProperty('coreThemes');
    expect(result).toHaveProperty('journeyNarrative');
    expect(result).toHaveProperty('progressNotes');
    expect(result).toHaveProperty('futureGoals');
    expect(result).toHaveProperty('consultationStyle');
  });

  it('should handle null personaMemory', async () => {
    const { buildLongTermMemory } = await import('@/lib/ai');
    const sessions = [
      {
        summary: 'Consultation',
        keyTopics: ['topic'],
        theme: 'life',
        updatedAt: new Date(),
      },
    ];
    const result = buildLongTermMemory(sessions, null, 'en');
    expect(result.userProfile).toBeDefined();
    expect(result.coreThemes).toBeDefined();
  });

  it('should handle empty sessions', async () => {
    const { buildLongTermMemory } = await import('@/lib/ai');
    const result = buildLongTermMemory([], null, 'en');
    expect(result.coreThemes).toEqual([]);
    expect(result.journeyNarrative).toBe('Starting consultation journey');
  });
});

describe('longTermMemoryToPrompt', () => {
  it('should convert memory to prompt string', async () => {
    const { longTermMemoryToPrompt } = await import('@/lib/ai');
    const memory = {
      userProfile: '5 sessions',
      coreThemes: ['love', 'career'],
      journeyNarrative: 'Recent consultation',
      progressNotes: ['insight1', 'insight2'],
      futureGoals: ['goal1'],
      consultationStyle: 'Main interests',
    };
    const result = longTermMemoryToPrompt(memory, 'en');
    expect(typeof result).toBe('string');
    expect(result).toContain('[Profile]');
    expect(result).toContain('[Core Interests]');
    expect(result).toContain('[Journey]');
    expect(result).toContain('[Insights]');
    expect(result).toContain('[Goals]');
  });

  it('should handle empty arrays', async () => {
    const { longTermMemoryToPrompt } = await import('@/lib/ai');
    const memory = {
      userProfile: 'Profile',
      coreThemes: [],
      journeyNarrative: '',
      progressNotes: [],
      futureGoals: [],
      consultationStyle: '',
    };
    const result = longTermMemoryToPrompt(memory, 'en');
    expect(result).toContain('[Profile]');
    expect(result).not.toContain('[Core Interests]');
  });
});
