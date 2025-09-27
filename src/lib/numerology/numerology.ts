// lib/numerology.ts

export type MasterNumber = 11 | 22 | 33;
export type NumerologyNumber = number | MasterNumber;

// Helper: reduce to single digit while respecting master numbers
function reduceToDigit(num: number): NumerologyNumber {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = num
      .toString()
      .split("")
      .map(Number)
      .reduce((a, b) => a + b, 0);
  }
  return num as NumerologyNumber;
}

// 1. Life Path Number
export function getLifePathNumber(date: Date): NumerologyNumber {
  const digits = date
    .toISOString()
    .slice(0, 10) // YYYY-MM-DD
    .replace(/-/g, "")
    .split("")
    .map(Number);

  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceToDigit(sum);
}

// 2. Birthday Number
export function getBirthdayNumber(date: Date): number {
  return date.getUTCDate();
}

// Helper: A=1, ..., I=9, J=1, ...
function letterToNumber(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0);
  if (code < 65 || code > 90) return 0; // not A-Z
  return ((code - 65) % 9) + 1;
}

// 3. Name Number
export function getNameNumber(name: string): NumerologyNumber {
  const sum = name
    .split("")
    .map(letterToNumber)
    .reduce((a, b) => a + b, 0);

  return reduceToDigit(sum);
}

// 4. Personal Year Number
export function getPersonalYearNumber(
  birthDate: Date,
  year: number
): NumerologyNumber {
  const month = birthDate.getUTCMonth() + 1;
  const day = birthDate.getUTCDate();
  const digits = `${month}${day}${year}`.split("").map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceToDigit(sum);
}