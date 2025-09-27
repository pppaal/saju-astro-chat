"use client";

import React, { useState, useTransition } from "react";

type Profile = { name: string; birthDate: string; birthTime: string; city: string; gender: string };
type ChatProps = { profile: Profile; evidence: string };

const domainPrompts: Record<string, string> = {
  early: `주제: 초년기(0~20대 초반).
필수 형식: 
- 2줄 요약
- 근거 블록 2~4개(근거/해석/시사점/타이밍)
- 마지막 1줄 교차검증`,
  career: `주제: 커리어/브랜딩.
필수 형식:
- 2줄 요약
- 기회2/리스크1 + 타이밍
- 역할/협업 조정전략 1줄`,
  love: `주제: 관계/사랑.
필수 형식:
- 2줄 요약
- 패턴2/주의1 + 타이밍
- 경계설정 팁 1줄`,
  money: `주제: 돈/현금흐름.
필수 형식:
- 2줄 요약
- 수입 레버2/지출 리스크1 + 타이밍
- 실행 제안 1줄`,
};

export default function Chat({ profile, evidence }: ChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  const makePrompt = (q: string) => {
    const key =
      q.includes("초년") ? "early" :
      q.includes("커리어") || q.includes("이직") ? "career" :
      q.includes("사랑") || q.includes("연애") || q.includes("관계") ? "love" :
      q.includes("돈") || q.includes("재정") ? "money" : "early";

    return `
너는 Destiny Map 채팅 분석가다. 일반론 금지, Evidence 인용 필수.
사용자: ${profile.name} / ${profile.birthDate} ${profile.birthTime} / ${profile.city} / ${profile.gender}

Evidence(핵심 근거):
${evidence}

사용자 질문:
${q}

도메인 지시:
${domainPrompts[key]}

출력 원칙:
- 근거 없는 성격 일반화 금지
- '-' bullet 사용
- 주/월 단위 타이밍
`.trim();
  };

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    startTransition(async () => {
      try {
        const res = await fetch("/api/destiny-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: makePrompt(q) }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || res.statusText || "Request failed");
        const text = typeof j?.text === "string" ? j.text : "[Empty]";
        setMessages((m) => [...m, { role: "ai", text }]);
      } catch (e: any) {
        setMessages((m) => [...m, { role: "ai", text: `[Error] ${String(e?.message || e)}` }]);
      }
    });
  };

  const suggestions = [
    "초년기(0~12세) 핵심 패턴과 근거는?",
    "3개월 내 커리어 전환 타이밍과 이유 2가지만",
    "관계 갈등 시 내 패턴과 조정전략은?",
    "이번 달 돈 흐름: 기회 2, 리스크 1?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.95)",
              fontSize: 12,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div
        style={{
          maxHeight: 340,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 6,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "rgba(88,139,255,0.2)" : "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "8px 10px",
              borderRadius: 10,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = input;
          setInput("");
          ask(q);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="언제/왜/무엇을 포함해 물어보면 더 정밀해요."
          style={{
            flex: 1,
            background: "rgba(10,16,28,0.8)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 12px",
            color: "white",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "linear-gradient(135deg, #ffd36a, #ffb347)",
            color: "#2b1d00",
            border: "none",
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "생각 중..." : "질문"}
        </button>
      </form>
    </div>
  );
}