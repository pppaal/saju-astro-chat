"use client";

import React, { useMemo, useState } from "react";
import { IChingData } from "@/lib/iChing/iChingData";
import HexagramLine from "./HexagramLine";
import ResultDisplay from "@/components/iching/ResultDisplay";
import { IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./IChingReader.module.css";

type LineResult = { value: number; isChanging: boolean };
type DivinationStatus = "idle" | "drawing" | "finished";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const IChingReader: React.FC = () => {
  const { translate } = useI18n();
  const [result, setResult] = useState<IChingResult | null>(null);
  const [status, setStatus] = useState<DivinationStatus>("idle");
  const [drawnLines, setDrawnLines] = useState<LineResult[]>([]);

  const hexByBinary = useMemo(() => {
    const map = new Map<string, IChingResult["primaryHexagram"]>();
    IChingData.forEach((h) => map.set(h.binary, h));
    return map;
  }, []);

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
      setResult({
        primaryHexagram: undefined as any,
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
  };

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
              />
            </div>
          ))}
      </div>

      {/* Idle State */}
      {status === "idle" && (
        <div className={styles.promptSection}>
          <p className={styles.promptText}>
            {translate(
              "iching.prompt",
              "Calm your mind and press the button to receive guidance."
            )}
          </p>
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
          <ResultDisplay result={result} />
          <button onClick={reset} className={styles.resetButton}>
            {translate("iching.castAgain", "Cast Again")}
          </button>
        </>
      )}
    </div>
  );
};

export default IChingReader;
