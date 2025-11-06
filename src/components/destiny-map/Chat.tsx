"use client";

import React, { useState, useTransition } from "react";

type Profile = { name: string; birthDate: string; birthTime: string; city: string; gender: string };

// 1. Props 이름을 'initialContext'로 사용합니다.
type ChatProps = { profile: Profile; initialContext: string };

// 2. 도메인별 지시사항을 영어로 정의합니다.
const domainPrompts: Record<string, string> = {
  early: `Topic: Early Life (0-20s). Required format: 2-line summary, 2-4 evidence blocks (evidence/interpretation/implication), 1-line cross-validation.`,
  career: `Topic: Career/Branding. Required format: 2-line summary, 2 opportunities/1 risk with timing, 1-line strategy for role adjustment.`,
  love: `Topic: Relationships/Love. Required format: 2-line summary, 2 patterns/1 caution with timing, 1 tip for boundary setting.`,
  money: `Topic: Finances/Cash Flow. Required format: 2-line summary, 2 income levers/1 spending risk with timing, 1 actionable suggestion.`,
};

export default function Chat({ profile, initialContext }: ChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  const makePrompt = (q: string) => {
    // 3. 질문에서 키워드를 찾을 때 영어 단어를 사용합니다.
    const key =
      q.toLowerCase().includes("early") ? "early" :
      q.toLowerCase().includes("career") || q.toLowerCase().includes("job") ? "career" :
      q.toLowerCase().includes("love") || q.toLowerCase().includes("relationship") ? "love" :
      q.toLowerCase().includes("money") || q.toLowerCase().includes("finance") ? "money" : "early";

    // 4. 프롬프트 전체를 영어로 구성하고 'initialContext'를 사용합니다.
    return `
You are a Destiny Map chat analyst. Answer based ONLY on the provided "Initial Analysis Context". Do not use general knowledge.

User Profile: ${profile.name} / ${profile.birthDate} ${profile.birthTime} / ${profile.city} / ${profile.gender}

Initial Analysis Context:
---
${initialContext} 
---

User's Question:
${q}

Domain Directive for this question:
${domainPrompts[key]}

Output Principles:
- Cite evidence from the context.
- Use '-' bullets.
- Be concise and direct.
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
          // 5. 백엔드에 '채팅' 요청임을 알리는 'chatPrompt'를 보냅니다.
          body: JSON.stringify({ chatPrompt: makePrompt(q), profile }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || res.statusText || "Request failed");
        // 6. 백엔드의 응답 필드('interpretation')에 맞춰 수정합니다.
        const text = typeof j?.interpretation === "string" ? j.interpretation : "[Empty Response]";
        setMessages((m) => [...m, { role: "ai", text }]);
      } catch (e: any) {
        setMessages((m) => [...m, { role: "ai", text: `[Error] ${String(e?.message || e)}` }]);
      }
    });
  };

  // 7. 추천 질문을 영어로 변경합니다.
  const suggestions = [
    "What were the key patterns of my early life (0-12)?",
    "Top 2 reasons for a career change in the next 3 months?",
    "My main conflict pattern in relationships and how to fix it?",
    "This month's financial forecast: 2 opportunities, 1 risk?",
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
          placeholder="Ask with 'when/why/what' for more precise answers."
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
          {pending ? "Thinking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}