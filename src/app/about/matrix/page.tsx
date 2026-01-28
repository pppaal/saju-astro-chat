'use client';

import styles from './matrix.module.css';
import { useMatrixJourney } from './useMatrixJourney';
import { IntroScreen, InputScreen, LoadingScreen, ResultScreen } from './components';

export default function MatrixJourneyPage() {
  const {
    step,
    setStep,
    birthDate,
    setBirthDate,
    birthTime,
    setBirthTime,
    dayMaster,
    setDayMaster,
    geokguk,
    setGeokguk,
    result,
    activeIndex,
    isFlipped,
    setIsFlipped,
    revealedLayers,
    totalCells,
    activeLayer,
    insight,
    handleSubmit,
    goToLayer,
    handleTouchStart,
    handleTouchEnd,
  } = useMatrixJourney();

  if (step === 'intro') {
    return <IntroScreen styles={styles} onStart={() => setStep('input')} />;
  }

  if (step === 'input') {
    return (
      <InputScreen
        styles={styles}
        birthDate={birthDate}
        setBirthDate={setBirthDate}
        birthTime={birthTime}
        setBirthTime={setBirthTime}
        dayMaster={dayMaster}
        setDayMaster={setDayMaster}
        geokguk={geokguk}
        setGeokguk={setGeokguk}
        onBack={() => setStep('intro')}
        onSubmit={handleSubmit}
      />
    );
  }

  if (step === 'loading') {
    return <LoadingScreen styles={styles} />;
  }

  return (
    <ResultScreen
      styles={styles}
      result={result}
      activeIndex={activeIndex}
      activeLayer={activeLayer}
      isFlipped={isFlipped}
      setIsFlipped={setIsFlipped}
      revealedLayers={revealedLayers}
      insight={insight}
      totalCells={totalCells}
      goToLayer={goToLayer}
      handleTouchStart={handleTouchStart}
      handleTouchEnd={handleTouchEnd}
      onBack={() => setStep('intro')}
    />
  );
}
