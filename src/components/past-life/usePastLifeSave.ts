// src/components/past-life/usePastLifeSave.ts
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';
import { logger } from '@/lib/logger';
import type { PastLifeResult } from '@/lib/past-life/types';

interface UsePastLifeSaveProps {
  result: PastLifeResult;
  birthDate: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  locale?: string;
}

export function usePastLifeSave({
  result,
  birthDate,
  birthTime,
  latitude,
  longitude,
  timezone,
  locale = 'ko',
}: UsePastLifeSaveProps) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  // Check if already saved to DB
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user) {
      fetch('/api/past-life/save')
        .then((res) => res.json())
        .then((data) => {
          if (data.saved) {
            setIsSavedToDb(true);
          }
        })
        .catch(() => {});
    }
  }, [authStatus, session?.user]);

  const handleSave = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      // Redirect to login page with return URL
      router.push(buildSignInUrl('/past-life'));
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await fetchWithRetry(
        '/api/past-life/save',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate,
            birthTime,
            latitude,
            longitude,
            timezone,
            karmaScore: result.karmaScore,
            analysisData: {
              soulPattern: result.soulPattern,
              pastLife: result.pastLife,
              soulJourney: result.soulJourney,
              karmicDebts: result.karmicDebts,
              thisLifeMission: result.thisLifeMission,
              talentsCarried: result.talentsCarried,
              saturnLesson: result.saturnLesson,
            },
            locale,
          }),
        },
        {
          maxRetries: 3,
          timeoutMs: 15000,
          onRetry: (attempt, error, delay) => {
            logger.info(`[PastLife Save] Retry ${attempt} after ${delay}ms: ${error.message}`);
          },
        }
      );

      if (res.ok) {
        setSaveStatus('saved');
        setIsSavedToDb(true);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      if (error instanceof FetchWithRetryError) {
        logger.error('[PastLife Save] Failed after retries:', error.message);
      }
      setSaveStatus('error');
    }
  }, [
    authStatus,
    router,
    result,
    birthDate,
    birthTime,
    latitude,
    longitude,
    timezone,
    locale,
  ]);

  const handleDownload = useCallback(() => {
    const payload = {
      birthDate,
      birthTime,
      karmaScore: result.karmaScore,
      soulPattern: result.soulPattern,
      pastLife: result.pastLife,
      soulJourney: result.soulJourney,
      karmicDebts: result.karmicDebts,
      thisLifeMission: result.thisLifeMission,
      talentsCarried: result.talentsCarried,
      saturnLesson: result.saturnLesson,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `past_life_result_${birthDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, birthDate, birthTime]);

  const handleShare = useCallback(async () => {
    const shareText = locale === 'ko'
      ? `나의 전생 리딩 결과: ${result.soulPattern.title}\n카르마 스코어: ${result.karmaScore}/100\n\nDestinyPal.me에서 확인해보세요`
      : `My Past Life Reading: ${result.soulPattern.title}\nKarma Score: ${result.karmaScore}/100\n\nDiscover yours at DestinyPal.me`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: locale === 'ko' ? '전생 리딩 결과' : 'Past Life Reading',
          text: shareText,
        });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(locale === 'ko' ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
      }
    } catch {
      navigator.clipboard.writeText(shareText);
      alert(locale === 'ko' ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
    }
  }, [result, locale]);

  return {
    authStatus,
    saveStatus,
    isSavedToDb,
    handleSave,
    handleDownload,
    handleShare,
  };
}
