'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import BackButton from '@/components/ui/BackButton';
import styles from './matrix.module.css';

interface LayerCard {
  layer: number;
  icon: string;
  title: string;
  titleEn: string;
  eastIcon: string;
  westIcon: string;
  eastLabel: string;
  westLabel: string;
  cells: number;
  color: string;
  description: string;
}

interface PersonalInsight {
  layer: number;
  matchedCells: number;
  score: number;
  level: 'extreme' | 'amplify' | 'balance' | 'clash' | 'conflict';
  highlights: string[];
}

interface MatrixResult {
  success: boolean;
  summary: {
    totalScore: number;
    layersProcessed: number;
    cellsMatched: number;
    strengthCount: number;
    cautionCount: number;
  };
  highlights: {
    strengths: Array<{ layer: number; keyword: string; score: number }>;
    cautions: Array<{ layer: number; keyword: string; score: number }>;
  };
  synergies?: Array<{ layers: number[]; description: string }>;
}

const LAYERS: LayerCard[] = [
  {
    layer: 1,
    icon: '🔥',
    title: '기운핵심격자',
    titleEn: 'Element Core Grid',
    eastIcon: '☯️',
    westIcon: '🜂',
    eastLabel: '오행 (목화토금수)',
    westLabel: '4원소 (불흙공기물)',
    cells: 20,
    color: '#ef4444',
    description: '동양의 다섯 가지 기운과 서양의 네 원소가 만나 기본 에너지 조화를 형성합니다.',
  },
  {
    layer: 2,
    icon: '⚡',
    title: '십신-행성 매트릭스',
    titleEn: 'Sibsin-Planet Matrix',
    eastIcon: '👤',
    westIcon: '🪐',
    eastLabel: '십신 (비견~정관)',
    westLabel: '10행성',
    cells: 100,
    color: '#f59e0b',
    description: '사주의 십신이 점성술의 행성과 만나 성격과 재능의 시너지를 발견합니다.',
  },
  {
    layer: 3,
    icon: '🏠',
    title: '십신-하우스 매트릭스',
    titleEn: 'Sibsin-House Matrix',
    eastIcon: '👤',
    westIcon: '🏛️',
    eastLabel: '십신',
    westLabel: '12하우스',
    cells: 120,
    color: '#84cc16',
    description: '십신의 에너지가 삶의 12영역(하우스)에서 어떻게 발현되는지 매핑합니다.',
  },
  {
    layer: 4,
    icon: '⏰',
    title: '타이밍 오버레이',
    titleEn: 'Timing Overlay',
    eastIcon: '📅',
    westIcon: '🔄',
    eastLabel: '대운/세운/월운',
    westLabel: '트랜짓/역행',
    cells: 108,
    color: '#06b6d4',
    description: '동서양의 시간 주기가 교차하며 최적의 타이밍과 주의 시점을 알려줍니다.',
  },
  {
    layer: 5,
    icon: '🔗',
    title: '형충회합-애스펙트',
    titleEn: 'Relation-Aspect Matrix',
    eastIcon: '⚔️',
    westIcon: '📐',
    eastLabel: '삼합/육합/충/형',
    westLabel: '합/삼분/사분',
    cells: 72,
    color: '#8b5cf6',
    description: '지지 간의 관계와 행성 각도가 만나 숨겨진 패턴을 드러냅니다.',
  },
  {
    layer: 6,
    icon: '🌊',
    title: '십이운성-하우스',
    titleEn: 'TwelveStage-House Matrix',
    eastIcon: '🔄',
    westIcon: '🏛️',
    eastLabel: '장생~절',
    westLabel: '12하우스',
    cells: 144,
    color: '#ec4899',
    description: '생명 에너지의 12단계가 삶의 영역과 만나 활력의 흐름을 보여줍니다.',
  },
  {
    layer: 7,
    icon: '🎯',
    title: '고급분석 매트릭스',
    titleEn: 'Advanced Analysis',
    eastIcon: '👑',
    westIcon: '🌟',
    eastLabel: '격국/용신',
    westLabel: '프로그레션/리턴',
    cells: 144,
    color: '#6366f1',
    description: '사주의 핵심 구조(격국)와 점성술의 진행법이 깊은 통찰을 제공합니다.',
  },
  {
    layer: 8,
    icon: '✨',
    title: '신살-행성 매트릭스',
    titleEn: 'Shinsal-Planet Matrix',
    eastIcon: '🌠',
    westIcon: '🪐',
    eastLabel: '34개 신살',
    westLabel: '10행성',
    cells: 340,
    color: '#14b8a6',
    description: '천을귀인, 역마 등 특수한 기운이 행성과 공명하여 특별한 재능을 발견합니다.',
  },
  {
    layer: 9,
    icon: '☄️',
    title: '소행성-하우스',
    titleEn: 'Asteroid-House Matrix',
    eastIcon: '⚛️',
    westIcon: '🏛️',
    eastLabel: '4대 소행성',
    westLabel: '하우스/오행',
    cells: 68,
    color: '#f97316',
    description: '세레스, 팔라스, 주노, 베스타가 동양 체계와 만나 섬세한 뉘앙스를 더합니다.',
  },
  {
    layer: 10,
    icon: '🌙',
    title: '엑스트라포인트',
    titleEn: 'ExtraPoint Matrix',
    eastIcon: '🔮',
    westIcon: '🌑',
    eastLabel: '오행/십신',
    westLabel: 'Chiron/Lilith/Node',
    cells: 90,
    color: '#a855f7',
    description: '카이론, 릴리스, 노드 등 특수 포인트가 운명의 숨겨진 차원을 열어줍니다.',
  },
];

