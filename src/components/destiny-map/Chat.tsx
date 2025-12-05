// src/components/destiny-map/Chat.tsx

"use client";

import React from "react";

type LangKey = "en" | "ko" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru";

type Copy = {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  error: string;
  fallbackNote: string;
  safetyNote: string;
  noResponse: string;
};

const I18N: Record<LangKey, Copy> = {
  en: {
    placeholder: "Ask precisely (when/why/what)",
    send: "Send",
    thinking: "Analyzing...",
    empty: "Ask in the chosen theme for more precise answers.",
    error: "An error occurred. Please try again.",
    fallbackNote: "Using backup response (AI temporarily unavailable).",
    safetyNote: "Response limited due to policy restrictions.",
    noResponse: "No response received. Try again later.",
  },
  ko: {
    placeholder: "\uc5b8\uc81c/\uc65c/\ubb34\uc5c7\uc744 \uad6c\uccb4\uc801\uc73c\ub85c \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    send: "\ubcf4\ub0b4\uae30",
    thinking: "\ubd84\uc11d \uc911...",
    empty: "\uc120\ud0dd\ud55c \uc8fc\uc81c\uc5d0 \ub9de\ucdb0 \uc9c8\ubb38\ud558\uba74 \ub354 \uc815\ud655\ud558\uac8c \ub2f5\ubcc0\ud569\ub2c8\ub2e4.",
    error: "\uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    fallbackNote: "\ubc31\uc5c5 \uc751\ub2f5\uc73c\ub85c \ub300\uc2e0\ud569\ub2c8\ub2e4 (AI \uc77c\uc2dc \ubd88\uac00).",
    safetyNote: "\uc815\ucc45\uc0c1 \uc81c\ud55c\ub41c \ub2f5\ubcc0\uc785\ub2c8\ub2e4.",
    noResponse: "\uc751\ub2f5\uc744 \ubc1b\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
  },
  ja: {
    placeholder: "\u3044\u3064/\u306a\u305c/\u4f55\u3092\u3001\u3067\u304d\u308b\u3060\u3051\u5177\u4f53\u7684\u306b",
    send: "\u9001\u4fe1",
    thinking: "\u5206\u6790\u4e2d\u2026",
    empty: "\u9078\u3093\u3060\u30c6\u30fc\u30de\u3067\u805e\u304f\u3068\u3001\u3088\u308a\u6b63\u78ba\u306a\u7b54\u3048\u306b\u306a\u308a\u307e\u3059\u3002",
    error: "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
    fallbackNote: "\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u306e\u5fdc\u7b54\u3092\u8fd4\u3057\u307e\u3057\u305f\uff08AI\u4e00\u6642\u505c\u6b62\u4e2d\uff09\u3002",
    safetyNote: "\u30dd\u30ea\u30b7\u30fc\u4e0a\u3001\u56de\u7b54\u304c\u5236\u9650\u3055\u308c\u307e\u3059\u3002",
    noResponse: "\u5fdc\u7b54\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u3057\u3070\u3089\u304f\u3057\u3066\u304b\u3089\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
  },
  zh: {
    placeholder: "\u8bf7\u5177\u4f53\u8bf4\u660e\uff08\u4f55\u65f6/\u539f\u56e0/\u5185\u5bb9\uff09",
    send: "\u53d1\u9001",
    thinking: "\u5206\u6790\u4e2d\u2026",
    empty: "\u5728\u9009\u5b9a\u4e3b\u9898\u4e0b\u63d0\u95ee\uff0c\u4f1a\u66f4\u7cbe\u51c6\u3002",
    error: "\u53d1\u751f\u9519\u8bef\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
    fallbackNote: "\u8fd4\u56de\u4e86\u5907\u7528\u56de\u7b54\uff08AI\u6682\u4e0d\u53ef\u7528\uff09\u3002",
    safetyNote: "\u56e0\u7b56\u7565\u9650\u5236\uff0c\u56de\u7b54\u53d7\u9650\u3002",
    noResponse: "\u6682\u65e0\u56de\u590d\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
  },
  es: {
    placeholder: "Pregunta concreta (cuando/por que/que)",
    send: "Enviar",
    thinking: "Analizando...",
    empty: "Pregunta en el tema seleccionado para respuestas mas precisas.",
    error: "Ocurrio un error. Intentalo de nuevo.",
    fallbackNote: "Se uso respuesta de respaldo (IA temporalmente no disponible).",
    safetyNote: "Respuesta limitada por politica.",
    noResponse: "Sin respuesta. Intentalo mas tarde.",
  },
  fr: {
    placeholder: "Pose une question precise (quand/pourquoi/quoi)",
    send: "Envoyer",
    thinking: "Analyse...",
    empty: "Pose ta question dans le theme choisi pour plus de precision.",
    error: "Une erreur s'est produite. Reessaie.",
    fallbackNote: "Reponse de secours utilisee (IA momentaneamente indisponible).",
    safetyNote: "Reponse limitee par la politique.",
    noResponse: "Pas de reponse. Reessaie plus tard.",
  },
  de: {
    placeholder: "Frag prazise (wann/warum/was)",
    send: "Senden",
    thinking: "Analysiere...",
    empty: "Frage im gewahlten Thema fuer genauere Antworten.",
    error: "Es ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    fallbackNote: "Backup-Antwort verwendet (KI voruebergehend nicht verfuegbar).",
    safetyNote: "Antwort aus Richtliniengruenden eingeschraenkt.",
    noResponse: "Keine Antwort erhalten. Spaeter erneut versuchen.",
  },
  pt: {
    placeholder: "Pergunte de forma precisa (quando/por que/o que)",
    send: "Enviar",
    thinking: "Analisando...",
    empty: "Pergunte no tema escolhido para respostas mais precisas.",
    error: "Ocorreu um erro. Tente novamente.",
    fallbackNote: "Usando resposta de backup (IA temporariamente indisponivel).",
    safetyNote: "Resposta limitada por politica.",
    noResponse: "Nenhuma resposta. Tente novamente mais tarde.",
  },
  ru: {
    placeholder: "\u0421\u0444\u043e\u0440\u043c\u0443\u043b\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043e\u0447\u043d\u043e (\u043a\u043e\u0433\u0434\u0430/\u043f\u043e\u0447\u0435\u043c\u0443/\u0447\u0442\u043e)",
    send: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
    thinking: "\u0410\u043d\u0430\u043b\u0438\u0437...",
    empty: "\u0421\u043f\u0440\u0430\u0448\u0438\u0432\u0430\u0439\u0442\u0435 \u0432 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u0442\u0435\u043c\u0435 \u0434\u043b\u044f \u0431\u043e\u043b\u0435\u0435 \u0442\u043e\u0447\u043d\u044b\u0445 \u043e\u0442\u0432\u0435\u0442\u043e\u0432.",
    error: "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
    fallbackNote: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442 (\u0418\u0418 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d).",
    safetyNote: "\u041e\u0442\u0432\u0435\u0442 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d \u043f\u0440\u0430\u0432\u0438\u043b\u0430\u043c\u0438.",
    noResponse: "\u041d\u0435\u0442 \u043e\u0442\u0432\u0435\u0442\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.",
  },
};

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

