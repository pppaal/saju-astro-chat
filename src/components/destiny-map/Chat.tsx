"use client";

import React, { useState, useTransition } from "react";

type Profile = { name: string; birthDate: string; birthTime: string; city: string; gender: string };
type LangKey = "en" | "ko" | "ja" | "zh" | "es";

const I18N: Record<
  LangKey,
  {
    title: string;
    placeholder: string;
    ask: string;
    thinking: string;
    suggestions: string[];
    domainPrompts: {
      early: string;
      career: string;
      love: string;
      money: string;
    };
    keywords: {
      early: string[];
      career: string[];
      love: string[];
      money: string[];
    };
    enforce: string;       // 언어 강제 지시
    enforceOutput: string; // 출력 원칙 강화
  }
> = {
  en: {
    title: "Ask a Follow-up Question",
    placeholder: "Ask with 'when/why/what' for more precise answers.",
    ask: "Ask",
    thinking: "Thinking...",
    suggestions: [
      "What were the key patterns of my early life (0–12)?",
      "Top 2 reasons for a career change in the next 3 months?",
      "My main conflict pattern in relationships and how to fix it?",
      "This month’s financial forecast: 2 opportunities, 1 risk?",
    ],
    domainPrompts: {
      early:
        "Topic: Early Life (0–20s). Required format: 2-line summary, 2–4 evidence blocks (evidence/interpretation/implication), 1-line cross-validation.",
      career:
        "Topic: Career/Branding. Required format: 2-line summary, 2 opportunities/1 risk with timing, 1-line strategy for role adjustment.",
      love:
        "Topic: Relationships/Love. Required format: 2-line summary, 2 patterns/1 caution with timing, 1 tip for boundary setting.",
      money:
        "Topic: Finances/Cash Flow. Required format: 2-line summary, 2 income levers/1 spending risk with timing, 1 actionable suggestion.",
    },
    keywords: {
      early: ["early", "childhood", "youth", "teen"],
      career: ["career", "job", "work", "brand", "role"],
      love: ["love", "relationship", "partner", "marriage"],
      money: ["money", "finance", "income", "cash", "spend", "budget"],
    },
    enforce:
      "Always respond ONLY in ENGLISH. Do not mix other languages. If the question is in another language, translate it and answer fully in ENGLISH.",
    enforceOutput: "Write the entire answer in ENGLISH only.",
  },
  ko: {
    title: "후속 질문하기",
    placeholder: "언제/왜/무엇을 포함해 정확하게 질문해 보세요.",
    ask: "질문",
    thinking: "생각 중...",
    suggestions: [
      "유년기(0–12)의 핵심 패턴은 무엇이었나요?",
      "향후 3개월 커리어 전환의 핵심 이유 2가지는?",
      "관계에서의 주요 갈등 패턴과 해결법은?",
      "이번 달 재무 전망: 기회 2개, 위험 1개?",
    ],
    domainPrompts: {
      early:
        "주제: 유년기/청소년기(0–20대). 형식: 2줄 요약, 2–4개 증거 블록(증거/해석/함의), 1줄 교차검증.",
      career:
        "주제: 커리어/브랜딩. 형식: 2줄 요약, 타이밍 포함 기회 2개/위험 1개, 역할 조정 전략 1줄.",
      love:
        "주제: 관계/연애. 형식: 2줄 요약, 타이밍 포함 패턴 2개/주의 1개, 경계 설정 팁 1개.",
      money:
        "주제: 재무/현금흐름. 형식: 2줄 요약, 수입 레버 2개/지출 위험 1개(타이밍 포함), 실행 제안 1개.",
    },
    keywords: {
      early: ["유년", "어릴", "초등", "청소년", "10대", "어린"],
      career: ["커리어", "직장", "이직", "업무", "브랜드", "역할"],
      love: ["사랑", "연애", "관계", "파트너", "결혼"],
      money: ["돈", "재무", "수입", "지출", "현금", "예산"],
    },
    enforce:
      "항상 한국어로만 답변하세요. 다른 언어를 섞지 마세요. 사용자가 다른 언어로 질문하면 한국어로 번역하여 한국어로만 답하세요.",
    enforceOutput: "전체 답변을 한국어로만 작성하세요.",
  },
  ja: {
    title: "追質問する",
    placeholder: "いつ/なぜ/何を を含めて具体的に質問してください。",
    ask: "送信",
    thinking: "考え中...",
    suggestions: [
      "幼少期(0–12)の主要なパターンは？",
      "今後3ヶ月のキャリア転機の理由トップ2は？",
      "関係における主な衝突パターンと対処法は？",
      "今月の財務見通し：チャンス2つ、リスク1つ？",
    ],
    domainPrompts: {
      early:
        "テーマ: 幼少期/若年期(0–20代)。形式: 2行サマリー、2–4の証拠ブロック（証拠/解釈/含意）、1行のクロス検証。",
      career:
        "テーマ: キャリア/ブランディング。形式: 2行サマリー、タイミング付きチャンス2/リスク1、役割調整の戦略1行。",
      love:
        "テーマ: 人間関係/恋愛。形式: 2行サマリー、タイミング付きパターン2/注意1、境界線のコツ1つ。",
      money:
        "テーマ: 財務/キャッシュフロー。形式: 2行サマリー、収入レバー2/支出リスク1（タイミング付き）、実行可能な提案1つ。",
    },
    keywords: {
      early: ["幼少", "子ども", "少年", "ティーン", "若年"],
      career: ["キャリア", "仕事", "職", "役割", "ブランド"],
      love: ["恋愛", "関係", "パートナー", "結婚"],
      money: ["お金", "財務", "収入", "支出", "現金", "予算"],
    },
    enforce:
      "常に日本語のみで回答してください。他の言語を混在させないでください。別の言語の質問は日本語に翻訳し、日本語のみで答えてください。",
    enforceOutput: "回答全体を日本語のみで記述してください。",
  },
  zh: {
    title: "继续提问",
    placeholder: "包含 何时/为何/何事 来更精准地提问。",
    ask: "发送",
    thinking: "思考中…",
    suggestions: [
      "幼年期(0–12)的关键模式是什么？",
      "未来3个月职业转变的两个主要原因？",
      "关系中的主要冲突模式与修复方法？",
      "本月财务展望：2个机会、1个风险？",
    ],
    domainPrompts: {
      early:
        "主题：早年/少年期（0–20岁）。格式：2行摘要，2–4个证据块（证据/解释/含义），1行交叉验证。",
      career:
        "主题：职业/品牌。格式：2行摘要，含时间点的2个机会/1个风险，1行角色调整策略。",
      love:
        "主题：关系/爱情。格式：2行摘要，含时间点的2个模式/1个注意事项，边界设定提示1条。",
      money:
        "主题：财务/现金流。格式：2行摘要，2个收入杠杆/1个支出风险（含时间点），1条可执行建议。",
    },
    keywords: {
      early: ["早年", "童年", "少年", "青少年"],
      career: ["职业", "工作", "品牌", "岗位", "角色"],
      love: ["恋爱", "关系", "伴侣", "婚姻"],
      money: ["钱", "财务", "收入", "支出", "现金", "预算"],
    },
    enforce:
      "请只用中文回答。不要混用其他语言。如果用户用其他语言提问，请先翻译成中文，并用中文完整作答。",
    enforceOutput: "整段答案请仅使用中文撰写。",
  },
  es: {
    title: "Haz una pregunta de seguimiento",
    placeholder: "Incluye cuándo/por qué/qué para preguntas más precisas.",
    ask: "Enviar",
    thinking: "Pensando...",
    suggestions: [
      "¿Cuáles fueron los patrones clave de mi infancia (0–12)?",
      "¿2 razones principales para un cambio de carrera en los próximos 3 meses?",
      "¿Mi patrón de conflicto en relaciones y cómo resolverlo?",
      "Pronóstico financiero de este mes: 2 oportunidades, 1 riesgo?",
    ],
    domainPrompts: {
      early:
        "Tema: Primera etapa de vida (0–20s). Formato: resumen en 2 líneas, 2–4 bloques de evidencia (evidencia/interpretación/implicación), 1 línea de validación cruzada.",
      career:
        "Tema: Carrera/Marca personal. Formato: resumen en 2 líneas, 2 oportunidades/1 riesgo con timing, 1 línea de estrategia para ajustar el rol.",
      love:
        "Tema: Relaciones/Amor. Formato: resumen en 2 líneas, 2 patrones/1 precaución con timing, 1 consejo para límites.",
      money:
        "Tema: Finanzas/Flujo de caja. Formato: resumen en 2 líneas, 2 palancas de ingreso/1 riesgo de gasto con timing, 1 sugerencia accionable.",
    },
    keywords: {
      early: ["infancia", "juventud", "niñez", "adolescencia"],
      career: ["carrera", "trabajo", "empleo", "marca", "rol"],
      love: ["amor", "relación", "pareja", "matrimonio"],
      money: ["dinero", "finanzas", "ingresos", "gastos", "flujo", "presupuesto"],
    },
    enforce:
      "Responde solo en ESPAÑOL. No mezcles otros idiomas. Si la pregunta está en otro idioma, tradúcela y contesta completamente en ESPAÑOL.",
    enforceOutput: "Escribe toda la respuesta solo en español.",
  },
};

