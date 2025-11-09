"use client";

import React from "react";
import type { DestinyResult } from "./Analyzer";
import styles from "@/app/destiny-map/result/result.module.css";
import Chat from "./Chat";

// 5개 언어용 간단 i18n
const I18N = {
  en: {
    hello: (name: string) => `Hello, ${name}`,
    intro: "Here is your life path analysis (based on Saju/Astrology).",
    followup: "Ask a Follow-up Question",
    userFallback: "User",
    analysisFallback: "Failed to load the analysis result.",
  },
  ko: {
    hello: (name: string) => `안녕하세요, ${name}`,
    intro: "사주/점성술 기반의 삶의 길 분석입니다.",
    followup: "후속 질문하기",
    userFallback: "사용자",
    analysisFallback: "분석 결과를 불러오지 못했습니다.",
  },
  ja: {
    hello: (name: string) => `こんにちは、${name} さん`,
    intro: "四柱推命／占星術に基づくライフパス分析です。",
    followup: "追質問する",
    userFallback: "ユーザー",
    analysisFallback: "分析結果の読み込みに失敗しました。",
  },
  zh: {
    hello: (name: string) => `你好，${name}`,
    intro: "基于四柱／西方占星的生命路径分析。",
    followup: "继续提问",
    userFallback: "用户",
    analysisFallback: "无法加载分析结果。",
  },
  es: {
    hello: (name: string) => `Hola, ${name}`,
    intro: "Análisis de tu camino de vida (basado en Saju/Astrología).",
    followup: "Haz una pregunta de seguimiento",
    userFallback: "Usuario",
    analysisFallback: "No se pudo cargar el resultado del análisis.",
  },
} as const;

type LangKey = keyof typeof I18N;

type DisplayProps = {
  result: DestinyResult;
  lang?: LangKey;
};

export default function Display({ result, lang = "en" }: DisplayProps) {
  const tr = I18N[lang] ?? I18N.en;

  // 이름 및 분석 텍스트
  const name = result.profile.name?.trim() || tr.userFallback;
  const analysisText = result.interpretation || tr.analysisFallback;

  // 칩 데이터(현재 없음)
  const chips: string[] = [];

  // 채팅 컨텍스트: 전체 분석 텍스트를 전달
  const chatContext = analysisText;

  return (
    <div>
      <div className={styles.section}>
        <h2 className={styles.h2}>{tr.hello(name)}</h2>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
          {tr.intro}
        </p>
      </div>

      {chips.length > 0 && (
        <div className={styles.section}>
          {chips.map((h: string, i: number) => (
            <span key={i} className={styles.badge}>{h}</span>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.summary}>
          {/* Markdown을 쓰려면 react-markdown으로 교체 가능 */}
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
            {analysisText}
          </pre>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.h2}>{tr.followup}</h3>
        {/* Chat에도 lang 전달해서 채팅 UI/응답 언어 일치 */}
        <Chat profile={result.profile} initialContext={chatContext} lang={lang} />
      </div>
    </div>
  );
}