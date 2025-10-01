// src/lib/personality/utils.ts
import { archetypeData, Archetype } from '@/lib/personality/data';

export function calculateResults(answers: { [key: number]: string }): { primary: Archetype; secondary: Archetype | null } {
  const scores: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0 };

  for (const questionId in answers) {
    const section = answers[questionId];
    if (section in scores) {
      scores[section]++;
    }
  }

  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  const getArchetypeBySection = (section: string): Archetype | undefined => {
    if (section === 'A') return archetypeData.find(a => a.archetype_name === 'The Director');
    if (section === 'B') return archetypeData.find(a => a.archetype_name === 'The Catalyst');
    if (section === 'C') return archetypeData.find(a => a.archetype_name === 'The Analyst');
    if (section === 'D') return archetypeData.find(a => a.archetype_name === 'The Harmonizer');
  };

  const primaryArchetype = getArchetypeBySection(sortedScores[0][0]);
  const secondaryArchetype = sortedScores[1] && sortedScores[1][1] > 0 ? getArchetypeBySection(sortedScores[1][0]) : null;

  if (!primaryArchetype) {
    throw new Error("Could not determine primary archetype.");
  }

  return {
    primary: primaryArchetype,
    secondary: secondaryArchetype || null,
  };
}