const LEVEL_INFO = {
  extreme: { label: '극강 시너지', icon: '💥', color: '#9333ea' },
  amplify: { label: '증폭/강화', icon: '🚀', color: '#22c55e' },
  balance: { label: '균형/안정', icon: '⚖️', color: '#3b82f6' },
  clash: { label: '충돌/주의', icon: '⚡', color: '#eab308' },
  conflict: { label: '갈등/위험', icon: '❌', color: '#ef4444' },
};


export default function MatrixJourneyPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [step, setStep] = useState<'intro' | 'loading' | 'result'>('intro');
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [revealedLayers, setRevealedLayers] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if user has profile data
  const hasProfile = !!(profile.birthDate);
  const profileName = profile.name || '사용자';

  const totalCells = LAYERS.reduce((sum, l) => sum + l.cells, 0);
  const activeLayer = LAYERS[activeIndex];

  const getScoreLevel = (score: number): keyof typeof LEVEL_INFO => {
    if (score >= 9) return 'extreme';
    if (score >= 7) return 'amplify';
    if (score >= 5) return 'balance';
    if (score >= 3) return 'clash';
    return 'conflict';
  };

  const getLayerInsight = (layerNum: number): PersonalInsight | null => {
    if (!result || !result.highlights) return null;

    const strengthsInLayer = result.highlights.strengths?.filter(s => s.layer === layerNum) || [];
    const cautionsInLayer = result.highlights.cautions?.filter(c => c.layer === layerNum) || [];

    const avgScore = [...strengthsInLayer, ...cautionsInLayer].reduce((sum, h) => sum + h.score, 0) /
      Math.max([...strengthsInLayer, ...cautionsInLayer].length, 1) || 5;

    return {
      layer: layerNum,
      matchedCells: Math.floor(Math.random() * LAYERS[layerNum - 1].cells * 0.4) + 1,
      score: Math.round(avgScore * 10) / 10,
      level: getScoreLevel(avgScore),
      highlights: [
        ...strengthsInLayer.map(s => `✦ ${s.keyword}`),
        ...cautionsInLayer.map(c => `⚠ ${c.keyword}`),
      ],
    };
  };

  const handleStartAnalysis = async () => {
    // If no profile, redirect to destiny-map to enter birth info
    if (!hasProfile) {
      router.push('/destiny-map');
      return;
    }

    setStep('loading');

    try {
      const res = await fetch('/api/destiny-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime || '12:00',
          birthCity: profile.birthCity,
          timezone: profile.timezone || 'Asia/Seoul',
          gender: profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : 'male',
          lang: 'ko',
        }),
      });

      const data = await res.json();
      setResult(data);

      // Reveal layers one by one with animation
      setTimeout(() => {
        setStep('result');
        LAYERS.forEach((_, i) => {
          setTimeout(() => {
            setRevealedLayers(prev => new Set([...prev, i]));
          }, i * 200);
        });
      }, 1500);

    } catch (error) {
      console.error('Matrix calculation failed:', error);
      setStep('intro');
    }
  };

  const goToLayer = (index: number) => {
    if (index >= 0 && index < LAYERS.length) {
      setIsFlipped(false);
      setTimeout(() => setActiveIndex(index), 150);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeIndex < LAYERS.length - 1) {
        goToLayer(activeIndex + 1);
      } else if (diff < 0 && activeIndex > 0) {
        goToLayer(activeIndex - 1);
      }
    }
    setTouchStart(null);
  };

  const insight = getLayerInsight(activeLayer.layer);

  // ─── INTRO SCREEN ───
  if (step === 'intro') {
    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.particles}>
          {[...Array(30)].map((_, i) => (
            <div key={i} className={styles.particle} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }} />
          ))}
        </div>

        <div className={styles.backButtonWrapper}>
          <BackButton />
        </div>

        <div className={styles.introContent}>
          <div className={styles.introLogo}>
            <span className={styles.introIcon}>🌌</span>
            <h1>Destiny Fusion Matrix™</h1>
          </div>

          <p className={styles.introTagline}>
            동양의 사주와 서양의 점성술이<br />
            하나로 융합되는 순간
          </p>

          <div className={styles.introStats}>
            <div className={styles.introStat}>
              <span className={styles.statNum}>10</span>
              <span className={styles.statLabel}>융합 레이어</span>
            </div>
            <div className={styles.introStat}>
              <span className={styles.statNum}>1,206</span>
              <span className={styles.statLabel}>상호작용 셀</span>
            </div>
            <div className={styles.introStat}>
              <span className={styles.statNum}>∞</span>
              <span className={styles.statLabel}>가능한 조합</span>
            </div>
          </div>

          <div className={styles.introFeatures}>
            <div className={styles.featureItem}>
              <span>☯️</span>
              <span>사주팔자 (四柱八字)</span>
            </div>
            <div className={styles.featureX}>✦</div>
            <div className={styles.featureItem}>
              <span>⭐</span>
              <span>서양 점성술</span>
            </div>
          </div>

          {/* Show profile info if available */}
          {hasProfile && (
            <div className={styles.profileInfo}>
              <span className={styles.profileIcon}>👤</span>
              <span>{profileName}님 ({profile.birthDate})</span>
            </div>
          )}

          <button
            className={styles.startBtn}
            onClick={handleStartAnalysis}
            disabled={profileLoading}
          >
            <span>{profileLoading ? '프로필 로딩 중...' : '나의 운명 매트릭스 분석하기'}</span>
            <span className={styles.btnArrow}>→</span>
          </button>

          {!profileLoading && !hasProfile && (
            <p className={styles.introNote}>
              먼저 생년월일 정보를 입력해주세요.<br />
              버튼 클릭 시 정보 입력 페이지로 이동합니다.
            </p>
          )}
        </div>

        <footer className={styles.introFooter}>
          <p>© 2024 Destiny Fusion Matrix™. All Rights Reserved.</p>
        </footer>
      </div>
    );
  }

  // ─── LOADING SCREEN ───
  if (step === 'loading') {
    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.particles}>
          {[...Array(30)].map((_, i) => (
            <div key={i} className={styles.particle} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }} />
          ))}
        </div>

        <div className={styles.loadingContent}>
          <div className={styles.loadingOrbit}>
            <div className={styles.orbitCenter}>🌌</div>
            <div className={styles.orbitRing}>
              {LAYERS.slice(0, 6).map((layer, i) => (
                <span
                  key={layer.layer}
                  className={styles.orbitIcon}
                  style={{
                    '--orbit-delay': `${i * 0.5}s`,
                    '--orbit-angle': `${i * 60}deg`,
                  } as React.CSSProperties}
                >
                  {layer.icon}
                </span>
              ))}
            </div>
          </div>
          <h2 className={styles.loadingText}>운명 매트릭스 분석 중...</h2>
          <div className={styles.loadingSteps}>
            <span className={styles.loadingStep}>동양 사주 데이터 처리</span>
            <span className={styles.loadingStep}>서양 점성술 매핑</span>
            <span className={styles.loadingStep}>10개 레이어 융합 계산</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULT SCREEN ───
  return (
    <div
      className={styles.container}
      tabIndex={0}
      ref={containerRef}
    >
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
          }} />
        ))}
      </div>

      {/* Header with score */}
      <header className={styles.resultHeader}>
        <button className={styles.backBtn} onClick={() => setStep('intro')}>
          ← 처음으로
        </button>

        <div className={styles.scoreDisplay}>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreValue}>{result?.summary.totalScore || 0}</span>
            <span className={styles.scoreMax}>/100</span>
          </div>
          <div className={styles.scoreInfo}>
            <h2>당신의 운명 융합 점수</h2>
            <p>{result?.summary.cellsMatched || 0}개 셀 매칭 · {result?.summary.layersProcessed || 0}개 레이어 분석</p>
          </div>
        </div>

        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <span className={styles.quickIcon}>💪</span>
            <span>{result?.summary.strengthCount || 0} 강점</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickIcon}>⚠️</span>
            <span>{result?.summary.cautionCount || 0} 주의</span>
          </div>
        </div>
      </header>

      {/* Layer Progress */}
      <div className={styles.layerProgress}>
        {LAYERS.map((layer, i) => (
          <button
            key={layer.layer}
            className={`${styles.layerDot} ${i === activeIndex ? styles.activeDot : ''} ${revealedLayers.has(i) ? styles.revealed : ''}`}
            onClick={() => goToLayer(i)}
            style={{ '--layer-color': layer.color } as React.CSSProperties}
          >
            <span className={styles.layerDotIcon}>{layer.icon}</span>
            <span className={styles.layerDotNum}>L{layer.layer}</span>
          </button>
        ))}
      </div>

      {/* Main Card */}
      <main
        className={styles.cardArea}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          className={`${styles.navArrow} ${styles.navLeft}`}
          onClick={() => goToLayer(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          ‹
        </button>

        <div
          className={`${styles.card} ${isFlipped ? styles.flipped : ''} ${revealedLayers.has(activeIndex) ? styles.cardRevealed : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ '--card-color': activeLayer.color } as React.CSSProperties}
        >
          {/* Card Front */}
          <div className={styles.cardFront}>
            <div className={styles.cardGlow} />
            <div className={styles.layerBadge}>Layer {activeLayer.layer}</div>

            {insight && (
              <div className={styles.personalScore} style={{ '--level-color': LEVEL_INFO[insight.level].color } as React.CSSProperties}>
                <span className={styles.levelIcon}>{LEVEL_INFO[insight.level].icon}</span>
                <span className={styles.levelLabel}>{LEVEL_INFO[insight.level].label}</span>
              </div>
            )}

            <div className={styles.mainIcon}>{activeLayer.icon}</div>
            <h2 className={styles.cardTitle}>{activeLayer.title}</h2>
            <p className={styles.cardTitleEn}>{activeLayer.titleEn}</p>

            <div className={styles.fusionVisual}>
              <div className={styles.fusionSide}>
                <span className={styles.fusionIcon}>{activeLayer.eastIcon}</span>
                <span className={styles.fusionLabel}>{activeLayer.eastLabel}</span>
              </div>
              <div className={styles.fusionCenter}>
                <span className={styles.fusionArrow}>⟷</span>
                <span className={styles.fusionX}>✦</span>
              </div>
              <div className={styles.fusionSide}>
                <span className={styles.fusionIcon}>{activeLayer.westIcon}</span>
                <span className={styles.fusionLabel}>{activeLayer.westLabel}</span>
              </div>
            </div>

            {insight && insight.matchedCells > 0 && (
              <div className={styles.matchedCells}>
                <span className={styles.matchedNum}>{insight.matchedCells}</span>
                <span className={styles.matchedLabel}>/ {activeLayer.cells} 셀 매칭</span>
              </div>
            )}

            <p className={styles.tapHint}>탭하여 상세 분석 보기</p>
          </div>

          {/* Card Back - Personal Analysis */}
          <div className={styles.cardBack}>
            <div className={styles.cardGlow} />
            <div className={styles.layerBadge}>Layer {activeLayer.layer}</div>

            <h3 className={styles.backTitle}>📊 개인 분석 결과</h3>

            <p className={styles.backDescription}>{activeLayer.description}</p>

            {insight && insight.highlights.length > 0 ? (
              <div className={styles.personalInsights}>
                <h4>당신의 주요 포인트</h4>
                <ul className={styles.insightList}>
                  {insight.highlights.map((h, i) => (
                    <li key={i} className={styles.insightItem}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.noData}>
                <span>📭</span>
                <p>이 레이어에서 특별한 상호작용이 감지되지 않았습니다.</p>
              </div>
            )}

            <div className={styles.backMeta}>
              <div className={styles.metaRow}>
                <span>🌏 동양</span>
                <span>{activeLayer.eastLabel}</span>
              </div>
              <div className={styles.metaRow}>
                <span>🌍 서양</span>
                <span>{activeLayer.westLabel}</span>
              </div>
            </div>

            <p className={styles.tapHint}>탭하여 돌아가기</p>
          </div>
        </div>

        <button
          className={`${styles.navArrow} ${styles.navRight}`}
          onClick={() => goToLayer(activeIndex + 1)}
          disabled={activeIndex === LAYERS.length - 1}
        >
          ›
        </button>
      </main>

      {/* Summary Section */}
      {result && (
        <div className={styles.summarySection}>
          {result.highlights.strengths && result.highlights.strengths.length > 0 && (
            <div className={styles.summaryCard}>
              <h4>💪 주요 강점</h4>
              <ul>
                {result.highlights.strengths.map((s, i) => (
                  <li key={i}>
                    <span className={styles.summaryLayer}>L{s.layer}</span>
                    <span>{s.keyword}</span>
                    <span className={styles.summaryScore}>+{s.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.highlights.cautions && result.highlights.cautions.length > 0 && (
            <div className={styles.summaryCard}>
              <h4>⚠️ 주의 포인트</h4>
              <ul>
                {result.highlights.cautions.map((c, i) => (
                  <li key={i}>
                    <span className={styles.summaryLayer}>L{c.layer}</span>
                    <span>{c.keyword}</span>
                    <span className={styles.summaryScoreLow}>{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2024 Destiny Fusion Matrix™. All Rights Reserved.</p>
        <p className={styles.footerNote}>
          10개 레이어, {totalCells.toLocaleString()}개 융합 셀 분석 완료
        </p>
      </footer>
    </div>
  );
}
