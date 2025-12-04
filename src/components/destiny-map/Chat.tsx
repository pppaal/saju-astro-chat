// src/components/destiny-map/Chat.tsx

"use client";

import React from "react";

type LangKey = "en" | "ko" | "ja" | "zh" | "es";

const I18N = {
  en: { placeholder: "Ask precisely (when/why/what)", send: "Send", thinking: "Analyzing..." },
  ko: { placeholder: "언제/이유/무엇을 구체적으로 적어주세요", send: "보내기", thinking: "분석 중..." },
  ja: { placeholder: "いつ/理由/何を 具体的に入力してください", send: "送信", thinking: "分析中..." },
  zh: { placeholder: "请具体描述（何时/原因/什么）", send: "发送", thinking: "分析中..." },
  es: { placeholder: "Pregunta concreta (cuándo/por qué/qué)", send: "Enviar", thinking: "Analizando..." },
} as const;

type Message = { role: "system" | "user" | "assistant"; content: string };

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
  seedEvent?: string;
};

type ChatRequest = {
  profile: ChatProps["profile"];
  theme: string;
  lang: LangKey;
  messages: Message[];
};

export default function Chat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "focus_career",
  seedEvent = "chat:seed",
}: ChatProps) {
  const tr = I18N[lang] ?? I18N.ko;
  const sessionIdRef = React.useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [cvText, setCvText] = React.useState("");
  const [cvName, setCvName] = React.useState("");

  React.useEffect(() => {
    const onSeed = (e: any) => {
      if (e?.detail && typeof e.detail === "string") {
        setInput(e.detail);
      }
    };
    window.addEventListener(seedEvent, onSeed);
    return () => window.removeEventListener(seedEvent, onSeed);
  }, [seedEvent]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user" as const, content: text }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");

    const payload: ChatRequest = {
      profile,
      theme,
      lang,
      messages: nextMessages,
    };

    try {
      const res = await fetch("/api/destiny-map/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionIdRef.current,
        },
        body: JSON.stringify({
          ...payload,
          name: profile.name,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          gender: profile.gender,
          city: profile.city,
          cvText,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const reply: string =
        data.reply ??
        (lang === "ko"
          ? "응답이 없어요. 잠시 후 다시 시도해 주세요."
          : "No response received. Try again later.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[Chat] send error:", e);
      const msg =
        lang === "ko"
          ? "지금은 답변이 어려워요. 잠시 후 다시 시도해 주세요."
          : "An error occurred. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
              ? "테마를 선택하고 구체적으로 질문할수록 정확도가 올라갑니다."
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

      <div style={{ marginTop: 8, fontSize: 12, color: colors.text, opacity: 0.8 }}>
        <label style={{ display: "inline-block", padding: "6px 10px", border: `1px solid ${colors.border}`, borderRadius: 8, cursor: "pointer" }}>
          Upload CV (.txt)
          <input
            type="file"
            accept=".txt,.md,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCvName(file.name);
              const reader = new FileReader();
              reader.onload = () => {
                const text = typeof reader.result === "string" ? reader.result : "";
                setCvText(text.slice(0, 4000));
              };
              reader.readAsText(file);
            }}
          />
        </label>
        {cvName && <span style={{ marginLeft: 8 }}>Attached: {cvName}</span>}
      </div>
    </div>
  );
}
