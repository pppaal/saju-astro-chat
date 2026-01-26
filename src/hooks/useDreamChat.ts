import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage, InsightResponse, UserProfile, GuestBirthInfo } from '@/lib/dream/types';
import { apiFetch } from '@/lib/api';
import { logger } from '@/lib/logger';

export function useDreamChat(
  locale: string,
  dreamText: string,
  result: InsightResponse | null,
  userProfile: UserProfile | null,
  guestBirthInfo: GuestBirthInfo | null
) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) {return;}

    const userMessage = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMessage }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      // Build dream context for API
      const dreamContext = {
        dreamText,
        summary: result?.summary,
        symbols: result?.dreamSymbols?.map(s => s.label),
        themes: result?.themes?.map(t => t.label),
        recommendations: result?.recommendations?.map(r => typeof r === 'string' ? r : r.title),
        cultural_notes: result?.culturalNotes,
        celestial: result?.celestial,
        saju: userProfile?.birthDate ? {
          birth_date: userProfile.birthDate,
          birth_time: userProfile.birthTime,
          birth_city: userProfile.birthCity,
          timezone: userProfile.timezone,
        } : guestBirthInfo?.birthDate ? {
          birth_date: guestBirthInfo.birthDate,
          birth_time: guestBirthInfo.birthTime,
          birth_city: guestBirthInfo.birthCity,
        } : undefined,
      };

      const res = await apiFetch('/api/dream/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dreamContext,
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error('Chat request failed');
      }

      // Check if response is SSE stream
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = res.body?.getReader();
        if (!reader) {throw new Error('No stream reader');}

        const decoder = new TextDecoder();
        let fullReply = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {break;}

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullReply += data.token;
                  // Update message in real-time
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                      updated[lastIdx] = { ...updated[lastIdx], content: fullReply };
                    } else {
                      updated.push({ role: 'assistant', content: fullReply });
                    }
                    return updated;
                  });
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }

        if (!fullReply) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: locale === 'ko' ? '응답을 받지 못했습니다.' : 'No response received.' }]);
        }
      } else {
        // Handle regular JSON response
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.response || (locale === 'ko' ? '응답을 받지 못했습니다.' : 'No response received.') }]);
      }
    } catch (err) {
      logger.error('Chat error:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: locale === 'ko'
          ? '죄송합니다. 응답을 가져오는 데 문제가 발생했습니다. 다시 시도해주세요.'
          : 'Sorry, there was an issue getting a response. Please try again.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, userProfile, guestBirthInfo, dreamText, result, locale, chatMessages]);

  const resetChat = useCallback(() => {
    setChatMessages([]);
    setChatInput('');
  }, []);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return {
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatMessagesRef,
    sendMessage,
    resetChat,
  };
}
