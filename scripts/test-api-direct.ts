/**
 * Test the classifiers directly in TypeScript to see if they work
 */

import { isYesNoQuestion } from '../src/lib/Tarot/questionClassifiers';

const testQuestions = [
  "오늘 운동갈까?",
  "오늘운동갈까",
  "개한테뽀뽀할까",
  "라면먹을까",
  "언제 운동할까?",
];

console.log("Testing isYesNoQuestion directly:\n");

for (const question of testQuestions) {
  const result = isYesNoQuestion(question);
  console.log(`"${question}" → ${result}`);
}
