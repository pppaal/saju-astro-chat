"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getSavedReadings,
  deleteReading,
  formatRelativeTime,
  SavedTarotReading,
} from "@/lib/Tarot/tarot-storage";
import styles from "./history.module.css";

type SortOption = "newest" | "oldest";
type FilterOption = "all" | "love" | "career" | "daily" | "general";

interface CardFrequency {
  name: string;
  nameKo?: string;
  count: number;
  reversedCount: number;
}

export default function TarotHistoryPage() {
  const { language } = useI18n();
  const router = useRouter();
  const isKo = language === "ko";

  const [readings, setReadings] = useState<SavedTarotReading[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReading, setSelectedReading] = useState<SavedTarotReading | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setReadings(getSavedReadings());
  }, []);

  // Filter and sort readings
  const filteredReadings = useMemo(() => {
    let result = [...readings];

    // Filter by category
    if (filterBy !== "all") {
      result = result.filter((r) => {
        const category = r.categoryId.toLowerCase();
        switch (filterBy) {
          case "love":
            return category.includes("love") || category.includes("relationship");
          case "career":
            return category.includes("career") || category.includes("work");
          case "daily":
            return category.includes("daily") || category.includes("today");
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.question.toLowerCase().includes(query) ||
          r.cards.some((c) =>
            (c.name.toLowerCase().includes(query) ||
              c.nameKo?.toLowerCase().includes(query))
          )
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "newest") return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });

    return result;
  }, [readings, sortBy, filterBy, searchQuery]);

  // Card frequency statistics
  const cardStats = useMemo((): CardFrequency[] => {
    const freqMap = new Map<string, CardFrequency>();

    readings.forEach((reading) => {
      reading.cards.forEach((card) => {
        const existing = freqMap.get(card.name) || {
          name: card.name,
          nameKo: card.nameKo,
          count: 0,
          reversedCount: 0,
        };
        existing.count++;
        if (card.isReversed) existing.reversedCount++;
        freqMap.set(card.name, existing);
      });
    });

    return Array.from(freqMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [readings]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isKo ? "이 리딩을 삭제하시겠습니까?" : "Delete this reading?")) {
      deleteReading(id);
      setReadings(getSavedReadings());
      if (selectedReading?.id === id) {
        setSelectedReading(null);
      }
    }
  };

  const handleViewReading = (reading: SavedTarotReading) => {
    setSelectedReading(reading);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton />
        <h1 className={styles.title}>
          {isKo ? "타로 리딩 기록" : "Tarot Reading History"}
        </h1>
        <button
          className={`${styles.statsToggle} ${showStats ? styles.active : ""}`}
          onClick={() => setShowStats(!showStats)}
        >
          📊
        </button>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            className={styles.statsPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <h3 className={styles.statsSectionTitle}>
              {isKo ? "자주 나온 카드 TOP 10" : "Most Frequent Cards TOP 10"}
            </h3>
            {cardStats.length > 0 ? (
              <div className={styles.statsGrid}>
                {cardStats.map((stat, idx) => (
                  <div key={stat.name} className={styles.statCard}>
                    <span className={styles.statRank}>#{idx + 1}</span>
                    <span className={styles.statName}>
                      {isKo ? stat.nameKo || stat.name : stat.name}
                    </span>
                    <span className={styles.statCount}>
                      {stat.count}
                      {isKo ? "회" : "x"}
                      {stat.reversedCount > 0 && (
                        <span className={styles.reversedCount}>
                          ({stat.reversedCount} {isKo ? "역방향" : "reversed"})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyStats}>
                {isKo ? "아직 데이터가 없습니다" : "No data yet"}
              </p>
            )}
            <div className={styles.totalReadings}>
              {isKo ? `총 ${readings.length}개의 리딩` : `${readings.length} total readings`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className={styles.controls}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={isKo ? "질문 또는 카드 검색..." : "Search questions or cards..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.select}
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
        >
          <option value="all">{isKo ? "전체" : "All"}</option>
          <option value="love">{isKo ? "연애" : "Love"}</option>
          <option value="career">{isKo ? "커리어" : "Career"}</option>
          <option value="daily">{isKo ? "오늘의 운세" : "Daily"}</option>
          <option value="general">{isKo ? "일반" : "General"}</option>
        </select>
        <select
          className={styles.select}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="newest">{isKo ? "최신순" : "Newest"}</option>
          <option value="oldest">{isKo ? "오래된순" : "Oldest"}</option>
        </select>
      </div>

      {/* Reading List */}
      <div className={styles.readingList}>
        {filteredReadings.length > 0 ? (
          filteredReadings.map((reading) => (
            <motion.div
              key={reading.id}
              className={styles.readingCard}
              onClick={() => handleViewReading(reading)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={styles.readingHeader}>
                <span className={styles.readingTime}>
                  {formatRelativeTime(reading.timestamp, isKo)}
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(reading.id, e)}
                >
                  ✕
                </button>
              </div>
              <p className={styles.readingQuestion}>{reading.question}</p>
              <div className={styles.readingMeta}>
                <span className={styles.spreadName}>
                  {isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title}
                </span>
                <span className={styles.cardCount}>
                  🃏 {reading.cards.length}
                </span>
              </div>
              <div className={styles.cardPreview}>
                {reading.cards.slice(0, 5).map((card, idx) => (
                  <span
                    key={idx}
                    className={`${styles.cardChip} ${card.isReversed ? styles.reversed : ""}`}
                    title={isKo ? card.nameKo || card.name : card.name}
                  >
                    {(isKo ? card.nameKo || card.name : card.name).substring(0, 8)}
                    {card.isReversed && " ↓"}
                  </span>
                ))}
                {reading.cards.length > 5 && (
                  <span className={styles.moreCards}>
                    +{reading.cards.length - 5}
                  </span>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <EmptyState
            icon="🔮"
            title={
              searchQuery || filterBy !== "all"
                ? isKo ? "검색 결과가 없습니다" : "No results found"
                : isKo ? "저장된 리딩이 없습니다" : "No saved readings yet"
            }
            description={
              searchQuery || filterBy !== "all"
                ? isKo ? "다른 검색어나 필터를 시도해보세요" : "Try different keywords or filters"
                : isKo ? "타로 카드로 미래를 예측해보세요" : "Start your first tarot reading"
            }
            actionButton={
              !searchQuery && filterBy === "all"
                ? {
                    text: isKo ? "타로 시작하기" : "Start a Reading",
                    onClick: () => router.push("/tarot")
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Reading Detail Modal */}
      <AnimatePresence>
        {selectedReading && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReading(null)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={() => setSelectedReading(null)}
              >
                ✕
              </button>
              <h2 className={styles.modalTitle}>
                {isKo
                  ? selectedReading.spread.titleKo || selectedReading.spread.title
                  : selectedReading.spread.title}
              </h2>
              <p className={styles.modalTime}>
                {formatRelativeTime(selectedReading.timestamp, isKo)}
              </p>
              <div className={styles.modalQuestion}>
                <strong>{isKo ? "질문:" : "Question:"}</strong>{" "}
                {selectedReading.question}
              </div>

              <div className={styles.modalCards}>
                <h4>{isKo ? "뽑은 카드" : "Drawn Cards"}</h4>
                {selectedReading.cards.map((card, idx) => (
                  <div key={idx} className={styles.modalCardItem}>
                    <span className={styles.modalCardPosition}>
                      {isKo ? card.positionKo || card.position : card.position}
                    </span>
                    <span
                      className={`${styles.modalCardName} ${
                        card.isReversed ? styles.reversed : ""
                      }`}
                    >
                      {isKo ? card.nameKo || card.name : card.name}
                      {card.isReversed && (isKo ? " (역방향)" : " (Reversed)")}
                    </span>
                  </div>
                ))}
              </div>

              {selectedReading.interpretation.overallMessage && (
                <div className={styles.modalInterpretation}>
                  <h4>{isKo ? "해석" : "Interpretation"}</h4>
                  <p>{selectedReading.interpretation.overallMessage}</p>
                  {selectedReading.interpretation.guidance && (
                    <div className={styles.modalGuidance}>
                      <strong>{isKo ? "조언:" : "Guidance:"}</strong>{" "}
                      {selectedReading.interpretation.guidance}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
