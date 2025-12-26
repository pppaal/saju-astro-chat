'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, SessionProvider } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nProvider';
import BackButton from '@/components/ui/BackButton';
import CreditBadge from '@/components/ui/CreditBadge';
import { apiFetch } from '@/lib/api';
import styles from './Dream.module.css';

type Phase = 'birth-input' | 'dream-input' | 'analyzing' | 'result';

interface UserProfile {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  gender?: 'M' | 'F';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface GuestBirthInfo {
  birthDate: string;
  birthTime: string;
  gender: 'M' | 'F';
}

interface InsightResponse {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  culturalNotes?: {
    korean?: string;
    western?: string;
    chinese?: string;
    islamic?: string;
  };
  luckyElements?: {
    luckyNumbers?: number[];
    luckyColors?: string[];
    advice?: string;
  };
  celestial?: {
    moon_phase?: {
      name?: string;
      korean?: string;
      emoji?: string;
      dream_meaning?: string;
    };
  };
  cosmicInfluence?: {
    moonPhaseEffect?: string;
    planetaryInfluence?: string;
    overallEnergy?: string;
  };
  premium_features?: {
    taemong?: {
      is_taemong?: boolean;
      primary_symbol?: {
        symbol?: string;
        child_trait?: string;
        gender_hint?: string;
        interpretation?: string;
      };
    };
    combinations?: {
      combination?: string;
      meaning?: string;
      interpretation?: string;
      is_lucky?: boolean;
    }[];
  };
}

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export default function DreamPage() {
  return (
    <SessionProvider>
      <DreamContent />
    </SessionProvider>
  );
}

function DreamContent() {
  const { t, locale } = useI18n();
  const { status } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const [phase, setPhase] = useState<Phase>('birth-input');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestBirthInfo, setGuestBirthInfo] = useState<GuestBirthInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Birth form state
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('12:00');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [showTimeInput, setShowTimeInput] = useState(false);

  // Dream input state
  const [dreamText, setDreamText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (status === 'loading') return;

      if (status !== 'authenticated') {
        setProfileLoading(false);
        setPhase('birth-input');
        return;
      }

      setProfileLoading(true);
      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store' });
        if (res.ok) {
          const { user } = await res.json();
          if (user?.birthDate) {
            setUserProfile({
              name: user.name,
              birthDate: user.birthDate,
              birthTime: user.birthTime,
              birthCity: user.birthCity,
              gender: user.gender,
              latitude: user.latitude,
              longitude: user.longitude,
              timezone: user.tzId,
            });
            setPhase('dream-input');
          } else {
            setPhase('birth-input');
          }
        } else {
          setPhase('birth-input');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setPhase('birth-input');
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [status]);

  // Handle birth info submit
  const handleBirthInfoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) return;

    const birthInfo: GuestBirthInfo = {
      birthDate,
      birthTime: showTimeInput ? birthTime : '12:00',
      gender,
    };

