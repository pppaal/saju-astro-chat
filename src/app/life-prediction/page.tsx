'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

// Hooks
import { useLifePredictionProfile } from '@/hooks/useLifePredictionProfile';
import { useLifePredictionPhase } from '@/hooks/useLifePredictionPhase';
import { useLifePredictionState } from '@/hooks/useLifePredictionState';
import { useLifePredictionAnimation } from '@/hooks/useLifePredictionAnimation';
import { useLifePredictionAPI } from '@/hooks/useLifePredictionAPI';

// Phase Components
import {
  BirthInputPhase,
  QuestionInputPhase,
  AnalyzingPhase,
  ResultsPhase,
} from '@/components/life-prediction/phases';

// Tabs Component
import LifePredictionTabs from '@/components/life-prediction/LifePredictionTabs';

// UI Components
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import styles from './life-prediction.module.css';

export default function LifePredictionPage() {
  return <LifePredictionContent />;
}

function LifePredictionContent() {
  const { locale } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();

  // Show tabs initially
  const [showTabs, setShowTabs] = useState(true);

  // Background animation
  const canvasRef = useLifePredictionAnimation();

  // Profile management
  const {
    userProfile,
    guestBirthInfo,
    profileLoading,
    handleBirthInfoSubmit,
    handleChangeBirthInfo: resetBirthInfo,
  } = useLifePredictionProfile(status);

  // Prediction state
  const {
    currentQuestion,
    setCurrentQuestion,
    currentEventType,
    setCurrentEventType,
    results,
    setResults,
    error,
    setError,
    generalAdvice,
    setGeneralAdvice,
    resetAll,
  } = useLifePredictionState();

  // Phase navigation
  const { phase, setPhase, handleAskAgain, handleChangeBirthInfo } = useLifePredictionPhase(
    'birth-input',
    resetAll,
    resetBirthInfo
  );

  // API handler
  const { handleSubmit: submitPrediction } = useLifePredictionAPI(
    userProfile,
    guestBirthInfo,
    locale,
    setError
  );

  // Update phase based on profile
  React.useEffect(() => {
    if (profileLoading) {return;}

    if (userProfile?.birthDate || guestBirthInfo?.birthDate) {
      if (phase === 'birth-input') {
        setPhase('input');
      }
    } else {
      setPhase('birth-input');
    }
  }, [profileLoading, userProfile, guestBirthInfo, phase, setPhase]);

  // Handle birth info submission
  const onBirthInfoSubmit = React.useCallback(
    async (birthInfo: {
      birthDate: string;
      birthTime: string;
      gender: 'M' | 'F';
      birthCity?: string;
    }) => {
      await handleBirthInfoSubmit(birthInfo);
      setPhase('input');
    },
    [handleBirthInfoSubmit, setPhase]
  );

  // Handle prediction submission
  const onPredictionSubmit = React.useCallback(
    async (question: string, eventType: any) => {
      setCurrentQuestion(question);
      setCurrentEventType(eventType);
      setPhase('analyzing');
      setError(null);
      setGeneralAdvice('');

      const result = await submitPrediction(question, eventType);

      if (result) {
        setResults(result.periods);
        setGeneralAdvice(result.generalAdvice);
        setPhase('result');
      } else {
        setPhase('input');
      }
    },
    [
      setCurrentQuestion,
      setCurrentEventType,
      setPhase,
      setError,
      setGeneralAdvice,
      submitPrediction,
      setResults,
    ]
  );

  // Get birth info for display
  const birthDate = userProfile?.birthDate || guestBirthInfo?.birthDate;
  const gender = userProfile?.gender || guestBirthInfo?.gender;

  // Handle start prediction from tabs
  const handleStartPrediction = () => {
    setShowTabs(false);
  };

  // Handle ask again - reset to tabs
  const handleAskAgainWithTabs = () => {
    handleAskAgain();
    setShowTabs(true);
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.backgroundCanvas} />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>{locale === 'ko' ? '로딩 중...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.backgroundCanvas} />
      <BackButton />

      <main className={styles.main}>
        {/* Credit badge */}
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>

        <AnimatePresence mode="wait">
          {/* Tabs View */}
          {showTabs && (
            <LifePredictionTabs onStartPrediction={handleStartPrediction} />
          )}

          {/* Phase 1: Birth input */}
          {!showTabs && phase === 'birth-input' && (
            <BirthInputPhase
              locale={locale as 'ko' | 'en'}
              status={status}
              signInUrl={signInUrl}
              onSubmit={onBirthInfoSubmit}
            />
          )}

          {/* Phase 2: Question input */}
          {!showTabs && phase === 'input' && (
            <QuestionInputPhase
              birthDate={birthDate}
              gender={gender}
              locale={locale}
              error={error}
              onChangeBirthInfo={handleChangeBirthInfo}
              onSubmit={onPredictionSubmit}
            />
          )}

          {/* Phase 3: Analyzing */}
          {!showTabs && phase === 'analyzing' && (
            <AnalyzingPhase eventType={currentEventType} />
          )}

          {/* Phase 4: Results */}
          {!showTabs && phase === 'result' && (
            <ResultsPhase
              birthDate={birthDate}
              gender={gender}
              currentQuestion={currentQuestion}
              currentEventType={currentEventType}
              results={results}
              locale={locale as 'ko' | 'en'}
              isAuthenticated={status === 'authenticated'}
              onChangeBirthInfo={handleChangeBirthInfo}
              onSubmit={onPredictionSubmit}
              onAskAgain={handleAskAgainWithTabs}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
