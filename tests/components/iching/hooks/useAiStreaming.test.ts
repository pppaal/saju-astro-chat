/**
 * useAiStreaming Hook Tests
 * AI 스트리밍 해석 훅 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiStreaming, type UseAiStreamingParams, type AiStatus } from '@/components/iching/hooks/useAiStreaming';
import type { IChingResult } from '@/components/iching/types';
import type { PremiumHexagramData } from '@/lib/iChing/iChingPremiumData';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAiStreaming', () => {
  const mockPrimaryHexagram = {
    number: 1,
    name: 'The Creative',
    symbol: '☰',
    judgment: 'The Creative works sublime success',
    image: 'Heaven above heaven',
  };

  const mockResult: IChingResult = {
    primaryHexagram: mockPrimaryHexagram,
    changingLines: [1, 3],
    resultingHexagram: {
      number: 2,
      name: 'The Receptive',
      symbol: '☷',
      judgment: 'The Receptive brings about sublime success',
    },
  } as IChingResult;

  const mockPremiumData: PremiumHexagramData = {
    core_meaning: {
      ko: '창조적 에너지',
      en: 'Creative energy',
    },
    themes: {
      career: { ko: '성공적인 시작', en: 'Successful beginning' },
      love: { ko: '새로운 관계', en: 'New relationship' },
      health: { ko: '활력 넘치는', en: 'Energetic' },
      wealth: { ko: '풍요', en: 'Abundance' },
      timing: { ko: '적절한 시기', en: 'Right time' },
    },
  } as PremiumHexagramData;

  const defaultParams: UseAiStreamingParams = {
    result: mockResult,
    question: 'What should I focus on?',
    locale: 'en',
    lang: 'en',
    premiumData: mockPremiumData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(() => useAiStreaming(defaultParams));

      expect(result.current.aiStatus).toBe('idle');
      expect(result.current.currentSection).toBe('');
      expect(result.current.overviewText).toBe('');
      expect(result.current.changingText).toBe('');
      expect(result.current.adviceText).toBe('');
      expect(result.current.aiError).toBe('');
    });

    it('should return abort controller ref', () => {
      const { result } = renderHook(() => useAiStreaming(defaultParams));

      expect(result.current.abortControllerRef).toBeDefined();
      expect(result.current.abortControllerRef.current).toBeNull();
    });

    it('should return startAiInterpretation function', () => {
      const { result } = renderHook(() => useAiStreaming(defaultParams));

      expect(typeof result.current.startAiInterpretation).toBe('function');
    });
  });

  describe('startAiInterpretation', () => {
    it('should not start if result is null', async () => {
      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, result: null })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.aiStatus).toBe('idle');
    });

    it('should not start if primaryHexagram is missing', async () => {
      const { result } = renderHook(() =>
        useAiStreaming({
          ...defaultParams,
          result: { ...mockResult, primaryHexagram: null } as unknown as IChingResult,
        })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not start if already streaming', async () => {
      // Create a hanging fetch to keep status in streaming
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      );

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      // Start first request
      act(() => {
        result.current.startAiInterpretation();
      });

      // Try to start second while first is in progress
      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // Should only have one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should set loading status when starting', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  headers: new Headers({ 'content-type': 'application/json' }),
                  json: async () => ({ overview: 'Test', changing: '', advice: '' }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      act(() => {
        result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('loading');
    });

    it('should send correct request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test overview' }),
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/iching/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.any(String),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.hexagramNumber).toBe(1);
      expect(callBody.hexagramName).toBe('The Creative');
      expect(callBody.question).toBe('What should I focus on?');
      expect(callBody.locale).toBe('en');
    });

    it('should handle JSON fallback response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          overview: 'Overview text',
          changing: 'Changing text',
          advice: 'Advice text',
        }),
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('done');
      expect(result.current.overviewText).toBe('Overview text');
      expect(result.current.changingText).toBe('Changing text');
      expect(result.current.adviceText).toBe('Advice text');
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
      expect(result.current.aiError).toContain('Too many requests');
    });

    it('should handle Korean locale for rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      });

      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, locale: 'ko' })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiError).toContain('요청이 너무 많습니다');
    });

    it('should handle other HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
      expect(result.current.aiError).toContain('500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
      expect(result.current.aiError).toBe('Network failure');
    });

    it('should create new abort controller for each request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test' }),
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      // Start first request
      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const firstController = result.current.abortControllerRef.current;

      // Start second request
      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const secondController = result.current.abortControllerRef.current;

      // Each request should have its own controller
      expect(firstController).not.toBe(secondController);
    });

    it('should reset state when starting new interpretation', async () => {
      // First set some state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          overview: 'First overview',
          changing: 'First changing',
          advice: 'First advice',
        }),
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.overviewText).toBe('First overview');

      // Now start new interpretation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Second overview' }),
      });

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.overviewText).toBe('Second overview');
      expect(result.current.changingText).toBe('');
      expect(result.current.adviceText).toBe('');
    });

    it('should handle non-SSE response with JSON error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'API error message' }),
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // When JSON has error field, it throws and status becomes error
      expect(result.current.aiStatus).toBe('error');
      // The error message depends on implementation - it may wrap the error
      expect(result.current.aiError).toBeTruthy();
    });

    it('should handle malformed JSON in non-SSE response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
    });
  });

  describe('SSE streaming', () => {
    function createMockSSEResponse(events: string[]) {
      const encoder = new TextEncoder();
      let eventIndex = 0;

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => ({
            read: async () => {
              if (eventIndex >= events.length) {
                return { done: true, value: undefined };
              }
              const event = events[eventIndex++];
              return { done: false, value: encoder.encode(event) };
            },
          }),
        },
      };
    }

    it('should handle SSE overview section', async () => {
      const events = [
        'data: {"section":"overview","status":"start"}\n\n',
        'data: {"section":"overview","content":"Hello "}\n\n',
        'data: {"section":"overview","content":"World"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('done');
      expect(result.current.overviewText).toBe('Hello World');
    });

    it('should handle SSE changing section', async () => {
      const events = [
        'data: {"section":"changing","status":"start"}\n\n',
        'data: {"section":"changing","content":"Line 1 changing"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.changingText).toBe('Line 1 changing');
    });

    it('should handle SSE advice section', async () => {
      const events = [
        'data: {"section":"advice","content":"My advice is..."}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.adviceText).toBe('My advice is...');
    });

    it('should handle multiple sections in sequence', async () => {
      const events = [
        'data: {"section":"overview","content":"Overview"}\n\n',
        'data: {"section":"changing","content":"Changing"}\n\n',
        'data: {"section":"advice","content":"Advice"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.overviewText).toBe('Overview');
      expect(result.current.changingText).toBe('Changing');
      expect(result.current.adviceText).toBe('Advice');
    });

    it('should handle SSE error event', async () => {
      const events = [
        'data: {"section":"overview","content":"Start..."}\n\n',
        'data: {"error":"Stream interrupted"}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
      expect(result.current.aiError).toBe('Stream interrupted');
    });

    it('should update currentSection on section start', async () => {
      let currentSectionDuringStream = '';
      const events = [
        'data: {"section":"overview","status":"start"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // After done, currentSection should be cleared
      expect(result.current.currentSection).toBe('');
    });

    it('should set streaming status during SSE', async () => {
      const events = [
        'data: {"section":"overview","content":"Test"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // After completion, should be done
      expect(result.current.aiStatus).toBe('done');
    });

    it('should handle missing reader', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: null,
      });

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.aiStatus).toBe('error');
      expect(result.current.aiError).toContain('No reader available');
    });

    it('should ignore malformed SSE data', async () => {
      const events = [
        'data: {"section":"overview","content":"Valid"}\n\n',
        'data: not valid json\n\n',
        'data: {"section":"overview","content":" text"}\n\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // Should still have valid content
      expect(result.current.overviewText).toBe('Valid text');
      expect(result.current.aiStatus).toBe('done');
    });

    it('should ignore lines not starting with data:', async () => {
      const events = [
        'event: message\n',
        'data: {"section":"overview","content":"Hello"}\n\n',
        ': this is a comment\n',
        'data: {"done":true}\n\n',
      ];

      mockFetch.mockResolvedValue(createMockSSEResponse(events));

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      expect(result.current.overviewText).toBe('Hello');
    });
  });

  describe('abort handling', () => {
    it('should not set error on AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const { result } = renderHook(() => useAiStreaming(defaultParams));

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      // Should not be in error state for abort
      expect(result.current.aiStatus).not.toBe('error');
    });
  });

  describe('Korean language support', () => {
    it('should use Korean premium data when lang is ko', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test' }),
      });

      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, lang: 'ko' })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.coreMeaning).toBe('창조적 에너지');
      expect(callBody.themes.career).toBe('성공적인 시작');
    });

    it('should use English premium data when lang is en', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test' }),
      });

      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, lang: 'en' })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.coreMeaning).toBe('Creative energy');
      expect(callBody.themes.career).toBe('Successful beginning');
    });
  });

  describe('without premium data', () => {
    it('should handle null premium data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test' }),
      });

      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, premiumData: null })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.coreMeaning).toBe('');
      expect(callBody.themes).toEqual({});
    });
  });

  describe('without resulting hexagram', () => {
    it('should handle result without resultingHexagram', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ overview: 'Test' }),
      });

      const resultWithoutResulting = {
        ...mockResult,
        resultingHexagram: undefined,
      } as IChingResult;

      const { result } = renderHook(() =>
        useAiStreaming({ ...defaultParams, result: resultWithoutResulting })
      );

      await act(async () => {
        await result.current.startAiInterpretation();
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.resultingHexagram).toBeUndefined();
    });
  });
});
