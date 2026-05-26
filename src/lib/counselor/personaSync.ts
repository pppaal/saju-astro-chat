import { prisma } from '@/lib/db/prisma'

// Sidebar shows the title in a narrow column on mobile — anything past
// ~30 chars wraps or clips. Trim whitespace, collapse runs of inner
// whitespace, and ellipsize.
const CHAT_TITLE_MAX = 30
export function truncateChatTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= CHAT_TITLE_MAX) return cleaned
  return `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

function mergeAndLimit(items: string[], max: number): string[] {
  return [...new Set(items.filter(Boolean))].slice(0, max)
}

function countOccurrences(items: string[]): Record<string, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

/**
 * Roll a turn's derived topics into PersonaMemory (dominantThemes / lastTopics
 * / sessionCount). Read by the push-notification personalizer. Shared by the
 * destiny session/save route and the compat chat-history route so persona
 * memory keeps updating regardless of which persistence path a counselor uses.
 */
export async function syncPersonaMemoryTopics(params: {
  userId: string
  memoryTopics: string[]
  incrementSessionCount: boolean
}) {
  const existingMemory = await prisma.personaMemory.findUnique({
    where: { userId: params.userId },
    select: {
      sessionCount: true,
      dominantThemes: true,
      lastTopics: true,
    },
  })

  const existingThemes = (existingMemory?.dominantThemes as string[] | null) || []
  const existingLastTopics = (existingMemory?.lastTopics as string[] | null) || []
  const dominantThemes = Object.entries(
    countOccurrences([...existingThemes, ...params.memoryTopics])
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)
  const lastTopics = mergeAndLimit([...params.memoryTopics, ...existingLastTopics], 5)

  await prisma.personaMemory.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      sessionCount: 1,
      dominantThemes,
      lastTopics,
    },
    update: {
      dominantThemes,
      lastTopics,
      ...(params.incrementSessionCount
        ? { sessionCount: { increment: 1 } }
        : { sessionCount: existingMemory?.sessionCount || 1 }),
    },
  })
}
