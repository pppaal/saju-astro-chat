"use client";

import React from "react";
// 수정된 Analyzer의 타입을 가져옵니다.
import type { DestinyResult } from "./Analyzer";
import styles from "@/app/destiny-map/result/result.module.css";
import Chat from "./Chat";

// 1. 이 함수는 더 이상 필요하지 않으므로 삭제합니다.
// 새로운 영문 리포트에는 '핵심 근거:'라는 특정 문자열이 없습니다.
// function extractEvidence(text: string) { ... }

export default function Display({ result }: { result: DestinyResult }) {
  // 2. UI 텍스트를 모두 영어로 변경합니다.
  const name = result.profile.name?.trim() || "User";
  
  // 3. 새로운 데이터 구조에 맞게 변수를 할당합니다.
  // 'highlights'는 현재 API 응답에 없으므로, 일단 빈 배열로 둡니다.
  // 추후 API를 수정하여 이 기능을 다시 추가할 수 있습니다.
  const chips: string[] = []; 
  const analysisText = result.interpretation || "Failed to load the analysis result.";

  // 4. Chat 컴포넌트에는 'evidence' 대신 전체 분석 내용을 'initialContext'로 전달합니다.
  const chatContext = analysisText;

  return (
    <div>
      <div className={styles.section}>
        <h2 className={styles.h2}>Hello, {name}</h2>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
          Here is your life path analysis (based on Saju/Astrology).
        </p>
      </div>

      {/* 칩(highlights) 기능은 데이터가 없으므로 자동으로 렌더링되지 않습니다. */}
      {chips.length > 0 && (
        <div className={styles.section}>
          {chips.map((h: string, i: number) => (
            <span key={i} className={styles.badge}>{h}</span>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.summary}>
          {/* [추천] AI가 생성한 Markdown을 제대로 표시하려면,
            <pre> 태그 대신 'react-markdown' 같은 라이브러리를 사용하는 것이 좋습니다.
          */}
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
            {analysisText}
          </pre>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.h2}>Ask a Follow-up Question</h3>
        {/* 5. Chat 컴포넌트에 새로운 props ('initialContext')를 전달합니다. */}
        <Chat profile={result.profile} initialContext={chatContext} />
      </div>
    </div>
  );
}