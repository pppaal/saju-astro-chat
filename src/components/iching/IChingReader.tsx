"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IChingData } from "@/lib/iChing/iChingData";
import { IChingDataKo } from "@/lib/iChing/iChingData.ko";
import HexagramLine from "./HexagramLine";
import ResultDisplay from "@/components/iching/ResultDisplay";
import { IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./IChingReader.module.css";

type LineResult = { value: number; isChanging: boolean };
type DivinationStatus = "idle" | "drawing" | "finished";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const IChingReader: React.FC = () => {
  const { translate, locale } = useI18n();
  const { data: session } = useSession();
  const [result, setResult] = useState<IChingResult | null>(null);
  const [status, setStatus] = useState<DivinationStatus>("idle");
  const [drawnLines, setDrawnLines] = useState<LineResult[]>([]);
  const [question, setQuestion] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aiKey, setAiKey] = useState(0); // Key to force AI restart when lines change
  const aiRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [aiInterpretation, setAiInterpretation] = useState<{ overview: string; changing: string; advice: string } | null>(null);

  // Select data based on current locale
  const currentData = locale === 'ko' ? IChingDataKo : IChingData;

  const hexByBinary = useMemo(() => {
    const map = new Map<string, IChingResult["primaryHexagram"]>();
    currentData.forEach((h) => map.set(h.binary, h));
    return map;
  }, [currentData]);

  const handleDivination = async () => {
    setStatus("drawing");
    setResult(null);
    setDrawnLines([]);

    const lines: LineResult[] = [];
    let primaryBinary = "";
    let resultingBinary = "";

    for (let i = 0; i < 6; i++) {
      await delay(500);
      const sum =
        Math.floor(Math.random() * 2 + 2) +
        Math.floor(Math.random() * 2 + 2) +
        Math.floor(Math.random() * 2 + 2);

      let currentLine: LineResult;
      if (sum === 6) {
        currentLine = { value: 0, isChanging: true };
        primaryBinary += "0";
        resultingBinary += "1";
      } else if (sum === 7) {
        currentLine = { value: 1, isChanging: false };
        primaryBinary += "1";
        resultingBinary += "1";
      } else if (sum === 8) {
        currentLine = { value: 0, isChanging: false };
        primaryBinary += "0";
        resultingBinary += "0";
      } else {
        currentLine = { value: 1, isChanging: true };
        primaryBinary += "1";
        resultingBinary += "0";
      }

      lines.push(currentLine);
      setDrawnLines([...lines]);
    }

    await delay(500);

    const primaryHexagram = hexByBinary.get(primaryBinary);
    if (!primaryHexagram) {
      const fallbackHexagram =
        currentData[0] || { number: 0, binary: primaryBinary, name: "", symbol: "", judgment: "", image: "", lines: [] };
      setResult({
        primaryHexagram: fallbackHexagram,
        changingLines: [],
        error: "Could not find the corresponding hexagram. Please check the data.",
      });
      setStatus("finished");
      return;
    }

    const resultingHexagram =
      primaryBinary !== resultingBinary
        ? hexByBinary.get(resultingBinary)
        : undefined;

    const changingLines = lines
      .map((line, index) => ({ ...line, index }))
      .filter((line) => line.isChanging)
      .map((line) => ({
        index: line.index,
        text: primaryHexagram.lines[line.index],
      }));

    setResult({ primaryHexagram, changingLines, resultingHexagram });
    setStatus("finished");
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setDrawnLines([]);
    setQuestion("");
    setSaveStatus("idle");
    setAiKey(0);
    setAiInterpretation(null);
    // Clear any pending AI restart timer
    if (aiRestartTimerRef.current) {
      clearTimeout(aiRestartTimerRef.current);
      aiRestartTimerRef.current = null;
    }
  };

  // Toggle changing line status when user clicks on a line
  const toggleChangingLine = (index: number) => {
    if (status !== "finished" || !result?.primaryHexagram) return;

    const newLines = drawnLines.map((line, i) =>
      i === index ? { ...line, isChanging: !line.isChanging } : line
    );
    setDrawnLines(newLines);

    // Recalculate binary strings
    let primaryBinary = "";
    let resultingBinary = "";

    newLines.forEach(line => {
      const bit = line.value === 1 ? "1" : "0";
      primaryBinary += bit;
      // If changing, flip the bit for resulting hexagram
      if (line.isChanging) {
        resultingBinary += line.value === 1 ? "0" : "1";
      } else {
        resultingBinary += bit;
      }
    });

    // Get hexagrams
    const primaryHexagram = hexByBinary.get(primaryBinary);
    if (!primaryHexagram) return;

    const resultingHexagram =
      primaryBinary !== resultingBinary
        ? hexByBinary.get(resultingBinary)
        : undefined;

    // Recalculate changing lines
    const changingLines = newLines
      .map((line, idx) => ({ ...line, index: idx }))
      .filter((line) => line.isChanging)
      .map((line) => ({
        index: line.index,
        text: primaryHexagram.lines[line.index],
      }));

    setResult({ primaryHexagram, changingLines, resultingHexagram });
    setSaveStatus("idle"); // Reset save status since result changed

    // Debounce AI restart - wait 800ms after last toggle before restarting
    if (aiRestartTimerRef.current) {
      clearTimeout(aiRestartTimerRef.current);
    }
    setAiInterpretation(null); // Reset AI interpretation when lines change
    aiRestartTimerRef.current = setTimeout(() => {
      setAiKey(prev => prev + 1);
    }, 800);
  };

  const handleSave = async () => {
    if (!session || !result || !result.primaryHexagram) return;

    setSaveStatus("saving");
    try {
      // Build hexagram lines for display
      const hexagramLines = drawnLines.map(line => ({
        value: line.value,
        isChanging: line.isChanging
      }));

      const content = JSON.stringify({
        question,
        primaryHexagram: {
          number: result.primaryHexagram.number,
          name: result.primaryHexagram.name,
          symbol: result.primaryHexagram.symbol,
          binary: result.primaryHexagram.binary,
          judgment: result.primaryHexagram.judgment,
          image: result.primaryHexagram.image,
        },
        hexagramLines, // Save line data for visual display
        changingLines: result.changingLines,
        resultingHexagram: result.resultingHexagram ? {
          number: result.resultingHexagram.number,
          name: result.resultingHexagram.name,
          symbol: result.resultingHexagram.symbol,
          binary: result.resultingHexagram.binary,
          judgment: result.resultingHexagram.judgment,
        } : null,
        aiInterpretation: aiInterpretation || null, // Include AI interpretation
        locale,
        timestamp: new Date().toISOString(),
      });

      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "iching",
          title: `${result.primaryHexagram.name} ${result.primaryHexagram.symbol}`,
          content,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  // Handler for AI completion
  const handleAiComplete = useCallback((aiText: { overview: string; changing: string; advice: string }) => {
    setAiInterpretation(aiText);
  }, []);

  return (
    <div className={styles.readerContainer}>
      {/* Lines Display */}
      <div className={styles.linesContainer}>
        {(status === "drawing" || status === "finished") &&
          drawnLines.map((line, index) => (
            <div key={index} className={styles.lineWrapper}>
              <HexagramLine
                type={line.value === 1 ? "solid" : "broken"}
                isChanging={line.isChanging}
                clickable={status === "finished"}
                lineIndex={index}
                onClick={() => toggleChangingLine(index)}
                locale={locale}
              />
            </div>
          ))}
      </div>
      {status === "finished" && (
        <div className={styles.changingInfo}>
          <p className={styles.changingHint}>
            {translate("iching.changingHint", "Click on a line to toggle changing status")}
          </p>
          {drawnLines.filter(l => l.isChanging).length > 0 && (
            <p className={styles.changingCount}>
              {translate("iching.changingCount", "Changing lines")}: {drawnLines.filter(l => l.isChanging).length}
            </p>
          )}
        </div>
      )}

      {/* Idle State */}
      {status === "idle" && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            {translate(
              "iching.prompt",
              "Calm your mind and press the button to receive guidance."
            )}
          </p>
          <div className={styles.questionSection}>
            <label className={styles.questionLabel}>
              {translate("iching.question", "Your Question (Optional)")}
            </label>
            <textarea
              className={styles.questionInput}
              placeholder={translate("iching.questionPlaceholder", "What guidance do you seek?")}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
            />
          </div>
          <button onClick={handleDivination} className={styles.castButton}>
            {translate("iching.cast", "Cast Hexagram")}
          </button>
        </div>
      )}

      {/* Drawing State */}
      {status === "drawing" && (
        <div className={styles.statusContainer}>
          <p className={styles.statusText}>
            {translate("iching.casting", "Casting the lines")}
            <span className={styles.statusDots}>
              <span className={styles.statusDot}></span>
              <span className={styles.statusDot}></span>
              <span className={styles.statusDot}></span>
            </span>
          </p>
        </div>
      )}

      {/* Finished State */}
      {status === "finished" && (
        <>
          {question && (
            <div className={styles.questionDisplay}>
              <span className={styles.questionIcon}>❓</span>
              <p className={styles.questionText}>{question}</p>
            </div>
          )}
          <ResultDisplay key={aiKey} result={result} question={question} autoStartAi={true} onAiComplete={handleAiComplete} />
          <div className={styles.buttonGroup}>
            {session ? (
              <button
                onClick={handleSave}
                className={`${styles.saveButton} ${saveStatus === "saved" ? styles.saved : ""}`}
                disabled={saveStatus === "saving" || saveStatus === "saved" || !aiInterpretation}
              >
                {saveStatus === "saving" ? "..." :
                 saveStatus === "saved" ? translate("iching.saved", "Reading Saved") :
                 saveStatus === "error" ? translate("iching.saveError", "Failed to save") :
                 !aiInterpretation ? translate("iching.waitingAi", "Waiting for AI...") :
                 translate("iching.save", "Save Reading")}
              </button>
            ) : (
              <p className={styles.loginHint}>
                {translate("iching.loginToSave", "Log in to save your reading")}
              </p>
            )}
            <button onClick={reset} className={styles.resetButton}>
              {translate("iching.castAgain", "Cast Again")}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default IChingReader;
