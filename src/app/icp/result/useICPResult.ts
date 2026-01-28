import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import type { ICPQuizAnswers, ICPAnalysis } from '@/lib/icp/types';
import { analyzeICP } from '@/lib/icp/analysis';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';
import { useConfetti } from '@/hooks/useConfetti';

const ICP_CONFETTI_COLORS = ['#9d4edd', '#ffd166', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];

export default function useICPResult(locale: string) {
  const isKo = locale === 'ko';
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [answers, setAnswers] = useState<ICPQuizAnswers>({});
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  const { showConfetti, confettiParticles, createConfetti } = useConfetti(ICP_CONFETTI_COLORS);

  // Load answers from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('icpQuizAnswers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
    } catch (error) {
      logger.error('[ICP Result] Error loading answers:', error);
    }
  }, []);

  // Check if already saved to DB
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user) {
      fetch('/api/icp')
        .then(res => res.json())
        .then(data => {
          if (data.saved) {
            setIsSavedToDb(true);
          }
        })
        .catch(() => {});
    }
  }, [authStatus, session?.user]);

  const analysis: ICPAnalysis | null = useMemo(() => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) {return null;}
    try {
      return analyzeICP(answers, locale);
    } catch (error) {
      logger.error('[ICP Result] Analysis error:', error);
      return null;
    }
  }, [answers, locale]);

  // Trigger confetti when analysis is ready
  useEffect(() => {
    if (mounted && analysis) {
      const confettiKey = `icp_confetti_shown_${analysis.primaryStyle}`;
      const alreadyShown = sessionStorage.getItem(confettiKey);

      if (!alreadyShown) {
        const timer = setTimeout(() => {
          createConfetti();
          sessionStorage.setItem(confettiKey, 'true');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, analysis, createConfetti]);

  const handleSaveResult = useCallback(async () => {
    if (!analysis) {return;}

    if (authStatus !== 'authenticated') {
      router.push(buildSignInUrl('/icp/result'));
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await fetchWithRetry('/api/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryStyle: analysis.primaryStyle,
          secondaryStyle: analysis.secondaryStyle,
          dominanceScore: analysis.dominanceScore,
          affiliationScore: analysis.affiliationScore,
          consistencyScore: analysis.consistencyScore,
          analysisData: {
            summary: isKo ? analysis.summaryKo : analysis.summary,
            octantScores: analysis.octantScores,
            primaryOctant: analysis.primaryOctant,
            secondaryOctant: analysis.secondaryOctant,
          },
        }),
      }, {
        maxRetries: 3,
        timeoutMs: 15000,
        onRetry: (attempt, error, delay) => {
          logger.info(`[ICP Save] Retry ${attempt} after ${delay}ms: ${error.message}`);
        },
      });

      if (res.ok) {
        setSaveStatus('saved');
        setIsSavedToDb(true);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      if (error instanceof FetchWithRetryError) {
        logger.error('[ICP Save] Failed after retries:', error.message);
      }
      setSaveStatus('error');
    }
  }, [analysis, authStatus, router, isKo]);

  const handleDownload = useCallback(() => {
    if (!analysis) {return;}
    const payload = {
      answers,
      primaryStyle: analysis.primaryStyle,
      secondaryStyle: analysis.secondaryStyle,
      dominanceScore: analysis.dominanceScore,
      affiliationScore: analysis.affiliationScore,
      consistencyScore: analysis.consistencyScore,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icp_result_${analysis.primaryStyle}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis, answers]);

  const handleShare = useCallback(async () => {
    if (!analysis) {return;}

    const summary = isKo ? analysis.summaryKo : analysis.summary;
    const styleName = isKo ? analysis.primaryOctant.korean : analysis.primaryOctant.name;
    const shareText = isKo
      ? `나의 대인관계 스타일: ${styleName} (${analysis.primaryStyle})\n${summary}\n\nDestinyPal.me에서 진단해보세요`
      : `My Interpersonal Style: ${styleName} (${analysis.primaryStyle})\n${summary}\n\nDiscover yours at DestinyPal.me`;

    try {
      if (navigator.share) {
        await navigator.share({ title: isKo ? '대인관계 스타일 진단' : 'Interpersonal Style', text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(isKo ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
      }
    } catch {
      navigator.clipboard.writeText(shareText);
      alert(isKo ? '클립보드에 복사되었습니다!' : 'Copied to clipboard!');
    }
  }, [analysis, isKo]);

  return {
    mounted,
    analysis,
    authStatus,
    saveStatus,
    isSavedToDb,
    showConfetti,
    confettiParticles,
    handleSaveResult,
    handleDownload,
    handleShare,
  };
}
