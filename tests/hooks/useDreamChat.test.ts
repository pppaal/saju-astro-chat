import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDreamChat } from '@/hooks/useDreamChat';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api');
vi.mock('@/lib/logger');

describe('useDreamChat', () => {
  const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

  const mockResult = {
    summary: 'Dream summary',
    dreamSymbols: [
      { label: 'Water', meaning: 'Emotions' },
      { label: 'Fire', meaning: 'Passion' },
    ],
    themes: [
      { label: 'Transformation', description: 'Change and growth' },
    ],
    recommendations: [
      { title: 'Meditate daily', description: 'Practice mindfulness' },
      'Keep a dream journal',
    ],
    culturalNotes: 'Cultural interpretation',
    celestial: { moon_phase: 'Waxing' },
  };

  const mockUserProfile = {
    birthDate: '1990-01-01',
    birthTime: '10:00',
    birthCity: 'Seoul',
    timezone: 'Asia/Seoul',
  };

  const mockGuestBirthInfo = {
    birthDate: '1995-05-15',
    birthTime: '14:30',
    birthCity: 'Busan',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message sending', () => {
    it('should not send empty message', async () => {
      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream about flying', mockResult, null, null)
      );

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it('should not send message while loading', async () => {
      mockApiFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ reply: 'Response' }),
                } as Response),
              1000
            )
          )
      );

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream text', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('First message');
      });

      act(() => {
        result.current.sendMessage();
      });

      expect(result.current.isChatLoading).toBe(true);

      act(() => {
        result.current.setChatInput('Second message');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      // Should only be called once
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    it('should add user message to chat', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'AI response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream text', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('What does water symbolize?');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const userMessage = result.current.chatMessages.find(
        (m) => m.role === 'user'
      );
      expect(userMessage?.content).toBe('What does water symbolize?');
    });

    it('should clear input after sending', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream text', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Test message');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.chatInput).toBe('');
    });
  });

  describe('Dream context building', () => {
    it('should include dream context in API request', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'I dreamed of water', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Tell me more');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/dream/chat',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dreamContext.dreamText).toBe('I dreamed of water');
      expect(body.dreamContext.summary).toBe('Dream summary');
      expect(body.dreamContext.symbols).toEqual(['Water', 'Fire']);
      expect(body.dreamContext.themes).toEqual(['Transformation']);
    });

    it('should include user profile saju in context', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat(
          'en',
          'Dream',
          mockResult,
          mockUserProfile as any,
          null
        )
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dreamContext.saju.birth_date).toBe('1990-01-01');
      expect(body.dreamContext.saju.birth_time).toBe('10:00');
    });

    it('should include guest birth info in context', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, mockGuestBirthInfo)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dreamContext.saju.birth_date).toBe('1995-05-15');
      expect(body.dreamContext.saju.birth_city).toBe('Busan');
    });

    it('should work without saju info', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dreamContext.saju).toBeUndefined();
    });
  });

  describe('SSE streaming response', () => {
    it('should handle streaming response', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {"token":"Hello"}\n')
          );
          controller.enqueue(
            new TextEncoder().encode('data: {"token":" world"}\n')
          );
          controller.enqueue(new TextEncoder().encode('data: {"token":"!"}\n'));
          controller.close();
        },
      });

      mockApiFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'text/event-stream' : null,
        },
        body: mockStream,
      } as any);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Tell me more');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toBe('Hello world!');
      });
    });

    it('should handle empty streaming response', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      mockApiFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'text/event-stream' : null,
        },
        body: mockStream,
      } as any);

      const { result } = renderHook(() =>
        useDreamChat('ko', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('질문');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('받지 못했습니다');
      });
    });
  });

  describe('JSON response', () => {
    it('should handle regular JSON response', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ reply: 'This is the AI response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toBe('This is the AI response');
      });
    });

    it('should handle response field instead of reply', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ response: 'Alternative field' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toBe('Alternative field');
      });
    });

    it('should handle missing reply in JSON response', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('No response received');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useDreamChat('ko', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('질문');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('문제가 발생했습니다');
      });
    });

    it('should handle non-ok response', async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('issue getting a response');
      });
    });
  });

  describe('Reset functionality', () => {
    it('should reset chat messages and input', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.chatMessages.length).toBeGreaterThan(0);

      act(() => {
        result.current.resetChat();
      });

      expect(result.current.chatMessages).toEqual([]);
      expect(result.current.chatInput).toBe('');
    });
  });

  describe('Locale handling', () => {
    it('should send locale to API', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('ko', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('질문');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.locale).toBe('ko');
    });

    it('should use Korean error messages', async () => {
      mockApiFetch.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() =>
        useDreamChat('ko', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('질문');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('문제가 발생했습니다');
      });
    });

    it('should use English error messages', async () => {
      mockApiFetch.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      await waitFor(() => {
        const lastMessage =
          result.current.chatMessages[result.current.chatMessages.length - 1];
        expect(lastMessage?.content).toContain('issue getting a response');
      });
    });
  });

  describe('Edge cases', () => {
    it('should trim whitespace from messages', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('   Message with spaces   ');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const userMessage = result.current.chatMessages.find(
        (m) => m.role === 'user'
      );
      expect(userMessage?.content).toBe('Message with spaces');
    });

    it('should handle recommendations as objects', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('Question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      const body = JSON.parse(mockApiFetch.mock.calls[0][1]?.body as string);
      expect(body.dreamContext.recommendations).toContain('Meditate daily');
      expect(body.dreamContext.recommendations).toContain(
        'Keep a dream journal'
      );
    });

    it('should handle multiple consecutive messages', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ reply: 'Response' }),
      } as Response);

      const { result } = renderHook(() =>
        useDreamChat('en', 'Dream', mockResult, null, null)
      );

      act(() => {
        result.current.setChatInput('First question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      act(() => {
        result.current.setChatInput('Second question');
      });

      await act(async () => {
        await result.current.sendMessage();
      });

      expect(result.current.chatMessages.length).toBe(4); // 2 user + 2 assistant
    });
  });
});
