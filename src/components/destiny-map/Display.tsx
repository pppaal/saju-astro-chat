"use client";

import React from "react";
import type { DestinyResult } from "./Analyzer";
import styles from "@/app/destiny-map/result/result.module.css";
import Chat from "./Chat";

function extractEvidence(text: string) {
  const m = text.match(/핵심 근거:[\s\S]*?(?=\n\s*교차검증:|$)/);
  return m ? m[0] : "";
}

export default function Display({ result }: { result: DestinyResult }) {
  const name = result.profile.name?.trim() || "사용자";
  const chips = result.gemini.highlights || [];
  const evidence = extractEvidence(result.gemini.text);

  return (
    <div>
      <div className={styles.section}>
        <h2 className={styles.h2}>{name} 안녕하세요</h2>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
          {name}의 인생은 이렇습니다 (사주/점성학 기반)
        </p>
      </div>

      {chips.length > 0 && (
        <div className={styles.section}>
          {chips.map((h, i) => (
            <span key={i} className={styles.badge}>{h}</span>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.summary}>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
            {result.gemini.text}
          </pre>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.h2}>바로 질문하기</h3>
        <Chat profile={result.profile} evidence={evidence} />
      </div>
    </div>
  );
}