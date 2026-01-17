/**
 * Direct test of question classifiers
 */

// Copy the exact same logic from questionClassifiers.ts
import {normalizeText} from '../src/lib/Tarot/utils/koreanTextNormalizer.ts';

const yesNoEndingPatterns = [
  /할까\??$/,
  /갈까\??$/,
  /볼까\??$/,
  /살까\??$/,
  /먹을까\??$/,
  /마실까\??$/,
  /만날까\??$/,
  /시작할까\??$/,
  /보낼까\??$/,
  /보여줄까\??$/,
  /연락할까\??$/,
  /고백할까\??$/,
  /키스할까\??$/,
  /뽀뽀할까\??$/,
  /염색할까\??$/,
];

function testPattern(question) {
  console.log(`\n테스트: "${question}"`);
  console.log(`  원본 매칭:`, yesNoEndingPatterns.some(p => p.test(question)));

  const normalized = normalizeText(question);
  console.log(`  정규화: "${normalized}"`);
  console.log(`  정규화 매칭:`, yesNoEndingPatterns.some(p => p.test(normalized)));
}

testPattern("오늘 운동갈까?");
testPattern("오늘운동갈까");
testPattern("개한테뽀뽀할까");
testPattern("라면먹을까");
