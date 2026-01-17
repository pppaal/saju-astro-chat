// tests/hooks/useChatSession.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSession, generateMessageId } from '@/hooks/useChatSession';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useChatSession', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty messages by default', () => {
      const { result } = renderHook(() => useChatSession());

      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe('');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with initial context', () => {
      const { result } = renderHook(() =>
        useChatSession({ initialContext: 'You are a helpful assistant.' })
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('system');
      expect(result.current.messages[0].content).toBe('You are a helpful assistant.');
    });

    it('should initialize with follow-up questions', () => {
      const followUps = ['Question 1?', 'Question 2?'];
      const { result } = renderHook(() =>
        useChatSession({ initialFollowUps: followUps })
      );

      expect(result.current.followUpQuestions).toEqual(followUps);
    });

    it('should generate unique session ID', () => {
      const { result: result1 } = renderHook(() => useChatSession());
      const { result: result2 } = renderHook(() => useChatSession());

      expect(result1.current.sessionId).toBeDefined();
      expect(result2.current.sessionId).toBeDefined();
      expect(result1.current.sessionId).not.toBe(result2.current.sessionId);
    });
  });

  describe('input management', () => {
    it('should update input value', () => {
      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.setInput('Hello');
      });

      expect(result.current.input).toBe('Hello');
    });
  });

  describe('loading state', () => {
    it('should have setLoading function', () => {
      const { result } = renderHook(() => useChatSession());

      expect(typeof result.current.setLoading).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should have setError function', () => {
      const { result } = renderHook(() => useChatSession());

      expect(typeof result.current.setError).toBe('function');
    });
  });

  describe('suggestions visibility', () => {
    it('should initialize showSuggestions as true', () => {
      const { result } = renderHook(() => useChatSession());

      expect(result.current.showSuggestions).toBe(true);
    });

    it('should toggle suggestions visibility', () => {
      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.setShowSuggestions(false);
      });

      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe('follow-up questions', () => {
    it('should update follow-up questions', () => {
      const { result } = renderHook(() => useChatSession());

      const newFollowUps = ['New question 1?', 'New question 2?'];
      act(() => {
        result.current.setFollowUpQuestions(newFollowUps);
      });

      expect(result.current.followUpQuestions).toEqual(newFollowUps);
    });
  });

  describe('feedback', () => {
    it('should initialize with empty feedback', () => {
      const { result } = renderHook(() => useChatSession());

      expect(result.current.feedback).toEqual({});
    });

    it('should update feedback', () => {
      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.setFeedback({ 'msg-1': 'up' });
      });

      expect(result.current.feedback).toEqual({ 'msg-1': 'up' });
    });
  });

  describe('message management', () => {
    it('should have setMessages function', () => {
      const { result } = renderHook(() => useChatSession());

      expect(typeof result.current.setMessages).toBe('function');
    });

    it('should add messages', () => {
      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.setMessages([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ]);
      });

      expect(result.current.messages).toHaveLength(2);
    });
  });
});

describe('generateMessageId', () => {
  it('should generate a string ID', () => {
    const id = generateMessageId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate IDs with user prefix', () => {
    const id = generateMessageId();
    expect(id).toContain('user');
  });
});
