type CounselorLang = 'ko' | 'en'

function rewriteKoCounselor(text: string): string {
  let next = text
    .replace(/^## 한 줄 결론\s*\n([^\n]+)/m, (_match, line: string) => {
      const trimmed = line.trim()
      if (/같습니다|처럼/u.test(trimmed)) return `## 한 줄 결론\n${trimmed}`
      return `## 한 줄 결론\n지금 당신의 흐름은 바람보다 방향타가 더 중요한 항해와 같습니다. ${trimmed}`
    })
    .replace(/^## 근거\s*\n/m, '## 근거\n')
    .replace(/^## 실행 계획\s*\n/m, '## 실행 계획\n')
    .replace(/^## 주의\/재확인\s*\n/m, '## 주의/재확인\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!/예를 들어/u.test(next)) {
    next = next.replace(
      /(## 실행 계획\s*\n(?:.|\n)*?)(\n## 주의\/재확인)/u,
      `$1\n예를 들어, 선택지 2~3개를 표로 놓고 역할 범위, 금액, 에너지 소모를 같이 비교하면 판단이 훨씬 빨라집니다.\n$2`
    )
  }

  return next
}

export function applyCounselorBrandVoice(text: string, lang: CounselorLang): string {
  if (!text.trim()) return text
  if (lang === 'ko') return rewriteKoCounselor(text)
  return text
}
