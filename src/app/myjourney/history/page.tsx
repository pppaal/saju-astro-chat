"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import styles from "./history.module.css";

type ServiceRecord = {
  id: string;
  date: string;
  service: string;
  theme?: string;
  summary?: string;
  type: string;
  content?: string;
};

type DailyHistory = {
  date: string;
  records: ServiceRecord[];
};

type DestinyMapContent = {
  id: string;
  theme: string;
  summary: string;
  fullReport?: string;
  createdAt: string;
  locale?: string;
  userQuestion?: string;
};

type IChingContent = {
  question?: string;
  primaryHexagram: {
    number: number;
    name: string;
    symbol: string;
    binary?: string;
    judgment?: string;
    image?: string;
  };
  hexagramLines?: { value: number; isChanging: boolean }[];
  changingLines?: { index: number; text: string }[];
  resultingHexagram?: {
    number: number;
    name: string;
    symbol: string;
    binary?: string;
    judgment?: string;
  } | null;
  aiInterpretation?: {
    overview: string;
    changing: string;
    advice: string;
  } | null;
  locale?: string;
  timestamp?: string;
};

// Service configuration with icons, titles, descriptions, and colors
const SERVICE_CONFIG: Record<string, { icon: string; title: string; desc: string; color: string }> = {
  "daily-fortune": { icon: "🌟", title: "오늘의 운세", desc: "매일의 운세와 조언", color: "#fbbf24" },
  "destiny-map": { icon: "🗺️", title: "Destiny Map", desc: "사주 + 점성술 + 타로 융합 분석", color: "#8b5cf6" },
  iching: { icon: "☯️", title: "주역", desc: "64괘의 지혜로 미래 예측", color: "#6366f1" },
  tarot: { icon: "🃏", title: "타로", desc: "카드가 전하는 메시지", color: "#ec4899" },
  saju: { icon: "🔮", title: "사주", desc: "사주팔자 분석", color: "#f97316" },
  astrology: { icon: "⭐", title: "점성술", desc: "별자리와 행성의 영향", color: "#06b6d4" },
  dream: { icon: "💭", title: "꿈 해몽", desc: "꿈이 전하는 메시지", color: "#a855f7" },
  compatibility: { icon: "💕", title: "궁합", desc: "관계의 조화 분석", color: "#f43f5e" },
  numerology: { icon: "🔢", title: "수비학", desc: "숫자의 비밀", color: "#14b8a6" },
  aura: { icon: "🌈", title: "오라", desc: "에너지 필드 분석", color: "#84cc16" },
  personality: { icon: "🧠", title: "성격", desc: "내면의 자아 탐구", color: "#0ea5e9" },
  "destiny-pal": { icon: "🤝", title: "Destiny Pal", desc: "AI 상담 파트너", color: "#8b5cf6" },
  "destiny-matrix": { icon: "🔷", title: "운명 매트릭스", desc: "운명의 청사진", color: "#6366f1" },
};

const SERVICE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICE_CONFIG).map(([k, v]) => [k, v.icon])
);

export default function HistoryPage() {
  return (
    <SessionProvider>
      <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
        <HistoryContent />
      </Suspense>
    </SessionProvider>
  );
}

function HistoryContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ichingDetail, setIchingDetail] = useState<IChingContent | null>(null);
  const [destinyMapDetail, setDestinyMapDetail] = useState<DestinyMapContent | null>(null);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 50;
    const MAX_LINK_DISTANCE = 100;
    const PARTICLE_BASE_SPEED = 0.2;

    type Particle = {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
    };

    let particlesArray: Particle[] = [];
    let raf = 0;

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
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    function createParticle(): Particle {
      const colors = ['#63d2ff', '#7cf29c', '#a78bfa', '#8b5cf6'];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED,
        speedY: (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 15000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
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
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    function connectParticles() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = (1 - distance / MAX_LINK_DISTANCE) * 0.4;
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

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        updateParticle(p);
        drawParticle(p);
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
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
        console.error("Failed to load history:", e);
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
          }
        } else if (res.status === 402) {
          // Premium required - show message
          setDestinyMapDetail({
            id: record.id,
            theme: record.theme || "unknown",
            summary: record.summary || "상담 기록",
            fullReport: undefined,
            createdAt: record.date,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load reading detail:", e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedRecord(null);
    setIchingDetail(null);
    setDestinyMapDetail(null);
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

  // Define all services to display (in order)
  const allServicesOrder = [
    "destiny-map",
    "tarot",
    "personality",
    "dream",
  ];

  // Use all services (show all, even with 0 count)
  const displayServices = allServicesOrder;

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
              {selectedService ? (SERVICE_CONFIG[selectedService]?.title || selectedService) : "My Destiny"}
            </h1>
            <p className={styles.subtitle}>
              {selectedService
                ? `${serviceCounts[selectedService] || 0}개의 기록`
                : `${totalRecords}개의 리딩 저장됨`}
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
                  const config = SERVICE_CONFIG[service] || {
                    icon: "📖",
                    title: service,
                    desc: "기록 보기",
                    color: "#8b5cf6"
                  };
                  return (
                    <button
                      key={service}
                      className={styles.serviceCard}
                      onClick={() => setSelectedService(service)}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        '--service-color': config.color
                      } as React.CSSProperties}
                    >
                      <div className={styles.serviceIcon}>{config.icon}</div>
                      <div className={styles.serviceInfo}>
                        <div className={styles.serviceTitle}>{config.title}</div>
                        <div className={styles.serviceDesc}>{config.desc}</div>
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
                            (record.service === "destiny-map" && record.type === "consultation");
                          return (
                            <div
                              key={record.id}
                              className={`${styles.recordCard} ${isClickable ? styles.clickable : ""}`}
                              onClick={() => isClickable && loadReadingDetail(record)}
                              style={{ '--service-color': SERVICE_CONFIG[record.service]?.color || '#8b5cf6' } as React.CSSProperties}
                            >
                              <span className={styles.recordIcon}>
                                {SERVICE_ICONS[record.service] || "📖"}
                              </span>
                              <div className={styles.recordContent}>
                                <div className={styles.recordTitle}>
                                  <span className={styles.serviceName}>
                                    {SERVICE_CONFIG[record.service]?.title || record.service}
                                  </span>
                                  {record.theme && (
                                    <span className={styles.recordTheme}>{record.theme}</span>
                                  )}
                                  {isClickable && (
                                    <span className={styles.viewDetail}>상세보기</span>
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
