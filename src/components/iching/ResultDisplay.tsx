"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ChangingLine, IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getPremiumHexagramData,
  getTrigramInfo,
  getLuckyInfo,
  calculateNuclearHexagram,
  calculateRelatedHexagrams
} from "@/lib/iChing/iChingPremiumData";
import { enhancedHexagramData, enhancedHexagramDataKo } from "@/lib/iChing/enhancedData";
import { getHexagramWisdom } from "@/lib/iChing/ichingWisdom";
import { analyzeSequencePosition, getXuguaPair } from "@/lib/iChing/ichingPatterns";
import styles from "./ResultDisplay.module.css";
import { logger } from "@/lib/logger";

interface ResultDisplayProps {
  result: IChingResult | null;
  question?: string;
  autoStartAi?: boolean;
  onAiComplete?: (aiText: { overview: string; changing: string; advice: string }) => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, question = "", autoStartAi = true, onAiComplete }) => {
  const { translate, locale } = useI18n();
  const lang = locale === "ko" ? "ko" : "en";

  // AI Streaming state
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [currentSection, setCurrentSection] = useState<string>("");
  const [overviewText, setOverviewText] = useState<string>("");
  const [changingText, setChangingText] = useState<string>("");
  const [adviceText, setAdviceText] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const onAiCompleteRef = useRef(onAiComplete);
  const hasNotifiedRef = useRef(false);

  // Keep ref updated
  useEffect(() => {
    onAiCompleteRef.current = onAiComplete;
  }, [onAiComplete]);

  const primaryNumber = result?.primaryHexagram?.number;
  const resultingNumber = result?.resultingHexagram?.number;

  // 프리미엄 데이터 가져오기
  const premiumData = useMemo(() => {
    if (!primaryNumber) return null;
    return getPremiumHexagramData(primaryNumber);
  }, [primaryNumber]);

  // 지괘 프리미엄 데이터
  const resultingPremiumData = useMemo(() => {
    if (!resultingNumber) return null;
    return getPremiumHexagramData(resultingNumber);
  }, [resultingNumber]);

  // 상괘/하괘 정보
  const trigramUpper = premiumData?.trigram_upper;
  const trigramLower = premiumData?.trigram_lower;

  const upperTrigram = useMemo(() => {
    if (!trigramUpper) return null;
    return getTrigramInfo(trigramUpper);
  }, [trigramUpper]);

  const lowerTrigram = useMemo(() => {
    if (!trigramLower) return null;
    return getTrigramInfo(trigramLower);
  }, [trigramLower]);

  // 행운 정보
  const luckyInfo = useMemo(() => {
    if (!primaryNumber) return null;
    return getLuckyInfo(primaryNumber);
  }, [primaryNumber]);

  // 호괘 (Nuclear Hexagram)
  const nuclearHexagram = useMemo(() => {
    if (!primaryNumber) return null;
    return calculateNuclearHexagram(primaryNumber);
  }, [primaryNumber]);

  // 착종괘 (Related Hexagrams)
  const relatedHexagrams = useMemo(() => {
    if (!primaryNumber) return null;
    return calculateRelatedHexagrams(primaryNumber);
  }, [primaryNumber]);

  // Enhanced data for better UX
  const enhancedData = useMemo(() => {
    if (!primaryNumber) return null;
    return lang === "ko" ? enhancedHexagramDataKo[primaryNumber] : enhancedHexagramData[primaryNumber];
  }, [primaryNumber, lang]);

  // Wisdom data from ichingWisdom library (traditional interpretations)
  const wisdomData = useMemo(() => {
    if (!primaryNumber) return null;
    return getHexagramWisdom(primaryNumber);
  }, [primaryNumber]);

  // Sequence and pattern analysis from ichingPatterns
  const sequenceData = useMemo(() => {
    if (!primaryNumber) return null;
    return analyzeSequencePosition(primaryNumber);
  }, [primaryNumber]);

  const xuguaPairData = useMemo(() => {
    if (!primaryNumber) return null;
    return getXuguaPair(primaryNumber);
  }, [primaryNumber]);

  // AI Streaming function
  const startAiInterpretation = useCallback(async () => {
    if (!result?.primaryHexagram || aiStatus === "streaming" || aiStatus === "loading") return;

    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setAiStatus("loading");
    setAiError("");
    setOverviewText("");
    setChangingText("");
    setAdviceText("");
    setCurrentSection("");

    try {
      const response = await fetch("/api/iching/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Token": process.env.NEXT_PUBLIC_API_TOKEN || "",
        },
        body: JSON.stringify({
          hexagramNumber: result.primaryHexagram.number,
          hexagramName: result.primaryHexagram.name,
          hexagramSymbol: result.primaryHexagram.symbol,
          judgment: result.primaryHexagram.judgment || "",
          image: result.primaryHexagram.image || "",
          coreMeaning: premiumData?.core_meaning?.[lang] || "",
          changingLines: result.changingLines || [],
          resultingHexagram: result.resultingHexagram ? {
            number: result.resultingHexagram.number,
            name: result.resultingHexagram.name,
            symbol: result.resultingHexagram.symbol,
            judgment: result.resultingHexagram.judgment,
          } : undefined,
          question,
          locale,
          themes: premiumData?.themes ? {
            career: premiumData.themes.career?.[lang] || "",
            love: premiumData.themes.love?.[lang] || "",
            health: premiumData.themes.health?.[lang] || "",
            wealth: premiumData.themes.wealth?.[lang] || "",
            timing: premiumData.themes.timing?.[lang] || "",
          } : {},
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(locale === "ko"
            ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
            : "Too many requests. Please try again later.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/event-stream")) {
        // Fallback to JSON response
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setAiStatus("done");
        return;
      }

      setAiStatus("streaming");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setAiError(data.error);
                setAiStatus("error");
                return;
              }

              if (data.done) {
                setAiStatus("done");
                setCurrentSection("");
                return;
              }

              if (data.section) {
                if (data.status === "start") {
                  setCurrentSection(data.section);
                } else if (data.content) {
                  if (data.section === "overview") {
                    setOverviewText(prev => prev + data.content);
                  } else if (data.section === "changing") {
                    setChangingText(prev => prev + data.content);
                  } else if (data.section === "advice") {
                    setAdviceText(prev => prev + data.content);
                  }
                } else if (data.status === "done") {
                  // Section complete
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setAiStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      logger.error("[ResultDisplay] AI streaming error:", err);
      setAiError(err instanceof Error ? err.message : "AI 해석 중 오류가 발생했습니다.");
      setAiStatus("error");
    }
  }, [result, aiStatus, question, locale, lang, premiumData]);

  // Notify parent when AI is complete - use refs to get latest values
  const overviewTextRef = useRef(overviewText);
  const changingTextRef = useRef(changingText);
  const adviceTextRef = useRef(adviceText);

  // Keep refs updated with latest values
  useEffect(() => {
    overviewTextRef.current = overviewText;
  }, [overviewText]);

  useEffect(() => {
    changingTextRef.current = changingText;
  }, [changingText]);

  useEffect(() => {
    adviceTextRef.current = adviceText;
  }, [adviceText]);

  useEffect(() => {
    if (aiStatus === "done" && !hasNotifiedRef.current && onAiCompleteRef.current) {
      hasNotifiedRef.current = true;
      // Delay to ensure all streaming text is fully captured in refs
      setTimeout(() => {
        onAiCompleteRef.current?.({
          overview: overviewTextRef.current,
          changing: changingTextRef.current,
          advice: adviceTextRef.current,
        });
      }, 300);
    }
  }, [aiStatus]);

  // Auto-start AI interpretation when result is available
  useEffect(() => {
    if (autoStartAi && result?.primaryHexagram && !hasStartedRef.current && aiStatus === "idle") {
      hasStartedRef.current = true;
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        startAiInterpretation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartAi, result, aiStatus, startAiInterpretation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!result) return null;
  if (result.error) return <p className={styles.errorText}>{result.error}</p>;

  return (
    <div className={styles.resultContainer}>
      {/* Primary Hexagram Card */}
      <div className={styles.resultCard}>
        <div className={styles.hexagramHeader}>
          <div className={styles.hexagramIcon}>☯</div>
          <div className={styles.hexagramInfo}>
            <h2 className={styles.hexagramTitle}>
              {translate("iching.today", "Today's Hexagram")}:{" "}
              {result.primaryHexagram.name}
              <span className={styles.hexagramSymbol}>
                {result.primaryHexagram.symbol}
              </span>
            </h2>
            {premiumData && (
              <p className={styles.hexagramSubtitle}>
                {premiumData.name_hanja} · {premiumData.element}
              </p>
            )}
          </div>
        </div>

        {/* 괘 구성 정보 */}
        {upperTrigram && lowerTrigram && (
          <>
            <div className={styles.divider} />
            <div className={styles.trigramSection}>
              <div className={styles.sectionLabel}>
                {translate("iching.composition", "Hexagram Composition")}
              </div>
              <div className={styles.trigramGrid}>
                <div className={styles.trigramItem}>
                  <span className={styles.trigramSymbol}>{upperTrigram.symbol}</span>
                  <span className={styles.trigramName}>
                    {lang === "ko" ? upperTrigram.name_ko : upperTrigram.name_en}
                  </span>
                  <span className={styles.trigramLabel}>
                    {translate("iching.upperTrigram", "Upper")}
                  </span>
                </div>
                <div className={styles.trigramDivider}>+</div>
                <div className={styles.trigramItem}>
                  <span className={styles.trigramSymbol}>{lowerTrigram.symbol}</span>
                  <span className={styles.trigramName}>
                    {lang === "ko" ? lowerTrigram.name_ko : lowerTrigram.name_en}
                  </span>
                  <span className={styles.trigramLabel}>
                    {translate("iching.lowerTrigram", "Lower")}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.divider} />

        {/* Quick Summary - 한 줄 요약 */}
        {enhancedData?.quickSummary && (
          <>
            <div className={styles.quickSummarySection}>
              <div className={styles.sectionLabel}>
                {enhancedData.visualImagery.emoji} {translate("iching.quickSummary", "Quick Summary")}
              </div>
              <p className={styles.oneLiner}>
                {enhancedData.quickSummary.oneLiner}
              </p>
              <div className={styles.keywords}>
                {enhancedData.quickSummary.keywords.map((keyword, idx) => (
                  <span key={idx} className={styles.keywordTag}>#{keyword}</span>
                ))}
              </div>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Visual Imagery - 상징적 이미지 */}
        {enhancedData?.visualImagery && (
          <>
            <div className={styles.visualImagerySection}>
              <div className={styles.sectionLabel}>
                {translate("iching.visualImagery", "Visual Imagery")}
              </div>
              <div className={styles.sceneDescription}>
                <span className={styles.sceneEmoji}>{enhancedData.visualImagery.emoji}</span>
                <p className={styles.sceneText}>{enhancedData.visualImagery.scene}</p>
              </div>
              <p className={styles.symbolismText}>{enhancedData.visualImagery.symbolism}</p>
              <div className={styles.colorPalette}>
                {enhancedData.visualImagery.colors.map((color, idx) => (
                  <span key={idx} className={styles.colorChip}>{color}</span>
                ))}
              </div>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Core Meaning - 핵심 의미 */}
        {premiumData && (
          <>
            <div className={styles.coreMeaningSection}>
              <div className={styles.sectionLabel}>
                {translate("iching.coreMeaning", "Core Meaning")}
              </div>
              <p className={styles.coreMeaningText}>
                {premiumData.core_meaning[lang]}
              </p>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Plain Language Explanation - 쉬운 풀이 */}
        {enhancedData?.plainLanguage && (
          <>
            <div className={styles.plainLanguageSection}>
              <div className={styles.sectionLabel}>
                📖 {translate("iching.plainLanguage", "Easy Explanation")}
              </div>

              {/* 전통 표현 */}
              <div className={styles.traditionalBox}>
                <div className={styles.traditionalLabel}>
                  {translate("iching.traditional", "Traditional")}
                </div>
                <p className={styles.traditionalText}>
                  {enhancedData.plainLanguage.traditionalText}
                </p>
              </div>

              {/* 현대적 풀이 */}
              <div className={styles.modernBox}>
                <div className={styles.modernLabel}>
                  {translate("iching.modernExplanation", "Modern Explanation")}
                </div>
                <p className={styles.modernText}>
                  {enhancedData.plainLanguage.modernExplanation}
                </p>
              </div>

              {/* 실생활 예시 */}
              <div className={styles.exampleBox}>
                <div className={styles.exampleLabel}>
                  💡 {translate("iching.realLifeExample", "Real-Life Example")}
                </div>
                <p className={styles.exampleText}>
                  {enhancedData.plainLanguage.realLifeExample}
                </p>
              </div>

              {/* 비유 */}
              <div className={styles.metaphorBox}>
                <div className={styles.metaphorLabel}>
                  🌟 {translate("iching.metaphor", "Metaphor")}
                </div>
                <p className={styles.metaphorText}>
                  {enhancedData.plainLanguage.metaphor}
                </p>
              </div>
            </div>
            <div className={styles.divider} />
          </>
        )}

        {/* Judgment */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.judgment", "Judgment")}
          </div>
          <p className={styles.sectionText}>
            {result.primaryHexagram.judgment}
          </p>
        </div>

        <div className={styles.divider} />

        {/* Image */}
        <div>
          <div className={styles.sectionLabel}>
            {translate("iching.image", "Image")}
          </div>
          <p className={styles.imageText}>
            {result.primaryHexagram.image}
          </p>
        </div>
      </div>

      {/* 테마별 해석 섹션 */}
      {premiumData && (
        <div className={styles.themesCard}>
          <div className={styles.themesHeader}>
            <span className={styles.themesIcon}>✧</span>
            <h3 className={styles.themesTitle}>
              {translate("iching.lifeAreas", "Life Area Interpretations")}
            </h3>
          </div>

          <div className={styles.themesGrid}>
            {/* 직업/사업 */}
            <div className={styles.themeItem}>
              <div className={styles.themeHeader}>
                <span className={styles.themeIcon}>💼</span>
                <span className={styles.themeLabel}>
                  {translate("iching.career", "Career & Business")}
                </span>
              </div>
              <p className={styles.themeText}>
                {premiumData.themes.career[lang]}
              </p>
            </div>

            {/* 연애/관계 */}
            <div className={styles.themeItem}>
              <div className={styles.themeHeader}>
                <span className={styles.themeIcon}>💕</span>
                <span className={styles.themeLabel}>
                  {translate("iching.love", "Love & Relationships")}
                </span>
              </div>
              <p className={styles.themeText}>
                {premiumData.themes.love[lang]}
              </p>
            </div>

            {/* 건강 */}
            <div className={styles.themeItem}>
              <div className={styles.themeHeader}>
                <span className={styles.themeIcon}>🏥</span>
                <span className={styles.themeLabel}>
                  {translate("iching.health", "Health")}
                </span>
              </div>
              <p className={styles.themeText}>
                {premiumData.themes.health[lang]}
              </p>
            </div>

            {/* 재물 */}
            <div className={styles.themeItem}>
              <div className={styles.themeHeader}>
                <span className={styles.themeIcon}>💰</span>
                <span className={styles.themeLabel}>
                  {translate("iching.wealth", "Wealth & Finance")}
                </span>
              </div>
              <p className={styles.themeText}>
                {premiumData.themes.wealth[lang]}
              </p>
            </div>

            {/* 시기/타이밍 */}
            <div className={styles.themeItem}>
              <div className={styles.themeHeader}>
                <span className={styles.themeIcon}>⏰</span>
                <span className={styles.themeLabel}>
                  {translate("iching.timing", "Timing & Action")}
                </span>
              </div>
              <p className={styles.themeText}>
                {premiumData.themes.timing[lang]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Advice - 실천 가능한 조언 */}
      {enhancedData?.actionableAdvice && (
        <div className={styles.actionableCard}>
          <div className={styles.actionableHeader}>
            <span className={styles.actionableIcon}>🎯</span>
            <h3 className={styles.actionableTitle}>
              {translate("iching.actionableAdvice", "Actionable Advice")}
            </h3>
          </div>

          <div className={styles.actionableGrid}>
            {/* 해야 할 것 */}
            <div className={styles.adviceBox}>
              <div className={styles.adviceBoxHeader}>
                <span className={styles.adviceIcon}>✅</span>
                <span className={styles.adviceLabel}>
                  {translate("iching.doThis", "Do This")}
                </span>
              </div>
              <ul className={styles.adviceList}>
                {enhancedData.actionableAdvice.dos.map((item, idx) => (
                  <li key={idx} className={styles.adviceItem}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 하지 말아야 할 것 */}
            <div className={styles.adviceBox}>
              <div className={styles.adviceBoxHeader}>
                <span className={styles.adviceIcon}>⛔</span>
                <span className={styles.adviceLabel}>
                  {translate("iching.dontDoThis", "Don't Do This")}
                </span>
              </div>
              <ul className={styles.adviceList}>
                {enhancedData.actionableAdvice.donts.map((item, idx) => (
                  <li key={idx} className={styles.adviceItem}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 타이밍 */}
          <div className={styles.timingBox}>
            <div className={styles.timingHeader}>
              <span className={styles.timingIcon}>⏰</span>
              <span className={styles.timingLabel}>
                {translate("iching.bestTiming", "Best Timing")}
              </span>
            </div>
            <p className={styles.timingText}>{enhancedData.actionableAdvice.timing}</p>
          </div>

          {/* 다음 단계 */}
          <div className={styles.nextStepsBox}>
            <div className={styles.nextStepsHeader}>
              <span className={styles.nextStepsIcon}>📋</span>
              <span className={styles.nextStepsLabel}>
                {translate("iching.nextSteps", "Next Steps")}
              </span>
            </div>
            <ol className={styles.nextStepsList}>
              {enhancedData.actionableAdvice.nextSteps.map((step, idx) => (
                <li key={idx} className={styles.nextStepItem}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Situation Templates - 상황별 맞춤 조언 */}
      {enhancedData?.situationTemplates && question && (
        <div className={styles.situationCard}>
          <div className={styles.situationHeader}>
            <span className={styles.situationIcon}>💬</span>
            <h3 className={styles.situationTitle}>
              {translate("iching.yourQuestion", "Your Question")}
            </h3>
          </div>
          <p className={styles.questionText}>"{question}"</p>

          <div className={styles.situationAdvice}>
            <div className={styles.situationLabel}>
              {translate("iching.detailedAdvice", "Detailed Advice")}
            </div>
            {/* This would need question type detection or user selection */}
            {/* For now showing career as example */}
            <p className={styles.situationAnswer}>
              {enhancedData.situationTemplates.career.advice}
            </p>
            {enhancedData.situationTemplates.career.warning && (
              <div className={styles.situationWarning}>
                ⚠️ {enhancedData.situationTemplates.career.warning}
              </div>
            )}
            {enhancedData.situationTemplates.career.timeline && (
              <div className={styles.situationTimeline}>
                ⏱️ {enhancedData.situationTemplates.career.timeline}
              </div>
            )}
            <div className={styles.situationActionItems}>
              <div className={styles.actionItemsLabel}>
                {translate("iching.actionItems", "Action Items")}
              </div>
              <ul className={styles.actionItemsList}>
                {enhancedData.situationTemplates.career.actionItems.map((item, idx) => (
                  <li key={idx} className={styles.actionItemsItem}>
                    <span className={styles.actionItemCheck}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 행운 정보 & 호괘 섹션 */}
      {(luckyInfo || nuclearHexagram) && (
        <div className={styles.insightCard}>
          <div className={styles.insightHeader}>
            <span className={styles.insightIcon}>🔮</span>
            <h3 className={styles.insightTitle}>
              {translate("iching.deeperInsight", "Deeper Insight")}
            </h3>
          </div>

          <div className={styles.insightGrid}>
            {/* 행운의 색 */}
            {luckyInfo && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>🎨</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.luckyColors", "Lucky Colors")}
                  </span>
                </div>
                <div className={styles.luckyColors}>
                  {luckyInfo.colors[lang].map((color, idx) => (
                    <span key={idx} className={styles.luckyColorTag}>{color}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 행운의 숫자 */}
            {luckyInfo && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>🔢</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.luckyNumbers", "Lucky Numbers")}
                  </span>
                </div>
                <div className={styles.luckyNumbers}>
                  {luckyInfo.numbers.map((num, idx) => (
                    <span key={idx} className={styles.luckyNumberTag}>{num}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 길방 */}
            {luckyInfo && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>🧭</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.luckyDirection", "Lucky Direction")}
                  </span>
                </div>
                <p className={styles.insightItemText}>
                  {luckyInfo.direction[lang]}
                </p>
              </div>
            )}

            {/* 호괘 (Nuclear Hexagram) */}
            {nuclearHexagram && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>🔄</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.nuclearHexagram", "Nuclear Hexagram")}
                  </span>
                </div>
                <p className={styles.insightItemText}>
                  {translate("iching.nuclearHexagramDesc", "Inner structure")}: {lang === "ko" ? nuclearHexagram.name_ko : nuclearHexagram.name_en}
                </p>
              </div>
            )}

            {/* 착괘 (Opposite) */}
            {relatedHexagrams?.opposite && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>⚖️</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.oppositeHexagram", "Opposite Hexagram")}
                  </span>
                </div>
                <p className={styles.insightItemText}>
                  {translate("iching.oppositeDesc", "Complementary energy")}: {lang === "ko" ? relatedHexagrams.opposite.name_ko : relatedHexagrams.opposite.name_en}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traditional Wisdom Section from ichingWisdom library */}
      {wisdomData && (
        <div className={styles.insightCard}>
          <div className={styles.insightHeader}>
            <span className={styles.insightIcon}>📜</span>
            <h3 className={styles.insightTitle}>
              {translate("iching.traditionalWisdom", "Traditional Wisdom")}
            </h3>
          </div>

          {/* 괘사 (Hexagram Statement) */}
          {wisdomData.gwaeSa && (
            <div className={styles.wisdomSection}>
              <div className={styles.wisdomLabel}>
                {translate("iching.gwaeSa", "Hexagram Statement")}
              </div>
              <p className={styles.wisdomGwaeSa}>{wisdomData.gwaeSa}</p>
              <p className={styles.wisdomMeaning}>{wisdomData.meaning}</p>
            </div>
          )}

          {/* 핵심 지혜 */}
          {wisdomData.coreWisdom && (
            <div className={styles.wisdomSection}>
              <div className={styles.wisdomLabel}>
                💡 {translate("iching.coreWisdom", "Core Wisdom")}
              </div>
              <p className={styles.wisdomCoreText}>{wisdomData.coreWisdom}</p>
            </div>
          )}

          {/* 주의사항 & 기회 */}
          <div className={styles.insightGrid}>
            {wisdomData.warnings && wisdomData.warnings.length > 0 && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>⚠️</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.warnings", "Warnings")}
                  </span>
                </div>
                <ul className={styles.wisdomList}>
                  {wisdomData.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {wisdomData.opportunities && wisdomData.opportunities.length > 0 && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>✨</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.opportunities", "Opportunities")}
                  </span>
                </div>
                <ul className={styles.wisdomList}>
                  {wisdomData.opportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sequence & Pattern Analysis from ichingPatterns */}
      {sequenceData && (
        <div className={styles.insightCard}>
          <div className={styles.insightHeader}>
            <span className={styles.insightIcon}>🔄</span>
            <h3 className={styles.insightTitle}>
              {translate("iching.sequenceAnalysis", "Sequence Analysis")}
            </h3>
          </div>

          <div className={styles.wisdomSection}>
            <div className={styles.wisdomLabel}>
              📍 {translate("iching.position", "Position in I Ching")}
            </div>
            <p className={styles.wisdomCoreText}>
              {lang === "ko"
                ? `제 ${sequenceData.position}괘 - ${sequenceData.lifecycleStage}`
                : `Hexagram #${sequenceData.position} - ${sequenceData.lifecycleStage}`}
            </p>
            <p className={styles.wisdomMeaning}>{sequenceData.sequenceMeaning}</p>
          </div>

          <div className={styles.insightGrid}>
            {sequenceData.前괘 && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>⬅️</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.preceding", "Preceding")}
                  </span>
                </div>
                <p className={styles.sequenceTransition}>
                  #{sequenceData.前괘.number} {sequenceData.前괘.name}
                </p>
              </div>
            )}
            {sequenceData.後괘 && (
              <div className={styles.insightItem}>
                <div className={styles.insightItemHeader}>
                  <span className={styles.insightItemIcon}>➡️</span>
                  <span className={styles.insightItemLabel}>
                    {translate("iching.following", "Following")}
                  </span>
                </div>
                <p className={styles.sequenceTransition}>
                  #{sequenceData.後괘.number} {sequenceData.後괘.name}
                </p>
              </div>
            )}
          </div>

          {xuguaPairData && (
            <div className={styles.wisdomSection}>
              <div className={styles.wisdomLabel}>
                🔗 {translate("iching.xuguaPair", "Xugua Pair")} ({xuguaPairData.relationship})
              </div>
              <p className={styles.wisdomMeaning}>
                {xuguaPairData.meaning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Changing Lines - Enhanced with detailed interpretation */}
      {result.changingLines.length > 0 && (
        <div className={styles.changingLinesCard}>
          <div className={styles.changingLinesHeader}>
            <span className={styles.changingLinesIcon}>✦</span>
            <h3 className={styles.changingLinesTitle}>
              {translate("iching.changingLines", "Changing Lines")}
            </h3>
          </div>
          <div className={styles.changingLinesList}>
            {result.changingLines.map((line: ChangingLine) => (
              <div key={line.index} className={styles.changingLineItem}>
                <div className={styles.changingLineHeader}>
                  <span className={styles.changingLineIndex}>
                    {lang === "ko" ? `${line.index + 1}효` : `Line ${line.index + 1}`}
                  </span>
                  {line.changing_hexagram_name && (
                    <span className={styles.changingTo}>
                      → {line.changing_hexagram_name}
                    </span>
                  )}
                </div>
                <div className={styles.changingLineText}>{line.text}</div>
                {line.interpretation && (
                  <div className={styles.changingLineInterpretation}>
                    {line.interpretation}
                  </div>
                )}
                {line.changing_interpretation && (
                  <div className={styles.changingDetailedInterpretation}>
                    <div className={styles.changingTransition}>
                      {line.changing_interpretation.transition}
                    </div>
                    <div className={styles.changingFromTo}>
                      {line.changing_interpretation.from_to}
                    </div>
                    <div className={styles.changingCoreMessage}>
                      💡 {line.changing_interpretation.core_message}
                    </div>
                    {line.changing_interpretation.practical_advice && line.changing_interpretation.practical_advice.length > 0 && (
                      <div className={styles.changingAdviceList}>
                        {line.changing_interpretation.practical_advice.map((advice, idx) => (
                          <span key={idx} className={styles.changingAdviceItem}>
                            {advice}
                          </span>
                        ))}
                      </div>
                    )}
                    {line.changing_interpretation.warning && (
                      <div className={styles.changingWarning}>
                        ⚠️ {line.changing_interpretation.warning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resulting Hexagram */}
      {result.resultingHexagram && (
        <div className={styles.resultingCard}>
          <div className={styles.resultingHeader}>
            <span className={styles.resultingIcon}>→</span>
            <h3 className={styles.resultingTitle}>
              {translate("iching.resulting", "Resulting Hexagram")}:{" "}
              {result.resultingHexagram.name}{" "}
              {result.resultingHexagram.symbol}
            </h3>
          </div>
          {resultingPremiumData && (
            <p className={styles.resultingSubtitle}>
              {resultingPremiumData.name_hanja} · {resultingPremiumData.element}
            </p>
          )}
          <p className={styles.resultingText}>
            {result.resultingHexagram.judgment}
          </p>
          {resultingPremiumData && (
            <div className={styles.resultingMeaning}>
              <div className={styles.sectionLabel}>
                {translate("iching.coreMeaning", "Core Meaning")}
              </div>
              <p className={styles.resultingMeaningText}>
                {resultingPremiumData.core_meaning[lang]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI Interpretation Section */}
      <div className={styles.aiInterpretationCard}>
        <div className={styles.aiHeader}>
          <span className={styles.aiIcon}>✨</span>
          <h3 className={styles.aiTitle}>
            {translate("iching.aiInterpretation", "AI Personalized Reading")}
          </h3>
          {aiStatus === "done" && (
            <span className={styles.aiSubtitle}>GPT-4o-mini</span>
          )}
        </div>

        {aiStatus === "idle" && (
          <button
            className={styles.aiStartButton}
            onClick={startAiInterpretation}
          >
            <span className={styles.aiButtonIcon}>🔮</span>
            {translate("iching.startAi", "Get AI Interpretation")}
          </button>
        )}

        {aiStatus === "loading" && (
          <div className={styles.aiLoadingState}>
            <div className={styles.aiLoadingDots}>
              <span className={styles.aiLoadingDot}></span>
              <span className={styles.aiLoadingDot}></span>
              <span className={styles.aiLoadingDot}></span>
            </div>
            <span className={styles.aiLoadingText}>
              {translate("iching.aiLoading", "Preparing your personalized reading...")}
            </span>
          </div>
        )}

        {(aiStatus === "streaming" || aiStatus === "done") && (
          <div className={styles.aiSectionContainer}>
            {/* Overview Section */}
            {(overviewText || currentSection === "overview") && (
              <div className={`${styles.aiSection} ${currentSection === "overview" ? styles.active : ""}`}>
                <div className={styles.aiSectionLabel}>
                  {translate("iching.overview", "Overall Interpretation")}
                </div>
                <div className={styles.aiSectionContent}>
                  {overviewText}
                  {currentSection === "overview" && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}

            {/* Changing Lines Section */}
            {(changingText || currentSection === "changing") && (
              <div className={`${styles.aiSection} ${currentSection === "changing" ? styles.active : ""}`}>
                <div className={styles.aiSectionLabel}>
                  {translate("iching.changingAnalysis", "Changing Lines Analysis")}
                </div>
                <div className={styles.aiSectionContent}>
                  {changingText}
                  {currentSection === "changing" && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}

            {/* Advice Section */}
            {(adviceText || currentSection === "advice") && (
              <div className={`${styles.aiSection} ${currentSection === "advice" ? styles.active : ""}`}>
                <div className={styles.aiSectionLabel}>
                  {translate("iching.practicalAdvice", "Practical Guidance")}
                </div>
                <div className={styles.aiSectionContent}>
                  {adviceText}
                  {currentSection === "advice" && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}
          </div>
        )}

        {aiStatus === "error" && (
          <div className={styles.aiError}>
            <p>{aiError || translate("iching.aiError", "An error occurred while generating the interpretation.")}</p>
            <button
              className={styles.aiStartButton}
              onClick={startAiInterpretation}
              style={{ marginTop: "1rem" }}
            >
              {translate("iching.retry", "Try Again")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;
