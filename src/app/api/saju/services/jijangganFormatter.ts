// src/app/api/saju/services/jijangganFormatter.ts
// 지장간 포매터 함수들

import type { JGItem, JijangganAny } from '@/types/saju-api';

// Record type guard
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const toJGItem = (value: unknown): JGItem | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return { name: value };
  if (isRecord(value)) {
    const name = typeof value.name === 'string' ? value.name : undefined;
    const sibsin = typeof value.sibsin === 'string' ? value.sibsin : undefined;
    if (name || sibsin) return { name, sibsin };
  }
  return undefined;
};

// Stem name mappings
const HANGUL_TO_HANJA_STEM: Record<string, string> = {
  갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸',
};
const HANJA_TO_HANGUL_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(HANGUL_TO_HANJA_STEM).map(([ko, han]) => [han, ko])
);

// 한자 정규화: (한글 → 한자)
export const normalizeStemName = (name?: string) => {
  if (!name) return name;
  if (HANJA_TO_HANGUL_STEM[name]) return name; // 이미 한자면 그대로
  return HANGUL_TO_HANJA_STEM[name] ?? name; // 한글이면 한자로 매핑
};

// 한글로 환원: (한자 → 한글)
export const toHangulStem = (name?: string) => {
  if (!name) return name;
  if (HANGUL_TO_HANJA_STEM[name]) return name; // 이미 한글이면 그대로
  return HANJA_TO_HANGUL_STEM[name] ?? name; // 한자면 한글로 매핑
};

// 십신 테이블(일간 → 대상 천간 → 십신)
const SIBSIN_TABLE: Record<string, Record<string, string>> = {
  甲: { 甲: '비견', 乙: '겁재', 丙: '식신', 丁: '상관', 戊: '편재', 己: '정재', 庚: '편관', 辛: '정관', 壬: '편인', 癸: '정인' },
  乙: { 甲: '겁재', 乙: '비견', 丙: '상관', 丁: '식신', 戊: '정재', 己: '편재', 庚: '정관', 辛: '편관', 壬: '정인', 癸: '편인' },
  丙: { 甲: '편인', 乙: '정인', 丙: '비견', 丁: '겁재', 戊: '식신', 己: '상관', 庚: '편재', 辛: '정재', 壬: '편관', 癸: '정관' },
  丁: { 甲: '정인', 乙: '편인', 丙: '겁재', 丁: '비견', 戊: '상관', 己: '식신', 庚: '정재', 辛: '편재', 壬: '정관', 癸: '편관' },
  戊: { 甲: '정관', 乙: '편관', 丙: '편인', 丁: '정인', 戊: '비견', 己: '겁재', 庚: '식신', 辛: '상관', 壬: '편재', 癸: '정재' },
  己: { 甲: '편관', 乙: '정관', 丙: '정인', 丁: '편인', 戊: '겁재', 己: '비견', 庚: '상관', 辛: '식신', 壬: '정재', 癸: '편재' },
  庚: { 甲: '정재', 乙: '편재', 丙: '정관', 丁: '편관', 戊: '편인', 己: '정인', 庚: '비견', 辛: '겁재', 壬: '식신', 癸: '상관' },
  辛: { 甲: '편재', 乙: '정재', 丙: '편관', 丁: '정관', 戊: '정인', 己: '편인', 庚: '겁재', 辛: '비견', 壬: '상관', 癸: '식신' },
  壬: { 甲: '상관', 乙: '식신', 丙: '편재', 丁: '정재', 戊: '정관', 己: '편관', 庚: '편인', 辛: '정인', 壬: '비견', 癸: '겁재' },
  癸: { 甲: '식신', 乙: '상관', 丙: '정재', 丁: '편재', 戊: '편관', 己: '정관', 庚: '정인', 辛: '편인', 壬: '겁재', 癸: '비견' },
};

// 무엇이 오든 {chogi,junggi,jeonggi} 객체로
export const coerceJijanggan = (raw: JijangganAny): { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem } => {
  if (!raw) return {};
  if (isRecord(raw)) {
    return {
      chogi: toJGItem(raw.chogi),
      junggi: toJGItem(raw.junggi),
      jeonggi: toJGItem(raw.jeonggi),
    };
  }
  const arr: JGItem[] = Array.isArray(raw)
    ? raw.map((x) => (typeof x === 'object' ? x : { name: String(x) }))
    : String(raw).split('').filter(Boolean).map((ch) => ({ name: ch }));
  return { chogi: arr[0], junggi: arr[1], jeonggi: arr[2] };
};

// 지장간에 십신 보강
export const enrichSibsin = (
  jg: { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem },
  dayMasterStem: string
) => {
  const dm = normalizeStemName(dayMasterStem);
  const map = dm ? SIBSIN_TABLE[dm] : undefined;
  if (!map) return jg;
  for (const key of ['chogi', 'junggi', 'jeonggi'] as const) {
    const it = jg[key];
    if (it && it.name) {
      const stemName = normalizeStemName(it.name);
      if (!stemName) continue;
      if (!it.sibsin && map[stemName]) {
        it.sibsin = map[stemName];
        it.name = stemName; // 한자 통일
      } else {
        it.name = stemName;
      }
    }
  }
  return jg;
};

// 원문 문자열/배열 생성(한글로)
export const buildJijangganRaw = (raw: JijangganAny) => {
  if (typeof raw === 'string') {
    const list = raw.split('').filter(Boolean);
    return { raw, list };
  }
  if (Array.isArray(raw)) {
    const list = raw.map(v => typeof v === 'string' ? v : (v?.name ?? '')).filter(Boolean);
    return { raw: list.join(''), list };
  }
  if (isRecord(raw)) {
    const keys = ['chogi', 'junggi', 'jeonggi'] as const;
    const list = keys.map((k) => {
      const v = raw[k];
      if (!v) return '';
      const name = typeof v === 'string' ? v : (isRecord(v) && typeof v.name === 'string' ? v.name : '');
      return toHangulStem(name);
    }).filter(Boolean);
    return { raw: list.join(''), list };
  }
  return { raw: '', list: [] as string[] };
};
