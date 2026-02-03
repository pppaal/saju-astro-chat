import { useState, useEffect } from 'react'

const RECENT_QUESTIONS_KEY = 'tarot_recent_questions'
const MAX_RECENT_QUESTIONS = 5

function getRecentQuestions(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_QUESTIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentQuestion(question: string) {
  if (typeof window === 'undefined' || !question.trim()) return
  try {
    const recent = getRecentQuestions()
    const filtered = recent.filter((q) => q !== question)
    const updated = [question, ...filtered].slice(0, MAX_RECENT_QUESTIONS)
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

/**
 * Hook to manage recent tarot questions in localStorage
 */
export function useRecentQuestions() {
  const [recentQuestions, setRecentQuestions] = useState<string[]>([])

  useEffect(() => {
    setRecentQuestions(getRecentQuestions())
  }, [])

  const addRecentQuestion = (question: string) => {
    saveRecentQuestion(question)
    setRecentQuestions(getRecentQuestions())
  }

  return { recentQuestions, addRecentQuestion }
}
