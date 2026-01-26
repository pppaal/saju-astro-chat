// lib/numerology.ts

/** A single digit number or a Master Number (11, 22, 33) */
export type MasterNumber = 11 | 22 | 33;
export type NumerologyNumber = number | MasterNumber;

/** The core numerology numbers for a person's profile */
export interface CoreNumerologyProfile {
  lifePathNumber: NumerologyNumber;
  expressionNumber: NumerologyNumber;
  soulUrgeNumber: NumerologyNumber;
  personalityNumber: NumerologyNumber;
  birthdayNumber: number;
}

/** Extended numerology profile with all advanced calculations */
export interface ExtendedNumerologyProfile extends CoreNumerologyProfile {
  // Name used for calculation
  nameUsed: string;
  isKoreanName: boolean;

  // Advanced numbers
  maturityNumber: NumerologyNumber;
  balanceNumber: NumerologyNumber;
  rationalThoughtNumber: NumerologyNumber;

  // Name analysis
  cornerstone: string;
  cornerstoneNumber: number;
  capstone: string;
  capstoneNumber: number;
  firstVowel: string;
  firstVowelNumber: number;
  hiddenPassionNumber?: number;
  subconscious: number;

  // Karmic numbers
  karmicDebtNumbers: number[];
  karmicLessons: number[];

  // Life cycles
  pinnacles: NumerologyNumber[];
  pinnacleAges: string[];
  challenges: NumerologyNumber[];

  // Personal cycles
  personalYear: NumerologyNumber;
  personalMonth: NumerologyNumber;
  personalDay: NumerologyNumber;

  // Universal cycles
  universalYear: NumerologyNumber;
  universalMonth: NumerologyNumber;
  universalDay: NumerologyNumber;
}

/**
 * A class to perform various numerology calculations based on a name and birth date.
 */
export class Numerology {
  private readonly name: string;
  private readonly birthDate: Date;

  constructor(fullName: string, birthDate: Date) {
    this.name = fullName.toLowerCase();
    this.birthDate = birthDate;
  }

  // --- Private Helper Methods ---

