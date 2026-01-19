// src/components/saju/result-display/constants.ts

export type ElementEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export const elementColors: Record<ElementEN, string> = {
  Wood: '#2dbd7f',
  Fire: '#ff6b6b',
  Earth: '#f3a73f',
  Metal: '#4a90e2',
  Water: '#5b6bfa',
};

export const stemElement: Record<string, ElementEN> = {
  갑: 'Wood', 을: 'Wood', 병: 'Fire', 정: 'Fire', 무: 'Earth', 기: 'Earth', 경: 'Metal', 신: 'Metal', 임: 'Water', 계: 'Water',
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth', 己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
};

export const branchElement: Record<string, ElementEN> = {
  자: 'Water', 축: 'Earth', 인: 'Wood', 묘: 'Wood', 진: 'Earth', 사: 'Fire', 오: 'Fire', 미: 'Earth', 신: 'Metal', 유: 'Metal', 술: 'Earth', 해: 'Water',
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
};

export const pillarLabelMap: Record<'year'|'month'|'day'|'time', string> = {
  time: '시지',
  day: '일지',
  month: '월지',
  year: '연지',
};
