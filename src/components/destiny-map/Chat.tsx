// src/components/destiny-map/Chat.tsx

"use client";

import React from "react";

type LangKey = "en" | "ko" | "ja" | "zh" | "es";

const I18N = {
  en: { placeholder: "Ask precisely (when/why/what)…", send: "Send", thinking: "Analyzing…" },
  ko: { placeholder: "정확하게 질문해 보세요. (언제/왜/무엇)", send: "보내기", thinking: "분석 중…" },
  ja: { placeholder: "具体的に質問してください（いつ/なぜ/何を）", send: "送信", thinking: "分析中…" },
  zh: { placeholder: "请尽量具体地提问（何时/为何/做什么）", send: "发送", thinking: "分析中…" },
  es: { placeholder: "Haz una pregunta concreta (cuándo/por qué/qué)", send: "Enviar", thinking: "Analizando…" },
} as const;

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ✅ 상위 컴포넌트에서 유저정보를 전달받는 타입
type ChatProps = {
  profile: {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    city?: string;
    gender?: string;
    latitude?: number;
    longitude?: number;
  };
  initialContext?: string;
  lang?: LangKey;
  theme?: string;
  seedEvent?: string; // 추천 질문 브로드캐스트 이벤트명
};

export default function Chat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "focus_career",
  seedEvent = "chat:seed",
}: ChatProps) {
  const tr = I18N[lang] ?? I18N.ko;

  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // ✨ 추천 질문 → 입력창 주입
  React.useEffect(() => {
    const onSeed = (e: any) => {
      if (e?.detail && typeof e.detail === "string") {
        setInput(e.detail);
      }
    };
    window.addEventListener(seedEvent, onSeed);
    return () => window.removeEventListener(seedEvent, onSeed);
  }, [seedEvent]);

  /** ✅ 채팅 전송 핸들러 */
  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      // 🧭 백엔드와 실제 연동
      const res = await fetch("/api/destiny-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ✅ profile에서 필요한 값 추출
          name: profile.name,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          gender: profile.gender,
          theme,
          lang,
          extraPrompt: text, // 사용자가 입력한 질문
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // 백엔드가 { reply: string } 형태로 응답한다고 가정
      const reply: string =
        data.reply ??
        (lang === "ko"
          ? "답변을 받지 못했습니다. 잠시 후 다시 시도해 보세요."
          : "No response received. Try again later.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[Chat] send error:", e);
      const msg =
        lang === "ko"
          ? "답변 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "An error occurred. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  /** ⌨️ Enter 전송 핸들러 */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // 다크/라이트 대비 색상 팔레트
  const colors = {
    bgPanel: "var(--bg-elev, #0E1526)",
    border: "var(--border, #263043)",
    text: "var(--text, #E5E7EB)",
    assistantBg: "rgba(99, 102, 241, 0.16)",
    userBg: "transparent",
    inputBg: "var(--input-bg, #0B1220)",
    inputText: "var(--input-text, #E5E7EB)",
    buttonBg: "var(--btn, #2563EB)",
    buttonBgDisabled: "#1F2937",
    buttonText: "var(--btn-text, #FFFFFF)",
    thinkingBg: "rgba(148,163,184,0.12)",
  };

  return (
    <div>
      {/* 메세지 리스트 */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: 12,
          maxHeight: 300,
          overflowY: "auto",
          background: colors.bgPanel,
          color: colors.text,
        }}
      >
        {messages.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: 14, padding: 4 }}>
            {lang === "ko"
              ? "테마에 맞춰 질문하면 더 정확한 답을 드릴 수 있어요."
              : "Ask in the selected theme for more precise answers."}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "8px 10px",
              marginBottom: 8,
              borderRadius: 8,
              background: m.role === "assistant" ? colors.assistantBg : colors.userBg,
              border: m.role === "user" ? `1px dashed ${colors.border}` : "none",
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div
            style={{
              padding: "8px 10px",
              marginTop: 6,
              borderRadius: 8,
              background: colors.thinkingBg,
              fontSize: 14,
            }}
          >
            {tr.thinking}
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "stretch" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tr.placeholder}
          rows={2}
          style={{
            flex: 1,
            resize: "vertical",
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            background: colors.inputBg,
            color: colors.inputText,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            minWidth: 96,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "0 14px",
            background: loading || !input.trim() ? colors.buttonBgDisabled : colors.buttonBg,
            color: colors.buttonText,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {tr.send}
        </button>
      </div>
    </div>
  );
}