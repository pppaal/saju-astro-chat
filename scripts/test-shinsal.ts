/* eslint-disable no-console */
import {
  toSajuPillarsLike,
  annotateShinsal,
  getTwelveShinsalSingleByPillar,
  DEFAULT_ANNOTATE_OPTIONS,
} from '../src/lib/Saju/shinsal';
import type { FiveElement } from '../src/lib/Saju/types';

type FE = FiveElement;

// 기본 옵션 확인
console.log('DEFAULT_ANNOTATE_OPTIONS =', DEFAULT_ANNOTATE_OPTIONS);

// 예시 사주
const p = toSajuPillarsLike({
  yearPillar:  { heavenlyStem: { name: '乙', element: '목' as FE }, earthlyBranch: { name: '亥', element: '수' as FE } },
  monthPillar: { heavenlyStem: { name: '戊', element: '토' as FE }, earthlyBranch: { name: '寅', element: '목' as FE } },
  dayPillar:   { heavenlyStem: { name: '辛', element: '금' as FE }, earthlyBranch: { name: '未', element: '토' as FE } },
  timePillar:  { heavenlyStem: { name: '辛', element: '금' as FE }, earthlyBranch: { name: '卯', element: '목' as FE } },
});

console.log('Branches =', {
  time: p.time.earthlyBranch.name,
  day: p.day.earthlyBranch.name,
  month: p.month.earthlyBranch.name,
  year: p.year.earthlyBranch.name,
});

// 12신살 단일 표기 — 표 규칙(your) 사용
const single12 = getTwelveShinsalSingleByPillar(p, {
  includeTwelveAll: true,
  useMonthCompletion: false,
  ruleSet: 'your',
});
console.log('Single Twelve Shinsal =', single12);

// 상세 어노테이트 — 표 규칙(your) 사용
const annotOptions = {
  includeTwelveAll: true,
  useMonthCompletion: false,
  ruleSet: 'your',
} as const;
console.log('OPTIONS_USED =', annotOptions);

const annot = annotateShinsal(p, annotOptions);
console.log('Twelve Stages =', annot.twelveStage);

// byPillar 요약
console.log('byPillar =', JSON.stringify(annot.byPillar, null, 2));

// 개별 히트 전체 나열
console.log('Hits =');
for (const h of annot.hits) {
  console.log(' -', {
    kind: h.kind,
    pillars: h.pillars,
    target: h.target,
    detail: h.detail,
  });
}

/*
// 추가 케이스
const cases = [
  { label: 'Day 未, Time 卯', time: '卯', day: '未', month: '寅', year: '亥' },
  { label: 'Day 子, Time 酉', time: '酉', day: '子', month: '午', year: '卯' },
];
for (const c of cases) {
  const pp = toSajuPillarsLike({
    yearPillar:  { heavenlyStem: { name: '甲', element: '목' as FE }, earthlyBranch: { name: c.year as any,  element: '목' as FE } },
    monthPillar: { heavenlyStem: { name: '甲', element: '목' as FE }, earthlyBranch: { name: c.month as any, element: '목' as FE } },
    dayPillar:   { heavenlyStem: { name: '辛', element: '금' as FE }, earthlyBranch: { name: c.day as any,   element: '토' as FE } },
    timePillar:  { heavenlyStem: { name: '丙', element: '화' as FE }, earthlyBranch: { name: c.time as any,  element: '화' as FE } },
  });
  const s = getTwelveShinsalSingleByPillar(pp, { includeTwelveAll: true, useMonthCompletion: false, ruleSet: 'your' });
  console.log('[CASE]', c.label, '=>', s);
}
*/