type ApiResponse = {
  reply?: string;
  fallback?: boolean;
  safety?: boolean;
};

export default function Chat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "focus_career",
  seedEvent = "chat:seed",
}: ChatProps) {
  const tr = I18N[lang] ?? I18N.en;
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
  const [notice, setNotice] = React.useState<string | null>(null);
  const [usedFallback, setUsedFallback] = React.useState(false);

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
    setNotice(null);
    setUsedFallback(false);

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
      const data: ApiResponse = await res.json();

      const reply: string = data?.reply || tr.noResponse;
      if (data?.safety) setNotice(tr.safetyNote);
      setUsedFallback(Boolean(data?.fallback));

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[Chat] send error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: tr.error }]);
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
    noticeBg: "rgba(251, 191, 36, 0.12)",
    noticeBorder: "rgba(251, 191, 36, 0.6)",
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
        {notice && (
          <div
            style={{
              padding: "8px 10px",
              marginBottom: 8,
              borderRadius: 8,
              background: colors.noticeBg,
              border: `1px solid ${colors.noticeBorder}`,
              fontSize: 13,
            }}
          >
            {notice}
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: 14, padding: 4 }}>{tr.empty}</div>
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

      {usedFallback && (
        <div style={{ marginTop: 6, fontSize: 12, color: colors.text, opacity: 0.8 }}>
          {tr.fallbackNote}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: colors.text, opacity: 0.8 }}>
        <label
          style={{ display: "inline-block", padding: "6px 10px", border: `1px solid ${colors.border}`, borderRadius: 8, cursor: "pointer" }}
        >
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
