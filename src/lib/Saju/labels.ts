// Human-readable labels for stems/branches so we can show proper names
// without touching the core (garbled) string data used by the logic.
// Key = raw name in STEMS/BRANCHES, value = Hangul + romanization.

export const STEM_LABELS: Record<string, { hangul: string; roman: string }> = {
  '甲': { hangul: '갑', roman: 'Gap' },
  '乙': { hangul: '을', roman: 'Eul' },
  '丙': { hangul: '병', roman: 'Byeong' },
  '丁': { hangul: '정', roman: 'Jeong' },
  '戊': { hangul: '무', roman: 'Mu' },
  '己': { hangul: '기', roman: 'Gi' },
  '庚': { hangul: '경', roman: 'Gyeong' },
  '辛': { hangul: '신', roman: 'Sin' },
  '壬': { hangul: '임', roman: 'Im' },
  '癸': { hangul: '계', roman: 'Gye' },
};

export const BRANCH_LABELS: Record<string, { hangul: string; roman: string }> = {
  '子': { hangul: '자', roman: 'Ja' },
  '丑': { hangul: '축', roman: 'Chuk' },
  '寅': { hangul: '인', roman: 'In' },
  '卯': { hangul: '묘', roman: 'Myo' },
  '辰': { hangul: '진', roman: 'Jin' },
  '巳': { hangul: '사', roman: 'Sa' },
  '午': { hangul: '오', roman: 'O' },
  '未': { hangul: '미', roman: 'Mi' },
  '申': { hangul: '신', roman: 'Sin' },
  '酉': { hangul: '유', roman: 'Yu' },
  '戌': { hangul: '술', roman: 'Sul' },
  '亥': { hangul: '해', roman: 'Hae' },
};