    if (status === 'authenticated') {
      try {
        const res = await fetch('/api/user/update-birth-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(birthInfo),
        });

        if (res.ok) {
          setUserProfile({
            birthDate: birthInfo.birthDate,
            birthTime: birthInfo.birthTime,
            gender: birthInfo.gender,
          });
        }
      } catch (err) {
        console.error('Failed to save birth info:', err);
      }
    } else {
      setGuestBirthInfo(birthInfo);
    }

    setPhase('dream-input');
  }, [birthDate, birthTime, gender, showTimeInput, status]);

  // Load profile button handler
  const handleLoadProfile = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (res.ok) {
        const { user } = await res.json();
        if (user?.birthDate) {
          setBirthDate(user.birthDate);
          if (user.birthTime) {
            setBirthTime(user.birthTime);
            setShowTimeInput(true);
          }
          if (user.gender) {
            setGender(user.gender);
          }
          setUserProfile({
            birthDate: user.birthDate,
            birthTime: user.birthTime,
            gender: user.gender,
            latitude: user.latitude,
            longitude: user.longitude,
            timezone: user.tzId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [status]);

  // Background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.002;

      // Deep blue/indigo gradient for dream theme
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 8, 24, 1)');
      gradient.addColorStop(0.5, 'rgba(20, 15, 45, 1)');
      gradient.addColorStop(1, 'rgba(8, 12, 30, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars with cyan/pink dream colors
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * canvas.height;
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1;
        const hue = 180 + Math.sin(time + i) * 30; // Cyan to pink range

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${opacity})`;
        ctx.fill();
      }

      // Moon glow effect
      const moonX = canvas.width * 0.8;
      const moonY = canvas.height * 0.2;
      const moonRadius = 60 + Math.sin(time) * 10;

      const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 2);
      moonGradient.addColorStop(0, 'rgba(168, 237, 234, 0.15)');
      moonGradient.addColorStop(0.5, 'rgba(168, 237, 234, 0.05)');
      moonGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = moonGradient;
      ctx.fill();

      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Dream analysis submit
  const handleDreamSubmit = useCallback(async () => {
    if (!dreamText.trim() || dreamText.trim().length < 10) {
      setError(locale === 'ko' ? '꿈 내용을 최소 10자 이상 입력해주세요.' : 'Please describe your dream in at least 10 characters.');
      return;
    }

    const birthInfo = userProfile?.birthDate
      ? {
          birthDate: userProfile.birthDate,
          birthTime: userProfile.birthTime || '12:00',
          gender: userProfile.gender || 'M' as 'M' | 'F',
          latitude: userProfile.latitude ?? 37.5665,
          longitude: userProfile.longitude ?? 126.978,
          timezone: userProfile.timezone ?? 'Asia/Seoul',
        }
      : guestBirthInfo ? {
          ...guestBirthInfo,
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        }
      : null;

    if (!birthInfo?.birthDate) {
      setError(locale === 'ko' ? '생년월일 정보가 필요합니다.' : 'Birth information is required.');
      setPhase('birth-input');
      return;
    }

    setPhase('analyzing');
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dream: dreamText.trim(),
          locale,
          birth: {
            date: birthInfo.birthDate,
            time: birthInfo.birthTime || '12:00',
            latitude: birthInfo.latitude || 37.5665,
            longitude: birthInfo.longitude || 126.978,
            timeZone: birthInfo.timezone || 'Asia/Seoul',
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze dream');
      }

      const data = await res.json();
      setResult(data);
      setPhase('result');
    } catch (err) {
      console.error('Dream analysis failed:', err);
      setError(locale === 'ko' ? '분석 중 오류가 발생했습니다. 다시 시도해주세요.' : 'An error occurred. Please try again.');
      setPhase('dream-input');
    } finally {
      setIsLoading(false);
    }
  }, [dreamText, userProfile, guestBirthInfo, locale]);

  // Reset handler
  const handleReset = useCallback(() => {
    setDreamText('');
    setResult(null);
    setError(null);
    setPhase('dream-input');
  }, []);

  // Change birth info
  const handleChangeBirthInfo = useCallback(() => {
    setGuestBirthInfo(null);
    setPhase('birth-input');
  }, []);

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
        <div className={styles.creditBadgeWrapper}>
          <CreditBadge variant="compact" />
        </div>

        <AnimatePresence mode="wait">
          {/* Birth Input Phase */}
          {phase === 'birth-input' && (
            <motion.div
              key="birth-input"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              <div className={styles.pageHeader}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>🌙</span>
                </div>
                <h1 className={styles.pageTitle}>
                  {locale === 'ko' ? '꿈 해몽' : 'Dream Interpretation'}
                </h1>
                <p className={styles.pageSubtitle}>
                  {locale === 'ko'
                    ? '당신의 꿈에 담긴 메시지를 해석해드립니다'
                    : 'Discover the hidden messages in your dreams'}
                </p>
              </div>

              <div className={styles.birthFormCard}>
                <div className={styles.formHeader}>
                  <span className={styles.formIcon}>🎂</span>
                  <h3 className={styles.formTitle}>
                    {locale === 'ko' ? '생년월일을 입력해주세요' : 'Enter Your Birth Info'}
                  </h3>
                  <p className={styles.formSubtitle}>
                    {locale === 'ko'
                      ? '정확한 해석을 위해 필요한 정보입니다'
                      : 'Required for accurate interpretation'}
                  </p>
                </div>

                {/* Load Profile Button */}
                {status === 'authenticated' && (
                  <button
                    type="button"
                    className={styles.loadProfileButton}
                    onClick={handleLoadProfile}
                  >
                    <span className={styles.loadProfileIcon}>👤</span>
                    <span>{locale === 'ko' ? '내 프로필 불러오기' : 'Load My Profile'}</span>
                    <span className={styles.loadProfileArrow}>→</span>
                  </button>
                )}

                <form onSubmit={handleBirthInfoSubmit} className={styles.form}>
                  {/* Birth Date */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {locale === 'ko' ? '생년월일' : 'Birth Date'}
                      <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className={styles.input}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      min="1900-01-01"
                    />
                  </div>

                  {/* Gender */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {locale === 'ko' ? '성별' : 'Gender'}
                      <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.genderButtons}>
                      <button
                        type="button"
                        className={`${styles.genderBtn} ${gender === 'M' ? styles.active : ''}`}
                        onClick={() => setGender('M')}
                      >
                        <span>👨</span>
                        <span>{locale === 'ko' ? '남성' : 'Male'}</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.genderBtn} ${gender === 'F' ? styles.active : ''}`}
                        onClick={() => setGender('F')}
                      >
                        <span>👩</span>
                        <span>{locale === 'ko' ? '여성' : 'Female'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Birth Time Toggle */}
                  <div className={styles.fieldGroup}>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => setShowTimeInput(!showTimeInput)}
                    >
                      <span className={styles.toggleIcon}>{showTimeInput ? '▼' : '▶'}</span>
                      <span>{locale === 'ko' ? '태어난 시간 입력 (선택)' : 'Birth Time (Optional)'}</span>
                    </button>

                    {showTimeInput && (
                      <div className={styles.timeInputWrapper}>
                        <input
                          type="time"
                          value={birthTime}
                          onChange={(e) => setBirthTime(e.target.value)}
                          className={styles.input}
                        />
                        <p className={styles.timeHint}>
                          {locale === 'ko'
                            ? '모르시면 12:00(정오)로 자동 설정됩니다'
                            : 'Defaults to 12:00 PM if unknown'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!birthDate}
                  >
                    <span>✨</span>
                    <span>{locale === 'ko' ? '다음으로' : 'Continue'}</span>
                  </button>
                </form>

                {status === 'unauthenticated' && (
                  <div className={styles.loginHint}>
                    <p>
                      {locale === 'ko'
                        ? '로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요'
                        : 'Log in to save your info for a better experience'}
                    </p>
                    <a href="/auth/signin" className={styles.loginLink}>
                      {locale === 'ko' ? '로그인하기' : 'Log in'}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Dream Input Phase */}
          {phase === 'dream-input' && (
            <motion.div
              key="dream-input"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              <div className={styles.pageHeader}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>🌙</span>
                </div>
                <h1 className={styles.pageTitle}>
                  {locale === 'ko' ? '꿈 해몽' : 'Dream Interpretation'}
                </h1>
                <p className={styles.pageSubtitle}>
                  {locale === 'ko'
                    ? '어젯밤 꾼 꿈을 알려주세요'
                    : 'Tell us about your dream'}
                </p>
              </div>

              {/* Birth Info Display */}
              {(userProfile?.birthDate || guestBirthInfo?.birthDate) && (
                <div className={styles.birthInfoDisplay}>
                  <span className={styles.birthInfoIcon}>🎂</span>
                  <span className={styles.birthInfoText}>
                    {userProfile?.birthDate || guestBirthInfo?.birthDate}
                    {(userProfile?.gender || guestBirthInfo?.gender) === 'M' ? ' 👨' : ' 👩'}
                  </span>
                  {!userProfile?.birthDate && (
                    <button className={styles.changeBirthBtn} onClick={handleChangeBirthInfo}>
                      {locale === 'ko' ? '변경' : 'Change'}
                    </button>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className={styles.errorNotice}>
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {/* Dream Input Card */}
              <div className={styles.dreamInputCard}>
                <div className={styles.dreamInputHeader}>
                  <span className={styles.dreamInputIcon}>✍️</span>
                  <div>
                    <h3 className={styles.dreamInputTitle}>
                      {locale === 'ko' ? '꿈 내용을 적어주세요' : 'Describe Your Dream'}
                    </h3>
                    <p className={styles.dreamInputHint}>
                      {locale === 'ko'
                        ? '자세할수록 더 정확한 해석이 가능합니다'
                        : 'More details lead to better interpretation'}
                    </p>
                  </div>
                </div>

                <div className={styles.textareaWrapper}>
                  <textarea
                    className={styles.dreamTextarea}
                    value={dreamText}
                    onChange={(e) => setDreamText(e.target.value)}
                    placeholder={locale === 'ko'
                      ? '예: 높은 곳에서 떨어지는 꿈을 꿨어요. 처음엔 무서웠는데 나중엔 하늘을 날고 있었어요...'
                      : 'Example: I dreamed of falling from a high place. It was scary at first, but then I was flying...'}
                    rows={6}
                  />
                  <div className={styles.textareaGlow}></div>
                </div>

                <button
                  type="button"
                  className={styles.analyzeButton}
                  onClick={handleDreamSubmit}
                  disabled={!dreamText.trim() || dreamText.trim().length < 10 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className={styles.buttonSpinner} />
                      <span>{locale === 'ko' ? '분석 중...' : 'Analyzing...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🔮</span>
                      <span>{locale === 'ko' ? 'AI 해석 받기' : 'Get AI Interpretation'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Tips */}
              <div className={styles.quickTips}>
                <h4>{locale === 'ko' ? '💡 작성 팁' : '💡 Writing Tips'}</h4>
                <ul>
                  <li>{locale === 'ko' ? '등장인물이나 장소를 구체적으로' : 'Be specific about people and places'}</li>
                  <li>{locale === 'ko' ? '느꼈던 감정도 함께 적어주세요' : 'Include emotions you felt'}</li>
                  <li>{locale === 'ko' ? '반복되는 꿈이면 그것도 알려주세요' : 'Mention if it\'s a recurring dream'}</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Analyzing Phase */}
          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.phaseContainer}
            >
              <div className={styles.analyzingContainer}>
                <div className={styles.analyzingOrb}>
                  <span className={styles.analyzingIcon}>🌙</span>
                  <div className={styles.orbRing}></div>
                  <div className={styles.orbRing2}></div>
                </div>
                <h2 className={styles.analyzingTitle}>
                  {locale === 'ko' ? '꿈을 해석하고 있어요' : 'Interpreting Your Dream'}
                </h2>
                <p className={styles.analyzingText}>
                  {locale === 'ko'
                    ? '사주와 점성술을 기반으로 분석 중입니다...'
                    : 'Analyzing based on your birth chart...'}
                </p>
                <div className={styles.analyzingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Phase */}
          {phase === 'result' && result && (
            <motion.div
              key="result"
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`${styles.phaseContainer} ${styles.resultPhase}`}
            >
              <button onClick={handleReset} className={styles.resetButton}>
                <span className={styles.resetArrow}>←</span>
                {locale === 'ko' ? '새로운 꿈 해석' : 'New Dream'}
              </button>

              <div className={styles.resultHeader}>
                <div className={styles.resultIconWrapper}>
                  <span className={styles.resultIcon}>🌙</span>
                  <div className={styles.resultIconRing}></div>
                </div>
                <h1 className={styles.resultMainTitle}>
                  {locale === 'ko' ? '꿈 해석 결과' : 'Dream Interpretation'}
                </h1>
                <p className={styles.resultSubtitle}>
                  {locale === 'ko' ? '당신의 꿈이 전하는 메시지입니다' : 'Messages from your dream'}
                </p>
              </div>

              <div className={styles.resultLayout}>
                {/* Top Section - Chat & Summary */}
                <div className={styles.resultTopSection}>
                  {/* Summary Card - Full Width */}
                  {result.summary && (
                    <div className={styles.summaryCard}>
                      <div className={styles.resultTitle}>📖 {locale === 'ko' ? '종합 해석' : 'Summary'}</div>
                      <div className={styles.resultText}>{result.summary}</div>
                    </div>
                  )}

                  {/* Dream Counselor Chat */}
                  <div className={styles.chatContainer}>
                    <div className={styles.chatHeader}>
                      <span className={styles.chatHeaderIcon}>🌙</span>
                      <div>
                        <h3 className={styles.chatHeaderTitle}>
                          {locale === 'ko' ? '꿈 상담사' : 'Dream Counselor'}
                        </h3>
                        <p className={styles.chatHeaderSubtitle}>
                          {locale === 'ko' ? '꿈에 대해 더 깊이 이야기해보세요' : 'Let\'s explore your dream deeper'}
                        </p>
                      </div>
                    </div>
                    <div className={styles.chatMessages}>
                      <div className={styles.chatMessage}>
                        <div className={styles.chatAvatar}>🌙</div>
                        <div className={styles.chatBubble}>
                          {locale === 'ko'
                            ? `꿈 해석 결과를 보셨군요. "${dreamText.slice(0, 30)}..." 꿈에 대해 더 궁금한 점이 있으시면 편하게 물어보세요.`
                            : `I see you've received your dream interpretation. Feel free to ask me anything about your dream "${dreamText.slice(0, 30)}..."`
                          }
                        </div>
                      </div>
                    </div>
                    <div className={styles.chatInputArea}>
                      <input
                        type="text"
                        className={styles.chatInput}
                        placeholder={locale === 'ko' ? '꿈에 대해 질문하세요...' : 'Ask about your dream...'}
                        disabled
                      />
                      <button className={styles.chatSendBtn} disabled>
                        {locale === 'ko' ? '전송' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Analysis Cards Grid */}
                <div className={styles.resultBottomSection}>
                  <div className={styles.analysisCardsGrid}>
                    {/* Dream Symbols */}
                    {result.dreamSymbols && result.dreamSymbols.length > 0 && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🔮 {locale === 'ko' ? '꿈의 상징' : 'Dream Symbols'}</div>
                        <ul className={styles.resultList}>
                          {result.dreamSymbols.map((sym, i) => (
                            <li key={i}><strong>{sym.label}:</strong> {sym.meaning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cross Insights */}
                    {result.crossInsights && result.crossInsights.length > 0 && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>💡 {locale === 'ko' ? '통합 분석' : 'Cross Insights'}</div>
                        <ul className={styles.resultList}>
                          {result.crossInsights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🌟 {locale === 'ko' ? '조언' : 'Advice'}</div>
                        <ol className={styles.resultListOrdered}>
                          {result.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Themes */}
                    {result.themes && result.themes.length > 0 && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🎭 {locale === 'ko' ? '주요 테마' : 'Themes'}</div>
                        {result.themes.map((theme, i) => (
                          <div key={i} className={styles.themeBar}>
                            <div className={styles.themeLabel}>
                              <span>{theme.label}</span>
                              <span className={styles.themePercent}>{Math.round(theme.weight * 100)}%</span>
                            </div>
                            <div className={styles.themeBarContainer}>
                              <div className={styles.themeBarFill} style={{ width: `${theme.weight * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lucky Elements */}
                    {result.luckyElements && (result.luckyElements.luckyNumbers?.length || result.luckyElements.luckyColors?.length) && (
                      <div className={`${styles.resultCard} ${styles.luckyCard}`}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🍀 {locale === 'ko' ? '행운의 요소' : 'Lucky Elements'}</div>
                        <div className={styles.luckyContent}>
                          {result.luckyElements.luckyNumbers && result.luckyElements.luckyNumbers.length > 0 && (
                            <div className={styles.luckyNumbers}>
                              <strong>{locale === 'ko' ? '행운의 숫자' : 'Lucky Numbers'}:</strong>
                              <div className={styles.numberBalls}>
                                {result.luckyElements.luckyNumbers.map((num, i) => (
                                  <span key={i} className={styles.numberBall}>{num}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.luckyElements.luckyColors && result.luckyElements.luckyColors.length > 0 && (
                            <div className={styles.luckyColors}>
                              <strong>{locale === 'ko' ? '행운의 색상' : 'Lucky Colors'}:</strong>
                              <div className={styles.colorTags}>
                                {result.luckyElements.luckyColors.map((color, i) => (
                                  <span key={i} className={styles.colorTag}>{color}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {result.luckyElements.advice && (
                            <div className={styles.luckyAdvice}>
                              <p>{result.luckyElements.advice}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Moon Phase */}
                    {result.celestial?.moon_phase && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>
                          {result.celestial.moon_phase.emoji || '🌕'} {locale === 'ko' ? '달의 위상' : 'Moon Phase'}
                        </div>
                        <div className={styles.moonPhaseContent}>
                          <p className={styles.moonPhaseName}>
                            {result.celestial.moon_phase.korean || result.celestial.moon_phase.name}
                          </p>
                          {result.celestial.moon_phase.dream_meaning && (
                            <p className={styles.resultText}>{result.celestial.moon_phase.dream_meaning}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cultural Notes - 문화별 해몽 */}
                    {result.culturalNotes && (result.culturalNotes.korean || result.culturalNotes.western || result.culturalNotes.chinese) && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🌏 {locale === 'ko' ? '문화별 해몽' : 'Cultural Interpretations'}</div>
                        <div className={styles.culturalNotes}>
                          {result.culturalNotes.korean && (
                            <div className={styles.culturalNote}>
                              <strong>🇰🇷 {locale === 'ko' ? '한국 전통' : 'Korean'}:</strong>
                              <p>{result.culturalNotes.korean}</p>
                            </div>
                          )}
                          {result.culturalNotes.western && (
                            <div className={styles.culturalNote}>
                              <strong>🧠 {locale === 'ko' ? '서양/융 심리학' : 'Western/Jungian'}:</strong>
                              <p>{result.culturalNotes.western}</p>
                            </div>
                          )}
                          {result.culturalNotes.chinese && (
                            <div className={styles.culturalNote}>
                              <strong>🇨🇳 {locale === 'ko' ? '중국 해몽' : 'Chinese'}:</strong>
                              <p>{result.culturalNotes.chinese}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Taemong - 태몽 분석 */}
                    {result.premium_features?.taemong?.is_taemong && result.premium_features.taemong.primary_symbol && (
                      <div className={`${styles.resultCard} ${styles.taemongCard}`}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>👶 {locale === 'ko' ? '태몽 분석' : 'Conception Dream'}</div>
                        <div className={styles.taemongContent}>
                          <div className={styles.taemongSymbol}>
                            <strong>{locale === 'ko' ? '상징' : 'Symbol'}:</strong> {result.premium_features.taemong.primary_symbol.symbol}
                          </div>
                          {result.premium_features.taemong.primary_symbol.child_trait && (
                            <div className={styles.taemongTrait}>
                              <strong>{locale === 'ko' ? '아이 특성' : 'Child Trait'}:</strong> {result.premium_features.taemong.primary_symbol.child_trait}
                            </div>
                          )}
                          {result.premium_features.taemong.primary_symbol.gender_hint && (
                            <div className={styles.taemongGender}>
                              <strong>{locale === 'ko' ? '성별 힌트' : 'Gender Hint'}:</strong> {result.premium_features.taemong.primary_symbol.gender_hint}
                            </div>
                          )}
                          {result.premium_features.taemong.primary_symbol.interpretation && (
                            <p className={styles.resultText}>{result.premium_features.taemong.primary_symbol.interpretation}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Symbol Combinations - 심볼 조합 */}
                    {result.premium_features?.combinations && result.premium_features.combinations.length > 0 && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>🔗 {locale === 'ko' ? '심볼 조합 분석' : 'Symbol Combinations'}</div>
                        <ul className={styles.resultList}>
                          {result.premium_features.combinations.map((combo, i) => (
                            <li key={i}>
                              <strong>{combo.combination}:</strong> {combo.interpretation || combo.meaning}
                              {combo.is_lucky && <span className={styles.luckyBadge}>🍀</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cosmic Influence - 우주적 영향 */}
                    {result.cosmicInfluence && (result.cosmicInfluence.moonPhaseEffect || result.cosmicInfluence.planetaryInfluence) && (
                      <div className={styles.resultCard}>
                        <div className={styles.resultCardGlow}></div>
                        <div className={styles.resultTitle}>✨ {locale === 'ko' ? '우주적 영향' : 'Cosmic Influence'}</div>
                        <div className={styles.cosmicContent}>
                          {result.cosmicInfluence.moonPhaseEffect && (
                            <div className={styles.cosmicItem}>
                              <strong>🌙 {locale === 'ko' ? '달의 영향' : 'Moon Effect'}:</strong>
                              <p>{result.cosmicInfluence.moonPhaseEffect}</p>
                            </div>
                          )}
                          {result.cosmicInfluence.planetaryInfluence && (
                            <div className={styles.cosmicItem}>
                              <strong>🪐 {locale === 'ko' ? '행성 영향' : 'Planetary Effect'}:</strong>
                              <p>{result.cosmicInfluence.planetaryInfluence}</p>
                            </div>
                          )}
                          {result.cosmicInfluence.overallEnergy && (
                            <div className={styles.cosmicItem}>
                              <strong>⚡ {locale === 'ko' ? '종합 에너지' : 'Overall Energy'}:</strong>
                              <p>{result.cosmicInfluence.overallEnergy}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ask Again Button */}
              <button className={styles.askAgainBtn} onClick={handleReset}>
                <span>🌙</span>
                <span>{locale === 'ko' ? '다른 꿈 해석하기' : 'Interpret Another Dream'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
