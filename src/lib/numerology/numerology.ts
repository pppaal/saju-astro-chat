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
    if (code < 65 || code > 90) return 0; // Not A-Z
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
}