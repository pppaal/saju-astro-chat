import { useEffect, useMemo, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { PersonaAnalysis, PersonaQuizAnswers } from '@/lib/persona/types';
import { analyzePersona } from '@/lib/persona/analysis';
import { useI18n } from '@/i18n/I18nProvider';
import { buildSignInUrl } from '@/lib/auth/signInUrl';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';
import { useConfetti } from '@/hooks/useConfetti';
import { generateShareCard } from './generateShareCard';

export function usePersonaResult() {
  const { t, locale } = useI18n();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [answers, setAnswers] = useState<PersonaQuizAnswers>({});
  const [mounted, setMounted] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { showConfetti, confettiParticles, createConfetti } = useConfetti();

  // Load answers and gender from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('personaQuizAnswers') ?? localStorage.getItem('auraQuizAnswers') ?? localStorage.getItem('aura_answers');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnswers(parsed);
      }
      // Read gender from initial selection (personaGender or auraGender is 'male' or 'female')
      const selectedGender = localStorage.getItem('personaGender') ?? localStorage.getItem('auraGender');
      if (selectedGender === 'male') {
        setGender('M');
      } else if (selectedGender === 'female') {
        setGender('F');
      }
    } catch {
      // noop
    }
  }, []);

  // Check if already saved to DB
  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user) {
      fetch('/api/personality')
        .then(res => res.json())
        .then(data => {
          if (data.saved) {
            setIsSavedToDb(true);
          }
        })
        .catch(() => {});
    }
  }, [authStatus, session?.user]);

  const analysis: PersonaAnalysis | null = useMemo(() => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers) {return null;}
    try {
      return analyzePersona(answers, locale);
    } catch {
      return null;
    }
  }, [answers, locale]);

  const handleSaveResult = useCallback(async () => {
    if (!analysis) {return;}

    if (authStatus !== 'authenticated') {
      router.push(buildSignInUrl('/personality/result'));
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await fetchWithRetry('/api/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeCode: analysis.typeCode,
          personaName: analysis.personaName,
          avatarGender: gender,
          energyScore: analysis.axes.energy.score,
          cognitionScore: analysis.axes.cognition.score,
          decisionScore: analysis.axes.decision.score,
          rhythmScore: analysis.axes.rhythm.score,
          consistencyScore: analysis.consistencyScore,
          analysisData: {
            summary: analysis.summary,
            keyMotivations: analysis.keyMotivations,
            strengths: analysis.strengths,
            challenges: analysis.challenges,
            recommendedRoles: analysis.recommendedRoles,
            career: analysis.career,
            compatibilityHint: analysis.compatibilityHint,
            guidance: analysis.guidance,
            growthTips: analysis.growthTips,
            primaryColor: analysis.primaryColor,
            secondaryColor: analysis.secondaryColor,
          },
          answers,
        }),
      }, {
        maxRetries: 3,
        timeoutMs: 15000,
        onRetry: (attempt, error, delay) => {
          logger.info(`[Persona Save] Retry ${attempt} after ${delay}ms: ${error.message}`);
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
        logger.error('[Persona Save] Failed after retries:', error.message);
      }
      setSaveStatus('error');
    }
  }, [analysis, authStatus, router, gender, answers]);

  // Trigger confetti when analysis is ready (only once per result)
  useEffect(() => {
    if (mounted && analysis) {
      // Check if we already showed confetti for this specific result
      const confettiKey = `confetti_shown_${analysis.typeCode}`;
      const alreadyShown = sessionStorage.getItem(confettiKey);

      if (!alreadyShown) {
        const timer = setTimeout(() => {
          createConfetti();
          sessionStorage.setItem(confettiKey, 'true');
        }, 500);
        return () => clearTimeout(timer);
      }

      // Save analysis result to localStorage for counselor integration
      try {
        localStorage.setItem('personaResult', JSON.stringify({
          typeCode: analysis.typeCode,
          personaName: analysis.personaName,
          summary: analysis.summary,
          axes: analysis.axes,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [mounted, analysis, createConfetti]);

  const avatarSrc = analysis ? `/images/persona/${analysis.typeCode}_${gender}.gif` : null;

  const handleDownload = useCallback(() => {
    if (!analysis) {return;}
    const payload = {
      answers,
      typeCode: analysis.typeCode,
      consistencyScore: analysis.consistencyScore,
      consistencyLabel: analysis.consistencyLabel,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_persona_${analysis.typeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis, answers]);

  const handleGenerateShareCard = useCallback(async (): Promise<Blob | null> => {
    if (!analysis) {return null;}
    return generateShareCard(analysis, locale);
  }, [analysis, locale]);

  const handleShare = useCallback(async () => {
    if (!analysis) {return;}

    try {
      // Try to generate and share image
      const imageBlob = await handleGenerateShareCard();
      const shareText = `My Nova Persona: ${analysis.personaName} (${analysis.typeCode})\n${analysis.summary}\n\nDiscover yours at DestinyPal.me`;

      if (imageBlob && navigator.share && navigator.canShare) {
        const file = new File([imageBlob], 'nova-persona.png', { type: 'image/png' });
        const shareData = {
          title: 'My Nova Persona',
          text: shareText,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback to text share
      if (navigator.share) {
        await navigator.share({ title: 'My Nova Persona', text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(t('personality.copiedToClipboard', 'Copied to clipboard!'));
      }
    } catch {
      // User cancelled or error
      const shareText = `My Nova Persona: ${analysis.personaName} (${analysis.typeCode})\n${analysis.summary}`;
      navigator.clipboard.writeText(shareText);
      alert(t('personality.copiedToClipboard', 'Copied to clipboard!'));
    }
  }, [analysis, handleGenerateShareCard, t]);

  return {
    // i18n
    t,
    locale,
    // auth
    authStatus,
    // state
    mounted,
    analysis,
    avatarSrc,
    avatarError,
    setAvatarError,
    saveStatus,
    isSavedToDb,
    showConfetti,
    confettiParticles,
    // handlers
    handleSaveResult,
    handleDownload,
    handleShare,
  };
}