type ChatProps = { profile: Profile; initialContext: string; lang?: LangKey };

export default function Chat({ profile, initialContext, lang = "en" }: ChatProps) {
  const tr = I18N[lang];
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  // 도메인 키 추출
  const pickDomainKey = (q: string): keyof typeof tr.domainPrompts => {
    const lower = q.toLowerCase();
    const hit = <T extends keyof typeof tr.keywords>(key: T) =>
      tr.keywords[key].some((kw) => lower.includes(kw.toLowerCase()));
    if (hit("career")) return "career";
    if (hit("love")) return "love";
    if (hit("money")) return "money";
    return "early";
  };

  const makePrompt = (q: string) => {
    const key = pickDomainKey(q);
    const directive = tr.domainPrompts[key];

    return `
You are a Destiny Map chat analyst. Answer based ONLY on the provided "Initial Analysis Context". Do not use general knowledge.
${tr.enforce}

User Profile: ${profile.name} / ${profile.birthDate} ${profile.birthTime} / ${profile.city} / ${profile.gender}

Initial Analysis Context:
---
${initialContext}
---

User's Question:
${q}

Domain Directive for this question:
${directive}

Output Principles:
- Cite evidence from the context.
- Use '-' bullets.
- Be concise and direct.
- ${tr.enforceOutput}
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
          body: JSON.stringify({ chatPrompt: makePrompt(q), profile, lang }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || res.statusText || "Request failed");
        const text = typeof j?.interpretation === "string" ? j.interpretation : "[Empty Response]";
        setMessages((m) => [...m, { role: "ai", text }]);
      } catch (e: any) {
        setMessages((m) => [...m, { role: "ai", text: `[Error] ${String(e?.message || e)}` }]);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3 style={{ margin: "6px 0 4px" }}>{tr.title}</h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tr.suggestions.map((s) => (
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
          placeholder={tr.placeholder}
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
          {pending ? tr.thinking : tr.ask}
        </button>
      </form>
    </div>
  );
}