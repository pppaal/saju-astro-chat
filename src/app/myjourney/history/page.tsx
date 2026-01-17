"use client";

import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./history.module.css";
import { logger } from "@/lib/logger";

// Modularized imports
import type {
  ServiceRecord,
  DailyHistory,
  DestinyMapContent,
  IChingContent,
  CalendarContent,
  TarotContent,
  NumerologyContent,
} from './lib';
import {
  SERVICE_CONFIG,
  INITIAL_DISPLAY_COUNT,
  ALL_SERVICES_ORDER,
  formatDate,
  formatServiceName,
  getGradeEmoji,
  getGradeLabel,
  getThemeDisplayName,
  getCategoryDisplay,
} from './lib';


export default function HistoryPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}

function HistoryContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ichingDetail, setIchingDetail] = useState<IChingContent | null>(null);
  const [destinyMapDetail, setDestinyMapDetail] = useState<DestinyMapContent | null>(null);
  const [calendarDetail, setCalendarDetail] = useState<CalendarContent | null>(null);
  const [numerologyDetail, setNumerologyDetail] = useState<NumerologyContent | null>(null);
  const [tarotDetail, setTarotDetail] = useState<TarotContent | null>(null);
  const [showAllRecords, setShowAllRecords] = useState(false);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationId: number | null = null;
    let isRunning = false;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;
    let particleCount = 50;
    let maxLinkDistance = 100;
    let particleBaseSpeed = 0.2;

    type Particle = {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
    };

    let particlesArray: Particle[] = [];

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: 150,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const updateSettings = () => {
      const width = canvas.width;
      particleCount = width < 640 ? 30 : width < 1024 ? 40 : 50;
      maxLinkDistance = width < 640 ? 80 : 100;
      particleBaseSpeed = width < 640 ? 0.15 : 0.2;
    };

    function createParticle(): Particle {
      const colors = ['#63d2ff', '#7cf29c', '#a78bfa', '#8b5cf6'];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() * 2 - 1) * particleBaseSpeed,
        speedY: (Math.random() * 2 - 1) * particleBaseSpeed,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }

    function init() {
      particlesArray = [];
      updateSettings();
      let numberOfParticles = (canvas.height * canvas.width) / 15000;
      numberOfParticles = Math.min(numberOfParticles, particleCount);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(createParticle());
      }
    }

    function updateParticle(p: Particle) {
      if (p.x > canvas.width || p.x < 0) p.speedX = -p.speedX;
      if (p.y > canvas.height || p.y < 0) p.speedY = -p.speedY;
      p.x += p.speedX;
      p.y += p.speedY;

      if (mouse.x !== undefined && mouse.y !== undefined) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          p.x -= (dx / distance) * force * 2;
          p.y -= (dy / distance) * force * 2;
        }
      }
    }

    function drawParticle(p: Particle) {
      if (!ctx) return;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    function connectParticles() {
      if (!ctx) return;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxLinkDistance) {
            const opacity = (1 - distance / maxLinkDistance) * 0.4;
            ctx.strokeStyle = `rgba(99, 210, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    const drawFrame = (animateFrame: boolean) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        if (animateFrame) updateParticle(p);
        drawParticle(p);
      });
      connectParticles();
    };

    const animate = (timestamp = 0) => {
      if (!isRunning) return;
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        drawFrame(true);
      }
      animationId = requestAnimationFrame(animate);
    };

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      isRunning = false;
    };

    const start = () => {
      if (isRunning) return;
      if (mediaQuery.matches || document.hidden) {
        drawFrame(false);
        return;
      }
      isRunning = true;
      lastFrame = 0;
      animate();
    };

    const handleVisibility = () => {
      if (mediaQuery.matches || document.hidden) {
        stop();
        drawFrame(false);
        return;
      }
      start();
    };

    const handleResize = () => {
      resizeCanvas();
      init();
      if (!isRunning) {
        drawFrame(false);
      }
    };

    resizeCanvas();
    init();
    handleVisibility();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery.addEventListener('change', handleVisibility);

    return () => {
      stop();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery.removeEventListener('change', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/myjourney");
    }
  }, [status, router]);

  useEffect(() => {
    const loadHistory = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/me/history", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (e) {
        logger.error("Failed to load history:", e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [status]);

  // Load detailed reading content
  const loadReadingDetail = useCallback(async (record: ServiceRecord) => {
    setSelectedRecord(record);
    setDetailLoading(true);
    setIchingDetail(null);
    setDestinyMapDetail(null);
    setCalendarDetail(null);
    setTarotDetail(null);
    setNumerologyDetail(null);

    try {
      if (record.service === "iching" && record.type === "reading") {
        const res = await fetch(`/api/readings/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading?.content) {
            const parsed = JSON.parse(data.reading.content) as IChingContent;
            setIchingDetail(parsed);
          }
        }
      } else if (record.service === "destiny-map" && record.type === "consultation") {
        const res = await fetch(`/api/consultation/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setDestinyMapDetail(data.data as DestinyMapContent);
          } else {
            // No data returned - show basic info
            setDestinyMapDetail({
              id: record.id,
              theme: record.theme || "focus_overall",
              summary: record.summary || "Destiny Map 분석",
              fullReport: undefined,
              createdAt: record.date,
            });
          }
        } else {
          // Any error (402 premium required, 404 not found, etc.) - show basic info
          setDestinyMapDetail({
            id: record.id,
            theme: record.theme || "focus_overall",
            summary: record.summary || "Destiny Map 분석",
            fullReport: undefined,
            createdAt: record.date,
          });
        }
      } else if (record.service === "destiny-calendar" && record.type === "calendar") {
        const res = await fetch(`/api/calendar/save/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.savedDate) {
            setCalendarDetail({
              ...data.savedDate,
              categories: data.savedDate.categories || [],
              bestTimes: data.savedDate.bestTimes || [],
              sajuFactors: data.savedDate.sajuFactors || [],
              astroFactors: data.savedDate.astroFactors || [],
              recommendations: data.savedDate.recommendations || [],
              warnings: data.savedDate.warnings || [],
            } as CalendarContent);
          }
        }
      } else if (record.service === "tarot" && (record.type === "reading" || record.type === "tarot-reading")) {
        // Try new TarotReading table first
        const res = await fetch(`/api/tarot/save/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading) {
            setTarotDetail({
              categoryId: data.reading.theme || '',
              spreadId: data.reading.spreadId || '',
              spreadTitle: data.reading.spreadTitle || '타로 리딩',
              cards: data.reading.cards || [],
              userQuestion: data.reading.question,
              overallMessage: data.reading.overallMessage,
              cardInsights: data.reading.cardInsights,
              guidance: data.reading.guidance,
              affirmation: data.reading.affirmation,
            });
          }
        } else {
          // Fallback to old Reading table
          const fallbackRes = await fetch(`/api/readings/${record.id}`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            if (data.reading?.content) {
              const parsed = JSON.parse(data.reading.content) as TarotContent;
              setTarotDetail(parsed);
            }
          }
        }
      } else if (record.service === "numerology" && record.type === "numerology") {
        const res = await fetch(`/api/readings/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading?.content) {
            const parsed = JSON.parse(data.reading.content) as NumerologyContent;
            setNumerologyDetail(parsed);
          }
        }
      }
    } catch (e) {
      logger.error("Failed to load reading detail:", e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedRecord(null);
    setIchingDetail(null);
    setDestinyMapDetail(null);
    setCalendarDetail(null);
    setTarotDetail(null);
    setNumerologyDetail(null);
  }, []);

  if (status === "loading" || loading) {
    return (
      <main className={styles.container}>
        <canvas ref={canvasRef} className={styles.particleCanvas} />
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <p>Loading your destiny...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  // Get unique services with counts
  const serviceCounts: Record<string, number> = {};
  history.forEach((day) => {
    day.records.forEach((r) => {
      serviceCounts[r.service] = (serviceCounts[r.service] || 0) + 1;
    });
  });

  // Use all services from constants (show all, even with 0 count)
  const displayServices = ALL_SERVICES_ORDER;

  // Filter history by selected service
  const filteredHistory = selectedService
    ? history
        .map((day) => ({
          ...day,
          records: day.records.filter((r) => r.service === selectedService),
        }))
        .filter((day) => day.records.length > 0)
    : [];

  // Count total filtered records
  const filteredRecordsCount = filteredHistory.reduce((sum, day) => sum + day.records.length, 0);

  // Limit displayed history based on showAllRecords
  const displayedHistory = showAllRecords
    ? filteredHistory
    : (() => {
        let count = 0;
        const limited: DailyHistory[] = [];
        for (const day of filteredHistory) {
          if (count >= INITIAL_DISPLAY_COUNT) break;
          const remaining = INITIAL_DISPLAY_COUNT - count;
          if (day.records.length <= remaining) {
            limited.push(day);
            count += day.records.length;
          } else {
            limited.push({ ...day, records: day.records.slice(0, remaining) });
            count += remaining;
          }
        }
        return limited;
      })();

  const totalRecords = history.reduce((sum, day) => sum + day.records.length, 0);

  return (
    <main className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <section className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <BackButton onClick={() => {
                if (selectedService) {
                  setSelectedService(null);
                  setShowAllRecords(false);
                } else {
                  router.push("/myjourney");
                }
              }} />
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              {selectedService ? (SERVICE_CONFIG[selectedService] ? t(SERVICE_CONFIG[selectedService].titleKey) : selectedService) : "My Destiny"}
            </h1>
            <p className={styles.subtitle}>
              {selectedService
                ? `${serviceCounts[selectedService] || 0}${t("history.recordUnit")}`
                : `${totalRecords}${t("history.savedUnit")}`}
            </p>
          </div>
        </header>

        {/* Service Selection Grid (when no service selected) */}
        {!selectedService ? (
          <>
            {displayServices.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📜</span>
                <p>아직 기록이 없습니다</p>
                <p className={styles.emptyHint}>
                  서비스를 이용하여 나만의 운명 기록을 쌓아보세요
                </p>
                <div className={styles.emptyLinks}>
                  <Link href="/destiny-map" className={styles.emptyLink}>
                    🗺️ Destiny Map
                  </Link>
                  <Link href="/iching" className={styles.emptyLink}>
                    ☯️ 주역
                  </Link>
                  <Link href="/tarot" className={styles.emptyLink}>
                    🃏 타로
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.serviceGrid}>
                {displayServices.map((service, index) => {
                  const config = SERVICE_CONFIG[service];
                  const icon = config?.icon || "📖";
                  const color = config?.color || "#8b5cf6";

                  // Get title with fallback
                  const titleKey = config?.titleKey;
                  let titleText: string;
                  if (titleKey) {
                    titleText = t(titleKey);
                  } else {
                    // Convert camelCase or kebab-case to Title Case
                    titleText = service
                      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                      .split(/[-\s]/) // Split by dash or space
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')
                      .trim();
                  }

                  // Get desc with fallback
                  const descKey = config?.descKey;
                  const descText = descKey ? t(descKey) : t("history.services.default.desc");

                  return (
                    <button
                      key={service}
                      className={styles.serviceCard}
                      onClick={() => setSelectedService(service)}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        '--service-color': color
                      } as React.CSSProperties}
                    >
                      <div className={styles.serviceIcon}>{icon}</div>
                      <div className={styles.serviceInfo}>
                        <div className={styles.serviceTitle}>{titleText}</div>
                        <div className={styles.serviceDesc}>{descText}</div>
                      </div>
                      <div className={styles.serviceCount}>{serviceCounts[service] || 0}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Records List (when service selected) */
          <div className={styles.recordsSection}>
            {filteredHistory.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📜</span>
                <p>이 서비스에 대한 기록이 없습니다</p>
              </div>
            ) : (
              <>
                <div className={styles.historyList}>
                  {displayedHistory.map((day) => (
                    <div key={day.date} className={styles.dayGroup}>
                      <div className={styles.dayHeader}>
                        <span className={styles.dayDate}>{formatDate(day.date)}</span>
                        <span className={styles.dayCount}>
                          {day.records.length}개
                        </span>
                      </div>
                      <div className={styles.dayRecords}>
                        {day.records.map((record) => {
                          const isClickable =
                            (record.service === "iching" && record.type === "reading") ||
                            (record.service === "tarot" && (record.type === "reading" || record.type === "tarot-reading")) ||
                            (record.service === "destiny-map" && record.type === "consultation") ||
                            (record.service === "destiny-calendar" && record.type === "calendar");
                          return (
                            <div
                              key={record.id}
                              className={`${styles.recordCard} ${isClickable ? styles.clickable : ""}`}
                              onClick={() => isClickable && loadReadingDetail(record)}
                              style={{ '--service-color': SERVICE_CONFIG[record.service]?.color || '#8b5cf6' } as React.CSSProperties}
                            >
                              <span className={styles.recordIcon}>
                                {SERVICE_CONFIG[record.service]?.icon || "📖"}
                              </span>
                              <div className={styles.recordContent}>
                                <div className={styles.recordTitle}>
                                  <span className={styles.serviceName}>
                                    {(() => {
                                      const titleKey = SERVICE_CONFIG[record.service]?.titleKey;
                                      if (titleKey) {
                                        return t(titleKey);
                                      }
                                      // Convert camelCase or kebab-case to Title Case
                                      return record.service
                                        .replace(/([A-Z])/g, ' $1')
                                        .split(/[-\s]/)
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                        .join(' ')
                                        .trim();
                                    })()}
                                  </span>
                                  {isClickable && (
                                    <span className={styles.viewDetail}>{t("history.viewDetail")}</span>
                                  )}
                                </div>
                                {record.summary && (
                                  <p className={styles.recordSummary}>{record.summary}</p>
                                )}
                              </div>
                              <span className={styles.recordArrow}>→</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {!showAllRecords && filteredRecordsCount > INITIAL_DISPLAY_COUNT && (
                  <button
                    className={styles.showMoreButton}
                    onClick={() => setShowAllRecords(true)}
                  >
                    더보기 ({filteredRecordsCount - INITIAL_DISPLAY_COUNT}개 더)
                  </button>
                )}
                {showAllRecords && filteredRecordsCount > INITIAL_DISPLAY_COUNT && (
                  <button
                    className={styles.showMoreButton}
                    onClick={() => setShowAllRecords(false)}
                  >
                    접기
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Context Info */}
        {totalRecords > 0 && !selectedService && (
          <div className={styles.aiInfo}>
            <span className={styles.aiIcon}>🤖</span>
            <p>
              {totalRecords}개의 리딩이 AI 상담 개인화에 활용됩니다
            </p>
          </div>
        )}
      </section>

      {/* I Ching Detail Modal */}
      {selectedRecord && (
        <div className={styles.modalOverlay} onClick={closeDetail}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeDetail}>×</button>

            {detailLoading ? (
              <div className={styles.modalLoading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
              </div>
            ) : destinyMapDetail ? (
              <div className={styles.destinyMapDetail}>
                {/* Header */}
                <div className={styles.destinyHeader}>
                  <span className={styles.destinyIcon}>🗺️</span>
                  <div>
                    <h2>Destiny Map</h2>
                    <p className={styles.destinyTheme}>
                      {destinyMapDetail.theme === "focus_love" ? "연애운" :
                       destinyMapDetail.theme === "focus_career" ? "직장/사업운" :
                       destinyMapDetail.theme === "focus_money" ? "재물운" :
                       destinyMapDetail.theme === "focus_health" ? "건강운" :
                       destinyMapDetail.theme === "focus_overall" ? "종합 운세" :
                       destinyMapDetail.theme}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>요약</h3>
                  <p>{destinyMapDetail.summary}</p>
                </div>

                {/* Full Report */}
                {destinyMapDetail.fullReport ? (
                  <div className={styles.aiSection}>
                    <h3 className={styles.aiSectionTitle}>
                      <span>✨</span> 상세 분석
                    </h3>
                    <div className={styles.aiBlock}>
                      <div className={styles.fullReport}>
                        {destinyMapDetail.fullReport}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.premiumRequired}>
                    <span className={styles.lockIcon}>🔒</span>
                    <p>상세 내용은 프리미엄 구독자 전용입니다.</p>
                    <Link href="/pricing" className={styles.upgradeLink}>
                      프리미엄 구독하기
                    </Link>
                  </div>
                )}

                {/* User Question */}
                {destinyMapDetail.userQuestion && (
                  <div className={styles.questionBox}>
                    <span className={styles.questionIcon}>❓</span>
                    <p>{destinyMapDetail.userQuestion}</p>
                  </div>
                )}

                {/* Timestamp */}
                <p className={styles.timestamp}>
                  {new Date(destinyMapDetail.createdAt).toLocaleString()}
                </p>
              </div>
            ) : calendarDetail ? (
              <div className={styles.calendarDetail}>
                {/* Header */}
                <div className={styles.destinyHeader}>
                  <span className={styles.destinyIcon}>📅</span>
                  <div>
                    <h2>운명 캘린더</h2>
                    <p className={styles.destinyTheme}>
                      {calendarDetail.date}
                    </p>
                  </div>
                </div>

                {/* Grade & Score */}
                <div className={styles.calendarGrade}>
                  <span className={styles.gradeEmoji}>
                    {calendarDetail.grade === 0 ? "💫" :
                     calendarDetail.grade === 1 ? "🌟" :
                     calendarDetail.grade === 2 ? "✨" :
                     calendarDetail.grade === 3 ? "⭐" : "⚠️"}
                  </span>
                  <span className={styles.gradeLabel}>
                    {calendarDetail.grade === 0 ? "천운의 날" :
                     calendarDetail.grade === 1 ? "아주 좋은 날" :
                     calendarDetail.grade === 2 ? "좋은 날" :
                     calendarDetail.grade === 3 ? "보통 날" : "주의할 날"}
                  </span>
                  <span className={styles.scoreText}>점수: {calendarDetail.score}/100</span>
                </div>

                {/* Title & Summary */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>{calendarDetail.title}</h3>
                  {calendarDetail.summary && (
                    <p className={styles.calendarSummary}>{calendarDetail.summary}</p>
                  )}
                  <p>{calendarDetail.description}</p>
                </div>

                {/* Categories */}
                {calendarDetail.categories && calendarDetail.categories.length > 0 && (
                  <div className={styles.calendarCategories}>
                    {calendarDetail.categories.map((cat, i) => (
                      <span key={i} className={styles.categoryTag}>
                        {cat === "wealth" ? "💰 재물" :
                         cat === "career" ? "💼 직장" :
                         cat === "love" ? "💕 연애" :
                         cat === "health" ? "💪 건강" :
                         cat === "travel" ? "✈️ 여행" :
                         cat === "study" ? "📚 학업" : `⭐ ${cat}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Best Times */}
                {calendarDetail.bestTimes && calendarDetail.bestTimes.length > 0 && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>⏰ 좋은 시간대</h3>
                    <div className={styles.bestTimesList}>
                      {calendarDetail.bestTimes.map((time, i) => (
                        <span key={i} className={styles.bestTimeItem}>{time}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis */}
                {((calendarDetail.sajuFactors && calendarDetail.sajuFactors.length > 0) ||
                  (calendarDetail.astroFactors && calendarDetail.astroFactors.length > 0)) && (
                  <div className={styles.aiSection}>
                    <h3 className={styles.aiSectionTitle}>
                      <span>✨</span> 운세 분석
                    </h3>
                    <ul className={styles.analysisList}>
                      {[...(calendarDetail.sajuFactors || []), ...(calendarDetail.astroFactors || [])].map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {calendarDetail.recommendations && calendarDetail.recommendations.length > 0 && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>✨ 오늘의 행운 키</h3>
                    <ul>
                      {calendarDetail.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {calendarDetail.warnings && calendarDetail.warnings.length > 0 && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>⚡ 주의사항</h3>
                    <ul>
                      {calendarDetail.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timestamp */}
                <p className={styles.timestamp}>
                  저장일: {new Date(calendarDetail.createdAt).toLocaleString()}
                </p>
              </div>
            ) : tarotDetail ? (
              <div className={styles.tarotDetail}>
                {/* Header */}
                <div className={styles.destinyHeader}>
                  <span className={styles.destinyIcon}>🃏</span>
                  <div>
                    <h2>타로 리딩</h2>
                    <p className={styles.destinyTheme}>{tarotDetail.spreadTitle}</p>
                  </div>
                </div>

                {/* User Question */}
                {tarotDetail.userQuestion && (
                  <div className={styles.questionBox}>
                    <span className={styles.questionIcon}>❓</span>
                    <p>{tarotDetail.userQuestion}</p>
                  </div>
                )}

                {/* Overall Message */}
                {tarotDetail.overallMessage && (
                  <div className={styles.aiSection}>
                    <h3 className={styles.aiSectionTitle}>
                      <span>🔮</span> AI 해석
                    </h3>
                    <div className={styles.aiBlock}>
                      <p>{tarotDetail.overallMessage}</p>
                    </div>
                  </div>
                )}

                {/* Cards */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>뽑은 카드</h3>
                  <div className={styles.tarotCards}>
                    {tarotDetail.cards.map((card, idx) => {
                      const cardInsight = tarotDetail.cardInsights?.find(
                        ci => ci.card_name === card.name || ci.card_name === card.nameKo
                      );
                      return (
                        <div key={idx} className={styles.tarotCard}>
                          <div className={styles.tarotCardHeader}>
                            {card.position && (
                              <span className={styles.cardPosition}>{card.position}</span>
                            )}
                            <span className={`${styles.cardOrientation} ${card.isReversed ? styles.reversed : ''}`}>
                              {card.isReversed ? '역방향' : '정방향'}
                            </span>
                          </div>
                          <div className={styles.cardName}>
                            {card.nameKo || card.name}
                          </div>
                          {card.nameKo && card.name !== card.nameKo && (
                            <div className={styles.cardNameEn}>{card.name}</div>
                          )}
                          {cardInsight?.interpretation && (
                            <div className={styles.cardInsight}>
                              <p>{cardInsight.interpretation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Guidance */}
                {tarotDetail.guidance && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>💡 조언</h3>
                    <p>{tarotDetail.guidance}</p>
                  </div>
                )}

                {/* Affirmation */}
                {tarotDetail.affirmation && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>✨ 확언</h3>
                    <p className={styles.affirmation}>{tarotDetail.affirmation}</p>
                  </div>
                )}

                {/* Timestamp */}
                {selectedRecord && (
                  <p className={styles.timestamp}>
                    {formatDate(selectedRecord.date)}
                  </p>
                )}
              </div>
            ) : ichingDetail ? (
              <div className={styles.ichingDetail}>
                {/* Header with hexagram */}
                <div className={styles.ichingHeader}>
                  <div className={styles.hexagramDisplay}>
                    {/* Hexagram visual from lines */}
                    {ichingDetail.hexagramLines ? (
                      <div className={styles.hexagramLines}>
                        {[...ichingDetail.hexagramLines].reverse().map((line, idx) => (
                          <div
                            key={idx}
                            className={`${styles.hexLine} ${line.value === 0 ? styles.broken : ""} ${line.isChanging ? styles.changing : ""}`}
                          />
                        ))}
                      </div>
                    ) : ichingDetail.primaryHexagram.binary ? (
                      <div className={styles.hexagramLines}>
                        {[...ichingDetail.primaryHexagram.binary].reverse().map((bit, idx) => (
                          <div
                            key={idx}
                            className={`${styles.hexLine} ${bit === "0" ? styles.broken : ""}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className={styles.hexagramSymbol}>{ichingDetail.primaryHexagram.symbol}</div>
                    )}
                  </div>
                  <div className={styles.hexagramInfo}>
                    <h2>{ichingDetail.primaryHexagram.name} {ichingDetail.primaryHexagram.symbol}</h2>
                    <p className={styles.hexagramNumber}>Hexagram #{ichingDetail.primaryHexagram.number}</p>
                    {ichingDetail.question && (
                      <div className={styles.questionBox}>
                        <span className={styles.questionIcon}>❓</span>
                        <p>{ichingDetail.question}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Judgment */}
                {ichingDetail.primaryHexagram.judgment && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Judgment</h3>
                    <p>{ichingDetail.primaryHexagram.judgment}</p>
                  </div>
                )}

                {/* Changing Lines */}
                {ichingDetail.changingLines && ichingDetail.changingLines.length > 0 && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Changing Lines</h3>
                    <div className={styles.changingLinesList}>
                      {ichingDetail.changingLines.map((line, idx) => (
                        <div key={idx} className={styles.changingLineItem}>
                          <span className={styles.lineNumber}>Line {line.index + 1}</span>
                          <p>{line.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resulting Hexagram */}
                {ichingDetail.resultingHexagram && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>→ Resulting Hexagram</h3>
                    <div className={styles.resultingHex}>
                      <span className={styles.resultingSymbol}>{ichingDetail.resultingHexagram.symbol}</span>
                      <div>
                        <p className={styles.resultingName}>{ichingDetail.resultingHexagram.name}</p>
                        {ichingDetail.resultingHexagram.judgment && (
                          <p className={styles.resultingJudgment}>{ichingDetail.resultingHexagram.judgment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Interpretation */}
                {ichingDetail.aiInterpretation && (
                  <div className={styles.aiSection}>
                    <h3 className={styles.aiSectionTitle}>
                      <span>✨</span> AI Interpretation
                    </h3>

                    {ichingDetail.aiInterpretation.overview && (
                      <div className={styles.aiBlock}>
                        <h4>Overall Interpretation</h4>
                        <p>{ichingDetail.aiInterpretation.overview}</p>
                      </div>
                    )}

                    {ichingDetail.aiInterpretation.changing && (
                      <div className={styles.aiBlock}>
                        <h4>Changing Lines Analysis</h4>
                        <p>{ichingDetail.aiInterpretation.changing}</p>
                      </div>
                    )}

                    {ichingDetail.aiInterpretation.advice && (
                      <div className={styles.aiBlock}>
                        <h4>Practical Guidance</h4>
                        <p>{ichingDetail.aiInterpretation.advice}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                {ichingDetail.timestamp && (
                  <p className={styles.timestamp}>
                    {new Date(ichingDetail.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ) : numerologyDetail ? (
              <div className={styles.numerologyDetail}>
                {/* Header */}
                <div className={styles.destinyHeader}>
                  <span className={styles.destinyIcon}>🔢</span>
                  <div>
                    <h2>수비학 분석</h2>
                    <p className={styles.destinyTheme}>{numerologyDetail.name}</p>
                  </div>
                </div>

                {/* Core Numbers */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>핵심 숫자</h3>
                  <div className={styles.numberGrid}>
                    <div className={styles.numberBox}>
                      <span className={styles.numberValue}>{numerologyDetail.lifePath}</span>
                      <span className={styles.numberLabel}>Life Path</span>
                      <span className={styles.numberKorean}>인생 경로</span>
                    </div>
                    <div className={styles.numberBox}>
                      <span className={styles.numberValue}>{numerologyDetail.expression}</span>
                      <span className={styles.numberLabel}>Expression</span>
                      <span className={styles.numberKorean}>표현수</span>
                    </div>
                    <div className={styles.numberBox}>
                      <span className={styles.numberValue}>{numerologyDetail.soulUrge}</span>
                      <span className={styles.numberLabel}>Soul Urge</span>
                      <span className={styles.numberKorean}>영혼의 욕구</span>
                    </div>
                    <div className={styles.numberBox}>
                      <span className={styles.numberValue}>{numerologyDetail.personality}</span>
                      <span className={styles.numberLabel}>Personality</span>
                      <span className={styles.numberKorean}>인격수</span>
                    </div>
                  </div>
                </div>

                {/* Personal Year */}
                {numerologyDetail.personalYear && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🌟 올해의 테마</h3>
                    <div className={styles.personalYearBox}>
                      <span className={styles.yearNumber}>{numerologyDetail.personalYear}</span>
                      <span className={styles.yearLabel}>Personal Year Number</span>
                    </div>
                  </div>
                )}

                {/* Birth Date */}
                <p className={styles.timestamp}>
                  생년월일: {new Date(numerologyDetail.birthDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ) : (
              <div className={styles.modalError}>
                <p>Failed to load reading details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
// formatDate is now imported from ./lib
