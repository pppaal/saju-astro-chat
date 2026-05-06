type CounselorLang = 'ko' | 'en'

// Brand-voice was previously rewriting the model's first sentence with a fixed
// sailing metaphor and injecting a canned "예를 들어, 선택지 2~3개를 표로 놓고…"
// example into every action plan. That overrode the model's actual saju×astro
// reasoning with hardcoded copy, which is why answers read as off-topic.
// Pass-through now. Keeping the export for callers that wrap responses.
export function applyCounselorBrandVoice(text: string, _lang: CounselorLang): string {
  return text.trim()
}