  /** Reduces a number to a single digit, respecting master numbers. */
  private _reduceToDigit(num: number): NumerologyNumber {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num
        .toString()
        .split("")
        .map(Number)
        .reduce((a, b) => a + b, 0);
    }
    return num as NumerologyNumber;
  }
  
  /** Converts a letter to its Pythagorean numerology value (1-9). */
  private _letterToNumber(letter: string): number {
    const code = letter.toUpperCase().charCodeAt(0);
    if (code < 65 || code > 90) {return 0;} // Not A-Z
    return ((code - 65) % 9) + 1;
  }
  
  /** Checks if a letter is a vowel. */
  private _isVowel(letter: string): boolean {
    return ['a', 'e', 'i', 'o', 'u'].includes(letter.toLowerCase());
  }

  // --- Core Number Calculations ---

  /**
   * Calculates the Life Path Number from the birth date.
   * Represents your life's main lesson and purpose.
   */
  public getLifePathNumber(): NumerologyNumber {
    const year = this.birthDate.getUTCFullYear();
    const month = this.birthDate.getUTCMonth() + 1;
    const day = this.birthDate.getUTCDate();

    const sum = `${year}${month}${day}`
      .split("")
      .map(Number)
      .reduce((a, b) => a + b, 0);
      
    return this._reduceToDigit(sum);
  }

  /**
   * Calculates the Expression (or Destiny) Number from the full name.
   * Represents your natural talents and potential.
   */
  public getExpressionNumber(): NumerologyNumber {
    const sum = this.name
      .split("")
      .map(char => this._letterToNumber(char))
      .reduce((a, b) => a + b, 0);
      
    return this._reduceToDigit(sum);
  }

  /**
   * ✨ NEW: Calculates the Soul Urge (or Heart's Desire) Number from the vowels in the name.
   * Represents your inner self, true desires, and motivations.
   */
  public getSoulUrgeNumber(): NumerologyNumber {
    const sum = this.name
      .split("")
      .filter(char => this._isVowel(char))
      .map(char => this._letterToNumber(char))
      .reduce((a, b) => a + b, 0);
      
    return this._reduceToDigit(sum);
  }
  
  /**
   * ✨ NEW: Calculates the Personality Number from the consonants in the name.
   * Represents your outer persona, how others see you.
   */
  public getPersonalityNumber(): NumerologyNumber {
     const sum = this.name
      .split("")
      .filter(char => !this._isVowel(char) && this._letterToNumber(char) > 0)
      .map(char => this._letterToNumber(char))
      .reduce((a, b) => a + b, 0);
      
    return this._reduceToDigit(sum);
  }

  /**
   * Gets the Birthday Number (the day of the month you were born).
   * Represents an additional talent or trait.
   */
  public getBirthdayNumber(): number {
    return this.birthDate.getUTCDate();
  }
  
  /**
   * ✨ NEW & VERY COOL: Gets the complete core numerology profile in one call.
   * This is perfect for displaying a full reading on your website.
   */
  public getCoreProfile(): CoreNumerologyProfile {
    return {
      lifePathNumber: this.getLifePathNumber(),
      expressionNumber: this.getExpressionNumber(),
      soulUrgeNumber: this.getSoulUrgeNumber(),
      personalityNumber: this.getPersonalityNumber(),
      birthdayNumber: this.getBirthdayNumber(),
    };
  }

  /**
   * Calculates the Personal Year Number for a given year.
   * Shows the theme/energy of a specific year for this person.
   * Formula: birth month + birth day + current year → reduce to single digit
   */
  public getPersonalYearNumber(year: number = new Date().getFullYear()): NumerologyNumber {
    const month = this.birthDate.getUTCMonth() + 1;
    const day = this.birthDate.getUTCDate();
    const sum = `${month}${day}${year}`
      .split("")
      .map(Number)
      .reduce((a, b) => a + b, 0);
    return this._reduceToDigit(sum);
  }

  /**
   * Calculates the Personal Month Number.
   * Shows the theme/energy of a specific month for this person.
   * Formula: Personal Year + calendar month → reduce to single digit
   */
  public getPersonalMonthNumber(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1): NumerologyNumber {
    const personalYear = this.getPersonalYearNumber(year);
    const sum = personalYear + month;
    return this._reduceToDigit(sum);
  }

  /**
   * Calculates the Personal Day Number.
   * Shows the energy of a specific day for this person.
   * Formula: Personal Month + calendar day → reduce to single digit
   */
  public getPersonalDayNumber(date: Date = new Date()): NumerologyNumber {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const personalMonth = this.getPersonalMonthNumber(year, month);
    const sum = personalMonth + day;
    return this._reduceToDigit(sum);
  }

  // --- Advanced Number Calculations ---

  /** Calculates the Maturity Number (Life Path + Expression) */
  public getMaturityNumber(): NumerologyNumber {
    const sum = Number(this.getLifePathNumber()) + Number(this.getExpressionNumber());
    return this._reduceToDigit(sum);
  }

  /** Calculates the Balance Number from name initials */
  public getBalanceNumber(): NumerologyNumber {
    const parts = this.name.split(/\s+/).filter(Boolean);
    const sum = parts
      .map(part => this._letterToNumber(part[0] || ''))
      .reduce((a, b) => a + b, 0);
    return this._reduceToDigit(sum);
  }

  /** Calculates the Rational Thought Number */
  public getRationalThoughtNumber(): NumerologyNumber {
    const firstName = this.name.split(/\s+/)[0] || '';
    const firstNameSum = firstName.split('').map(c => this._letterToNumber(c)).reduce((a, b) => a + b, 0);
    const day = this.birthDate.getUTCDate();
    return this._reduceToDigit(firstNameSum + day);
  }

  /** Get cornerstone (first letter of first name) */
  public getCornerstone(): { letter: string; number: number } {
    const firstName = this.name.split(/\s+/)[0] || '';
    const letter = firstName[0]?.toUpperCase() || '';
    return { letter, number: this._letterToNumber(letter) };
  }

  /** Get capstone (last letter of first name) */
  public getCapstone(): { letter: string; number: number } {
    const firstName = this.name.split(/\s+/)[0] || '';
    const letter = firstName[firstName.length - 1]?.toUpperCase() || '';
    return { letter, number: this._letterToNumber(letter) };
  }

  /** Get first vowel in name */
  public getFirstVowel(): { letter: string; number: number } {
    const vowel = this.name.split('').find(c => this._isVowel(c)) || '';
    return { letter: vowel.toUpperCase(), number: this._letterToNumber(vowel) };
  }

  /** Get subconscious self (count of unique numbers 1-9 present in name) */
  public getSubconscious(): number {
    const numbers = new Set<number>();
    this.name.split('').forEach(c => {
      const n = this._letterToNumber(c);
      if (n > 0) {numbers.add(n);}
    });
    return numbers.size;
  }

  /** Get karmic debt numbers (13, 14, 16, 19 in raw calculations) */
  public getKarmicDebtNumbers(): number[] {
    const debts: number[] = [];
    const karmicNumbers = [13, 14, 16, 19];

    // Check Life Path
    const year = this.birthDate.getUTCFullYear();
    const month = this.birthDate.getUTCMonth() + 1;
    const day = this.birthDate.getUTCDate();
    const lpSum = `${year}${month}${day}`.split('').map(Number).reduce((a, b) => a + b, 0);
    if (karmicNumbers.includes(lpSum)) {debts.push(lpSum);}

    // Check birthday
    if (karmicNumbers.includes(day)) {debts.push(day);}

    return [...new Set(debts)];
  }

  /** Get karmic lessons (missing numbers 1-9 in name) */
  public getKarmicLessons(): number[] {
    const present = new Set<number>();
    this.name.split('').forEach(c => {
      const n = this._letterToNumber(c);
      if (n > 0) {present.add(n);}
    });
    const lessons: number[] = [];
    for (let i = 1; i <= 9; i++) {
      if (!present.has(i)) {lessons.push(i);}
    }
    return lessons;
  }

  /** Calculate pinnacles */
  public getPinnacles(): { pinnacles: NumerologyNumber[]; ages: string[] } {
    const month = this.birthDate.getUTCMonth() + 1;
    const day = this.birthDate.getUTCDate();
    const year = this.birthDate.getUTCFullYear();

    const m = this._reduceToDigit(month);
    const d = this._reduceToDigit(day);
    const y = this._reduceToDigit(`${year}`.split('').map(Number).reduce((a, b) => a + b, 0));

    const lp = Number(this.getLifePathNumber());
    const firstEnd = 36 - lp;

    return {
      pinnacles: [
        this._reduceToDigit(Number(m) + Number(d)),
        this._reduceToDigit(Number(d) + Number(y)),
        this._reduceToDigit(Number(m) + Number(d) + Number(d) + Number(y)),
        this._reduceToDigit(Number(m) + Number(y)),
      ],
      ages: [
        `0-${firstEnd}`,
        `${firstEnd + 1}-${firstEnd + 9}`,
        `${firstEnd + 10}-${firstEnd + 18}`,
        `${firstEnd + 19}+`,
      ],
    };
  }

  /** Calculate challenges */
  public getChallenges(): NumerologyNumber[] {
    const month = this.birthDate.getUTCMonth() + 1;
    const day = this.birthDate.getUTCDate();
    const year = this.birthDate.getUTCFullYear();

    const m = Number(this._reduceToDigit(month));
    const d = Number(this._reduceToDigit(day));
    const y = Number(this._reduceToDigit(`${year}`.split('').map(Number).reduce((a, b) => a + b, 0)));

    const c1 = Math.abs(m - d);
    const c2 = Math.abs(d - y);
    const c3 = Math.abs(c1 - c2);
    const c4 = Math.abs(m - y);

    return [c1, c2, c3, c4] as NumerologyNumber[];
  }

  /** Calculate Universal Year */
  public getUniversalYearNumber(year: number = new Date().getFullYear()): NumerologyNumber {
    const sum = `${year}`.split('').map(Number).reduce((a, b) => a + b, 0);
    return this._reduceToDigit(sum);
  }

  /** Calculate Universal Month */
  public getUniversalMonthNumber(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1): NumerologyNumber {
    const sum = Number(this.getUniversalYearNumber(year)) + month;
    return this._reduceToDigit(sum);
  }

  /** Calculate Universal Day */
  public getUniversalDayNumber(date: Date = new Date()): NumerologyNumber {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const sum = Number(this.getUniversalMonthNumber(y, m)) + d;
    return this._reduceToDigit(sum);
  }

  /** Check if name appears to be Korean (has Hangul characters) */
  private _isKoreanName(name: string): boolean {
    return /[\uAC00-\uD7AF]/.test(name);
  }

  /**
   * Gets the complete extended numerology profile
   */
  public getExtendedProfile(today: Date = new Date()): ExtendedNumerologyProfile {
    const core = this.getCoreProfile();
    const cornerstone = this.getCornerstone();
    const capstone = this.getCapstone();
    const firstVowel = this.getFirstVowel();
    const { pinnacles, ages } = this.getPinnacles();

    return {
      ...core,
      nameUsed: this.name,
      isKoreanName: this._isKoreanName(this.name),

      maturityNumber: this.getMaturityNumber(),
      balanceNumber: this.getBalanceNumber(),
      rationalThoughtNumber: this.getRationalThoughtNumber(),

      cornerstone: cornerstone.letter,
      cornerstoneNumber: cornerstone.number,
      capstone: capstone.letter,
      capstoneNumber: capstone.number,
      firstVowel: firstVowel.letter,
      firstVowelNumber: firstVowel.number,
      subconscious: this.getSubconscious(),

      karmicDebtNumbers: this.getKarmicDebtNumbers(),
      karmicLessons: this.getKarmicLessons(),

      pinnacles,
      pinnacleAges: ages,
      challenges: this.getChallenges(),

      personalYear: this.getPersonalYearNumber(today.getFullYear()),
      personalMonth: this.getPersonalMonthNumber(today.getFullYear(), today.getMonth() + 1),
      personalDay: this.getPersonalDayNumber(today),

      universalYear: this.getUniversalYearNumber(today.getFullYear()),
      universalMonth: this.getUniversalMonthNumber(today.getFullYear(), today.getMonth() + 1),
      universalDay: this.getUniversalDayNumber(today),
    };
  }
}