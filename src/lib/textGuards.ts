// NOTE: patterns are case-insensitive but intentionally NOT global. A
// global (/g) RegExp is stateful under `.test()` (it advances lastIndex),
// so reusing these shared instances across requests made `containsForbidden`
// miss matches intermittently. `guardText` adds the `g` flag locally where
// replace-all is actually needed.
export const FORBIDDEN_PATTERNS: RegExp[] = [
  // PII
  /\b(ssn|social security|passport|driver.?s license|phone number|contact number|address|email)\b/i,
  // Finance / investment
  /\b(loan|mortgage|stock|investment|bitcoin|crypto(?:currency)?|forex|options trading|brokerage)\b/i,
  // Medical
  /\b(diagnosis|prescription|medical advice|treatment plan|therapy|doctor|clinic|hospital)\b/i,
  // Gambling
  /\b(gambling|casino|betting|sportsbook|roulette|blackjack|poker)\b/i,
  // Self-harm
  /\b(self-harm|suicide|harm myself|kill myself|end my life)\b/i,
];

// v3.1: Increased to support full comprehensive data snapshot (~8-10KB)
export const PROMPT_BUDGET_CHARS = 15000;

export function cleanText(value: string, max = 1800) {
  return (value || "")
    .toString()
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[{}<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

export function guardText(value: string, max = 1800) {
  let txt = cleanText(value, max);
  for (const pat of FORBIDDEN_PATTERNS) {
    // Local global clone so every occurrence is filtered without mutating
    // the shared (non-global) pattern.
    txt = txt.replace(new RegExp(pat.source, "gi"), "[filtered]");
  }
  // Ensure result doesn't exceed max after replacements
  return txt.slice(0, max);
}

export function containsForbidden(value: string) {
  return FORBIDDEN_PATTERNS.some((pat) => pat.test(value));
}

export function safetyMessage(locale: string) {
  const l = String(locale || "en").toLowerCase();
  if (l.startsWith("ko")) {return "규제/민감 주제로 답변이 제한됩니다. 다른 주제로 질문해 주세요.";}
  if (l.startsWith("ja")) {return "規制・敏感なテーマのため回答を制限します。別の質問をしてください。";}
  if (l.startsWith("zh")) {return "该主题受限制，无法回答。请换个问题。";}
  if (l.startsWith("es")) {return "Tema restringido; no puedo responder. Pregunta sobre otra área.";}
  if (l.startsWith("fr")) {return "Sujet restreint : je ne peux pas répondre. Merci de poser une autre question.";}
  if (l.startsWith("de")) {return "Eingeschränktes Thema; bitte eine andere Frage stellen.";}
  if (l.startsWith("pt")) {return "Tópico restrito; faça outra pergunta.";}
  if (l.startsWith("ru")) {return "Тема ограничена правилами. Пожалуйста, спросите о другом.";}
  return "That topic can't be handled. Please ask about another area.";
}
