"use client";

import React, { useMemo, useState } from "react";
import { IChingData } from "@/lib/iChing/iChingData";
import HexagramLine from "./HexagramLine";
import ResultDisplay from "@/components/iching/ResultDisplay";
import { IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";

interface IChingReaderProps {
  onBack: () => void;
}

type LineResult = { value: number; isChanging: boolean };
type DivinationStatus = "idle" | "drawing" | "finished";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const IChingReader: React.FC<IChingReaderProps> = ({ onBack }) => {
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
    <div
      style={{
        color: "white",
        textAlign: "center",
        zIndex: 10,
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid white",
          color: "white",
          padding: "8px 12px",
          cursor: "pointer",
          borderRadius: "8px",
        }}
      >
        ◀ {translate("iching.back", "Back to Menu")}
      </button>

      <div
        style={{
          width: "100px",
          height: "200px",
          margin: "2rem auto",
          display: "flex",
          flexDirection: "column-reverse",
          justifyContent: "flex-start",
        }}
      >
        {(status === "drawing" || status === "finished") &&
          drawnLines.map((line, index) => (
            <HexagramLine
              key={index}
              type={line.value === 1 ? "solid" : "broken"}
              isChanging={line.isChanging}
            />
          ))}
      </div>

      {status === "idle" && (
        <>
          <p style={{ margin: "1rem 0" }}>
            {translate(
              "iching.prompt",
              "Calm your mind and press the button to receive guidance."
            )}
          </p>
          <button onClick={handleDivination} className="submit-button">
            {translate("iching.cast", "Cast Hexagram")}
          </button>
        </>
      )}

      {status === "drawing" && (
        <p>{translate("iching.casting", "Casting the lines...")}</p>
      )}

      {status === "finished" && (
        <>
          <ResultDisplay result={result} />
          <button
            onClick={reset}
            className="submit-button"
            style={{ marginTop: "2rem" }}
          >
            {translate("iching.castAgain", "Cast Again")}
          </button>
        </>
      )}
    </div>
  );
};

export default IChingReader;
