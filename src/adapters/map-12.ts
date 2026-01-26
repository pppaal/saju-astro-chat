import type { FiveElement, PillarData } from '@/lib/Saju/types';
import {
  annotateShinsal,
  toSajuPillarsLike,
  getJijangganText,
  type SajuPillarsAdapterInput,
} from '@/lib/Saju/shinsal';

export interface PillarSide {
  jijanggan?: string;
  twelveStage?: string;
  twelveShinsal?: string;
  lucky?: string[];
}
export interface PillarView {
  year?: PillarSide;
  month?: PillarSide;
  day?: PillarSide;
  time?: PillarSide;
}

// 길성 칸에 노출할 라벨 집합(normalizeLabel 적용 "후" 문자열 기준)
const KILSUNG_SET = new Set<string>([
  // 귀인/성 계열(접미사 없음)
  '천을귀인', '태극귀인', '금여성', '천문성', '문창', '문곡',
  // 길성 칸에 함께 보여주고 싶은 일반 신살(접미사 '살' 붙음)
  '도화살', '화개살', '현침살', '귀문관살', '고신살', '역마살',
  // 필요 시 커스텀 라벨
  '관귀학관',
]);

// 유연한 입력 추출 헬퍼(현재 전달 구조가 일정치 않을 수 있어 방어적으로 처리)
interface UnknownPillar {
  heavenlyStem?: { name?: string; element?: FiveElement };
  stem?: { name?: string; element?: FiveElement } | string;
  earthlyBranch?: { name?: string; element?: FiveElement };
  branch?: { name?: string; element?: FiveElement } | string;
  gan?: string;
  천간?: string;
  간?: string;
  ji?: string;
  지지?: string;
  지?: string;
}

function extractStemName(p?: UnknownPillar): string {
  return (
    p?.heavenlyStem?.name ??
    (typeof p?.stem === 'object' ? p.stem.name : p?.stem) ??
    p?.gan ??
    p?.천간 ??
    p?.간 ??
    ''
  );
}
function extractBranchName(p?: UnknownPillar): string {
  return (
    p?.earthlyBranch?.name ??
    (typeof p?.branch === 'object' ? p.branch.name : p?.branch) ??
    p?.ji ??
    p?.지지 ??
    p?.지 ??
    ''
  );
}
interface UnknownPillarSet {
  year?: UnknownPillar;
  month?: UnknownPillar;
  day?: UnknownPillar;
  time?: UnknownPillar;
  연주?: UnknownPillar;
  월주?: UnknownPillar;
  일주?: UnknownPillar;
  시주?: UnknownPillar;
}

function extractElement(p: UnknownPillar, type: 'stem' | 'branch'): FiveElement {
  if (type === 'stem') {
    return (
      p?.heavenlyStem?.element ??
      (typeof p?.stem === 'object' ? p.stem.element : undefined) ??
      'Wood'
    ) as FiveElement;
  }
  return (
    p?.earthlyBranch?.element ??
    (typeof p?.branch === 'object' ? p.branch.element : undefined) ??
    'Wood'
  ) as FiveElement;
}

function buildInputFromUnknown(byPillar: UnknownPillarSet): SajuPillarsAdapterInput {
  const y = byPillar?.year ?? byPillar?.연주 ?? {};
  const m = byPillar?.month ?? byPillar?.월주 ?? {};
  const d = byPillar?.day ?? byPillar?.일주 ?? {};
  const t = byPillar?.time ?? byPillar?.시주 ?? {};

  const yearPillar = {
    heavenlyStem: { name: extractStemName(y), element: extractElement(y, 'stem') },
    earthlyBranch: { name: extractBranchName(y), element: extractElement(y, 'branch') },
  };
  const monthPillar = {
    heavenlyStem: { name: extractStemName(m), element: extractElement(m, 'stem') },
    earthlyBranch: { name: extractBranchName(m), element: extractElement(m, 'branch') },
  };
  const dayPillar = {
    heavenlyStem: { name: extractStemName(d), element: extractElement(d, 'stem') },
    earthlyBranch: { name: extractBranchName(d), element: extractElement(d, 'branch') },
  };
  const timePillar = {
    heavenlyStem: { name: extractStemName(t), element: extractElement(t, 'stem') },
    earthlyBranch: { name: extractBranchName(t), element: extractElement(t, 'branch') },
  };
  return { yearPillar, monthPillar, dayPillar, timePillar };
}

interface KnownPillarSet {
  year: PillarData;
  month: PillarData;
  day: PillarData;
  time: PillarData;
}

export function buildPillarView(source?: UnknownPillarSet | KnownPillarSet): PillarView {
  if (!source) {return {};}

  const looksLikeRaw =
    source?.year?.heavenlyStem?.name &&
    source?.year?.earthlyBranch?.name &&
    source?.month?.heavenlyStem?.name &&
    source?.day?.heavenlyStem?.name &&
    source?.time?.heavenlyStem?.name;

  const input: SajuPillarsAdapterInput = looksLikeRaw
    ? {
        yearPillar: source.year as SajuPillarsAdapterInput['yearPillar'],
        monthPillar: source.month as SajuPillarsAdapterInput['monthPillar'],
        dayPillar: source.day as SajuPillarsAdapterInput['dayPillar'],
        timePillar: source.time as SajuPillarsAdapterInput['timePillar'],
      }
    : buildInputFromUnknown(source);

  const p = toSajuPillarsLike(input);
  const annot = annotateShinsal(p, { ruleSet: 'your' });

  // lucky/generalShinsal 합쳐 들어온 항목들의 접미사를 통일
  // - 귀인/성 계열: 그대로
  // - 그 외: '살' 접미사 부여
  const normalizeLabel = (s: string) => {
    const pure = String(s || '').replace(/살$/g, '');
    if (['천을귀인','태극귀인','금여성','천문성','문창','문곡'].includes(pure)) {return pure;}
    return pure + '살';
  };

  const mk = (k: 'year'|'month'|'day'|'time'): PillarSide => {
    const luckyMergedRaw = [
      ...(annot.byPillar?.[k]?.lucky || []),            // 귀인/성
      ...(annot.byPillar?.[k]?.generalShinsal || []),   // 도화/귀문관/현침/고신/역마 등
    ];
    const luckyMerged = luckyMergedRaw.map(normalizeLabel);

    // 길성만 남기기
    let luckyFiltered = Array.from(new Set(luckyMerged.filter(s => KILSUNG_SET.has(s))));

    // 관귀학관 합성(문창/문곡/천문성 중 하나라도 있으면 '관귀학관'으로 묶고 개별 표기는 제거)
    const hasAnyGwanGwi = luckyFiltered.includes('문창') || luckyFiltered.includes('문곡') || luckyFiltered.includes('천문성');
    if (hasAnyGwanGwi) {
      luckyFiltered = Array.from(
        new Set(
          luckyFiltered.filter(s => !['문창','문곡','천문성'].includes(s)).concat('관귀학관')
        )
      );
    }

    return {
      jijanggan: getJijangganText(p[k].earthlyBranch.name),
      twelveStage: annot.twelveStage[k],
      twelveShinsal: annot.byPillar?.[k]?.twelveShinsal?.join('\n') || '',
      lucky: luckyFiltered, // 길성만 노출
    };
  };

  return {
    time: mk('time'),
    day: mk('day'),
    month: mk('month'),
    year: mk('year'),
  };
}