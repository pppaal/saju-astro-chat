import { useEffect, useState } from 'react'

/**
 * Rotate through a list of short prompts in a typewriter fashion —
 * each prompt types out one character at a time, holds for a beat,
 * deletes itself, and then the next one starts. Keeping the prompts
 * short keeps the textarea single-line on mobile (the original
 * "두 사람에 대해 깊이 있는 질문을 해보세요…" wrapped to two lines).
 */
export function useTypewriterPlaceholder(
  prompts: readonly string[],
  options: { typingMs?: number; deletingMs?: number; holdMs?: number } = {}
): string {
  const { typingMs = 75, deletingMs = 35, holdMs = 1600 } = options
  const [text, setText] = useState('')

  // Rejoin prompts into a stable key so the effect resets cleanly when
  // the locale (or any caller-supplied prompt list) changes.
  const promptsKey = prompts.join('|')

  useEffect(() => {
    if (prompts.length === 0) return
    let cancelled = false
    let promptIdx = 0
    let charIdx = 0
    let phase: 'typing' | 'holding' | 'deleting' = 'typing'
    let timer: ReturnType<typeof setTimeout> | undefined

    const step = () => {
      if (cancelled) return
      const current = prompts[promptIdx]

      if (phase === 'typing') {
        charIdx += 1
        setText(current.slice(0, charIdx))
        if (charIdx >= current.length) {
          phase = 'holding'
          timer = setTimeout(step, holdMs)
        } else {
          timer = setTimeout(step, typingMs)
        }
        return
      }

      if (phase === 'holding') {
        phase = 'deleting'
        timer = setTimeout(step, deletingMs)
        return
      }

      // deleting
      charIdx -= 1
      setText(current.slice(0, Math.max(0, charIdx)))
      if (charIdx <= 0) {
        phase = 'typing'
        promptIdx = (promptIdx + 1) % prompts.length
      }
      timer = setTimeout(step, deletingMs)
    }

    timer = setTimeout(step, typingMs)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptsKey, typingMs, deletingMs, holdMs])

  return text
}
