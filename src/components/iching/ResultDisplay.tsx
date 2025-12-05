import React from "react";
import { ChangingLine, IChingResult } from "@/components/iching/types";
import { useI18n } from "@/i18n/I18nProvider";

interface ResultDisplayProps {
  result: IChingResult | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { translate } = useI18n();
  if (!result) return null;
  if (result.error) return <p style={{ color: "red" }}>{result.error}</p>;

  return (
    <div
      style={{
        marginTop: "1rem",
        background: "rgba(0,0,0,0.3)",
        padding: "1.5rem",
        borderRadius: "8px",
        textAlign: "left",
        backdropFilter: "blur(5px)",
      }}
    >
      <h2>
        {translate("iching.today", "Today's Hexagram")}:{" "}
        {result.primaryHexagram.name} {result.primaryHexagram.symbol}
      </h2>
      <p style={{ marginTop: "1rem" }}>
        <strong>[{translate("iching.judgment", "Judgment")}]</strong>{" "}
        {result.primaryHexagram.judgment}
      </p>
      <p style={{ marginTop: "0.5rem", color: "#ccc" }}>
        <strong>[{translate("iching.image", "Image")}]</strong>{" "}
        {result.primaryHexagram.image}
      </p>

      {result.changingLines.length > 0 && (
        <div
          style={{
            marginTop: "1.5rem",
            borderTop: "1px solid #444",
            paddingTop: "1.5rem",
          }}
        >
          <h3 style={{ color: "#ffdd00" }}>
            [{translate("iching.changingLines", "Changing Lines")}]
          </h3>
          {result.changingLines.map((line: ChangingLine) => (
            <p key={line.index} style={{ marginTop: "0.5rem" }}>
              - {line.text}
            </p>
          ))}
        </div>
      )}

      {result.resultingHexagram && (
        <div
          style={{
            marginTop: "1.5rem",
            borderTop: "1px solid #444",
            paddingTop: "1.5rem",
          }}
        >
          <h3>
            [
            {translate(
              "iching.resulting",
              "Resulting Hexagram"
            )}: {result.resultingHexagram.name}{" "}
            {result.resultingHexagram.symbol}]
          </h3>
          <p style={{ marginTop: "0.5rem" }}>
            {result.resultingHexagram.judgment}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
