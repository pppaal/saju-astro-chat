"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./history.module.css";

type ServiceRecord = {
  id: string;
  date: string;
  service: string;
  theme?: string;
  summary?: string;
  type: string;
};

type DailyHistory = {
  date: string;
  records: ServiceRecord[];
};

const SERVICE_ICONS: Record<string, string> = {
  "destiny-map": "🗺️",
  tarot: "🃏",
  saju: "🔮",
  astrology: "⭐",
  dream: "💭",
  iching: "☯️",
  numerology: "🔢",
  aura: "🌈",
  "daily-fortune": "🌟",
};

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

  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

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

  if (status === "loading" || loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Get unique services for filter
  const allServices = new Set<string>();
  history.forEach((day) => {
    day.records.forEach((r) => allServices.add(r.service));
  });

  // Filter history
  const filteredHistory =
    filter === "all"
      ? history
      : history
          .map((day) => ({
            ...day,
            records: day.records.filter((r) => r.service === filter),
          }))
          .filter((day) => day.records.length > 0);

  const totalRecords = history.reduce((sum, day) => sum + day.records.length, 0);

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <Link href="/myjourney" className={styles.backButton}>
          ←
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>My Destiny</h1>
          <p className={styles.subtitle}>{totalRecords} readings saved</p>
        </div>
      </div>

      {/* Filter Tabs */}
      {allServices.size > 1 && (
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          {Array.from(allServices).map((service) => (
            <button
              key={service}
              className={`${styles.filterButton} ${filter === service ? styles.active : ""}`}
              onClick={() => setFilter(service)}
            >
              {SERVICE_ICONS[service] || "📖"} {service}
            </button>
          ))}
        </div>
      )}

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📜</span>
          <p>No readings yet</p>
          <p className={styles.emptyHint}>
            Start using our services to build your destiny history
          </p>
          <div className={styles.emptyLinks}>
            <Link href="/destiny-map" className={styles.emptyLink}>
              🗺️ Destiny Map
            </Link>
            <Link href="/tarot" className={styles.emptyLink}>
              🃏 Tarot
            </Link>
            <Link href="/saju" className={styles.emptyLink}>
              🔮 Saju
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.historyList}>
          {filteredHistory.map((day) => (
            <div key={day.date} className={styles.dayGroup}>
              <div className={styles.dayHeader}>
                <span className={styles.dayDate}>{formatDate(day.date)}</span>
                <span className={styles.dayCount}>
                  {day.records.length} {day.records.length === 1 ? "reading" : "readings"}
                </span>
              </div>
              <div className={styles.dayRecords}>
                {day.records.map((record) => (
                  <div key={record.id} className={styles.recordCard}>
                    <span className={styles.recordIcon}>
                      {SERVICE_ICONS[record.service] || "📖"}
                    </span>
                    <div className={styles.recordContent}>
                      <div className={styles.recordTitle}>
                        <span className={styles.serviceName}>{record.service}</span>
                        {record.theme && (
                          <span className={styles.recordTheme}>{record.theme}</span>
                        )}
                      </div>
                      {record.summary && (
                        <p className={styles.recordSummary}>{record.summary}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Context Info */}
      {totalRecords > 0 && (
        <div className={styles.aiInfo}>
          <span className={styles.aiIcon}>🤖</span>
          <p>
            Your {totalRecords} readings are being used to personalize future AI consultations
          </p>
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
