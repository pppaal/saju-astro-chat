"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./feedback.module.css";

type SectionStat = {
  sectionId: string;
  total: number;
  positive: number;
  rate: number;
};

type FeedbackStats = {
  total: number;
  positive: number;
  negative: number;
  satisfactionRate: number;
  bySection: SectionStat[];
};

type FeedbackRecord = {
  id: string;
  service: string;
  theme: string;
  sectionId: string;
  helpful: boolean;
  dayMaster: string | null;
  sunSign: string | null;
  locale: string;
  userHash: string | null;
  createdAt: string;
};

const SERVICES = ["all", "destiny-map", "tarot", "dream", "saju", "astrology"];
const THEMES = ["all", "career", "love", "wealth", "health", "family", "life_path", "chat"];

export default function FeedbackDashboard() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState("all");
  const [theme, setTheme] = useState("all");
  const [showNegativeOnly, setShowNegativeOnly] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (service !== "all") params.set("service", service);
      if (theme !== "all") params.set("theme", theme);

      const res = await fetch(`/api/feedback?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [service, theme]);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (service !== "all") params.set("service", service);
      if (theme !== "all") params.set("theme", theme);
      params.set("records", "true");
      if (showNegativeOnly) params.set("helpful", "false");

      const res = await fetch(`/api/feedback/records?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
    }
  }, [service, theme, showNegativeOnly]);

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [service, theme, showNegativeOnly, fetchStats, fetchRecords]);

  const getSatisfactionColor = (rate: number) => {
    if (rate >= 80) return "#22c55e";
    if (rate >= 60) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Feedback Dashboard</h1>
        <p className={styles.subtitle}>AI 응답 품질 모니터링 및 개선</p>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>서비스</label>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s === "all" ? "전체" : s}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>테마</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t === "all" ? "전체" : t}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showNegativeOnly}
              onChange={(e) => setShowNegativeOnly(e.target.checked)}
            />
            부정 피드백만 보기
          </label>
        </div>
        <button onClick={() => { fetchStats(); fetchRecords(); }} className={styles.refreshBtn}>
          새로고침
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : stats ? (
        <>
          {/* Overview Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>총 피드백</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: "#22c55e" }}>
                {stats.positive}
              </div>
              <div className={styles.statLabel}>긍정 (👍)</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: "#ef4444" }}>
                {stats.negative}
              </div>
              <div className={styles.statLabel}>부정 (👎)</div>
            </div>
            <div className={styles.statCard}>
              <div
                className={styles.statValue}
                style={{ color: getSatisfactionColor(stats.satisfactionRate) }}
              >
                {stats.satisfactionRate}%
              </div>
              <div className={styles.statLabel}>만족도</div>
            </div>
          </div>

          {/* Satisfaction Bar */}
          <div className={styles.satisfactionBar}>
            <div className={styles.barLabel}>전체 만족도</div>
            <div className={styles.barContainer}>
              <div
                className={styles.barFill}
                style={{
                  width: `${stats.satisfactionRate}%`,
                  backgroundColor: getSatisfactionColor(stats.satisfactionRate),
                }}
              />
            </div>
            <div className={styles.barValue}>{stats.satisfactionRate}%</div>
          </div>

          {/* Section Breakdown */}
          {stats.bySection.length > 0 && (
            <div className={styles.sectionBreakdown}>
              <h2>섹션별 통계</h2>
              <div className={styles.sectionList}>
                {stats.bySection
                  .sort((a, b) => a.rate - b.rate)
                  .slice(0, 20)
                  .map((section) => (
                    <div key={section.sectionId} className={styles.sectionItem}>
                      <div className={styles.sectionInfo}>
                        <span className={styles.sectionId}>
                          {section.sectionId.slice(0, 30)}...
                        </span>
                        <span className={styles.sectionCount}>
                          ({section.total}건)
                        </span>
                      </div>
                      <div className={styles.sectionBar}>
                        <div
                          className={styles.sectionBarFill}
                          style={{
                            width: `${section.rate}%`,
                            backgroundColor: getSatisfactionColor(section.rate),
                          }}
                        />
                      </div>
                      <span
                        className={styles.sectionRate}
                        style={{ color: getSatisfactionColor(section.rate) }}
                      >
                        {section.rate}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Records */}
          {records.length > 0 && (
            <div className={styles.recordsSection}>
              <h2>{showNegativeOnly ? "부정 피드백 목록" : "최근 피드백"}</h2>
              <div className={styles.recordsList}>
                {records.slice(0, 50).map((record) => (
                  <div
                    key={record.id}
                    className={`${styles.recordItem} ${
                      record.helpful ? styles.positive : styles.negative
                    }`}
                  >
                    <div className={styles.recordHeader}>
                      <span className={styles.recordIcon}>
                        {record.helpful ? "👍" : "👎"}
                      </span>
                      <span className={styles.recordService}>{record.service}</span>
                      <span className={styles.recordTheme}>{record.theme}</span>
                      <span className={styles.recordTime}>
                        {new Date(record.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className={styles.recordDetails}>
                      <span>ID: {record.sectionId}</span>
                      {record.locale && <span>언어: {record.locale}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noData}>데이터가 없습니다</div>
      )}
    </div>
  );
}
