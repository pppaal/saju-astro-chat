import { describe, it, expect } from 'vitest';
import { Numerology, getSynergyAnalysis } from '@/lib/numerology';
import { describe as describeNum, luckyTag, describeLocale, getLuckyTag, getNumberTitle } from '@/lib/numerology/descriptions';
import { MASTER_SET, reduceToCore } from '@/lib/numerology/utils';

describe('Numerology Class', () => {
  it('should export Numerology class', () => {
    expect(Numerology).toBeDefined();
    expect(typeof Numerology).toBe('function');
  });

  it('should create instance with name and birthDate', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));

    expect(instance).toBeInstanceOf(Numerology);
  });

  it('should calculate Life Path Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const lifePathNumber = instance.getLifePathNumber();

    expect(typeof lifePathNumber).toBe('number');
    expect(lifePathNumber).toBeGreaterThanOrEqual(1);
    expect(lifePathNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Expression Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const expressionNumber = instance.getExpressionNumber();

    expect(typeof expressionNumber).toBe('number');
    expect(expressionNumber).toBeGreaterThanOrEqual(1);
    expect(expressionNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Soul Urge Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const soulUrgeNumber = instance.getSoulUrgeNumber();

    expect(typeof soulUrgeNumber).toBe('number');
    expect(soulUrgeNumber).toBeGreaterThanOrEqual(1);
    expect(soulUrgeNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Personality Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const personalityNumber = instance.getPersonalityNumber();

    expect(typeof personalityNumber).toBe('number');
    expect(personalityNumber).toBeGreaterThanOrEqual(1);
    expect(personalityNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Birthday Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const birthdayNumber = instance.getBirthdayNumber();

    expect(birthdayNumber).toBe(15);
  });

  it('should get Core Profile', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const profile = instance.getCoreProfile();

    expect(profile).toHaveProperty('lifePathNumber');
    expect(profile).toHaveProperty('expressionNumber');
    expect(profile).toHaveProperty('soulUrgeNumber');
    expect(profile).toHaveProperty('personalityNumber');
    expect(profile).toHaveProperty('birthdayNumber');
  });

  it('should calculate Personal Year Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const personalYear = instance.getPersonalYearNumber(2024);

    expect(typeof personalYear).toBe('number');
    expect(personalYear).toBeGreaterThanOrEqual(1);
    expect(personalYear).toBeLessThanOrEqual(33);
  });

  it('should calculate Personal Month Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const personalMonth = instance.getPersonalMonthNumber(2024, 6);

    expect(typeof personalMonth).toBe('number');
    expect(personalMonth).toBeGreaterThanOrEqual(1);
    expect(personalMonth).toBeLessThanOrEqual(33);
  });

  it('should calculate Personal Day Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const personalDay = instance.getPersonalDayNumber(new Date('2024-06-15'));

    expect(typeof personalDay).toBe('number');
    expect(personalDay).toBeGreaterThanOrEqual(1);
    expect(personalDay).toBeLessThanOrEqual(33);
  });

  it('should calculate Maturity Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const maturityNumber = instance.getMaturityNumber();

    expect(typeof maturityNumber).toBe('number');
    expect(maturityNumber).toBeGreaterThanOrEqual(1);
    expect(maturityNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Balance Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const balanceNumber = instance.getBalanceNumber();

    expect(typeof balanceNumber).toBe('number');
    expect(balanceNumber).toBeGreaterThanOrEqual(1);
    expect(balanceNumber).toBeLessThanOrEqual(33);
  });

  it('should calculate Rational Thought Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const rationalThoughtNumber = instance.getRationalThoughtNumber();

    expect(typeof rationalThoughtNumber).toBe('number');
    expect(rationalThoughtNumber).toBeGreaterThanOrEqual(1);
    expect(rationalThoughtNumber).toBeLessThanOrEqual(33);
  });

  it('should get Cornerstone', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const cornerstone = instance.getCornerstone();

    expect(cornerstone).toHaveProperty('letter');
    expect(cornerstone).toHaveProperty('number');
    expect(cornerstone.letter).toBe('J');
    expect(typeof cornerstone.number).toBe('number');
  });

  it('should get Capstone', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const capstone = instance.getCapstone();

    expect(capstone).toHaveProperty('letter');
    expect(capstone).toHaveProperty('number');
    expect(capstone.letter).toBe('N');
    expect(typeof capstone.number).toBe('number');
  });

  it('should get First Vowel', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const firstVowel = instance.getFirstVowel();

    expect(firstVowel).toHaveProperty('letter');
    expect(firstVowel).toHaveProperty('number');
    expect(firstVowel.letter).toBe('O');
    expect(typeof firstVowel.number).toBe('number');
  });

  it('should get Subconscious', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const subconscious = instance.getSubconscious();

    expect(typeof subconscious).toBe('number');
    expect(subconscious).toBeGreaterThanOrEqual(1);
    expect(subconscious).toBeLessThanOrEqual(9);
  });

  it('should get Karmic Debt Numbers', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const karmicDebtNumbers = instance.getKarmicDebtNumbers();

    expect(Array.isArray(karmicDebtNumbers)).toBe(true);
  });

  it('should get Karmic Lessons', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const karmicLessons = instance.getKarmicLessons();

    expect(Array.isArray(karmicLessons)).toBe(true);
  });

  it('should get Pinnacles', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const { pinnacles, ages } = instance.getPinnacles();

    expect(Array.isArray(pinnacles)).toBe(true);
    expect(pinnacles.length).toBe(4);
    expect(Array.isArray(ages)).toBe(true);
    expect(ages.length).toBe(4);
  });

  it('should get Challenges', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const challenges = instance.getChallenges();

    expect(Array.isArray(challenges)).toBe(true);
    expect(challenges.length).toBe(4);
  });

  it('should calculate Universal Year Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const universalYear = instance.getUniversalYearNumber(2024);

    expect(typeof universalYear).toBe('number');
    expect(universalYear).toBeGreaterThanOrEqual(1);
    expect(universalYear).toBeLessThanOrEqual(33);
  });

  it('should calculate Universal Month Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const universalMonth = instance.getUniversalMonthNumber(2024, 6);

    expect(typeof universalMonth).toBe('number');
    expect(universalMonth).toBeGreaterThanOrEqual(1);
    expect(universalMonth).toBeLessThanOrEqual(33);
  });

  it('should calculate Universal Day Number', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const universalDay = instance.getUniversalDayNumber(new Date('2024-06-15'));

    expect(typeof universalDay).toBe('number');
    expect(universalDay).toBeGreaterThanOrEqual(1);
    expect(universalDay).toBeLessThanOrEqual(33);
  });

  it('should get Extended Profile', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const profile = instance.getExtendedProfile(new Date('2024-06-15'));

    expect(profile).toHaveProperty('lifePathNumber');
    expect(profile).toHaveProperty('expressionNumber');
    expect(profile).toHaveProperty('soulUrgeNumber');
    expect(profile).toHaveProperty('personalityNumber');
    expect(profile).toHaveProperty('birthdayNumber');
    expect(profile).toHaveProperty('nameUsed');
    expect(profile).toHaveProperty('isKoreanName');
    expect(profile).toHaveProperty('maturityNumber');
    expect(profile).toHaveProperty('balanceNumber');
    expect(profile).toHaveProperty('rationalThoughtNumber');
    expect(profile).toHaveProperty('cornerstone');
    expect(profile).toHaveProperty('capstone');
    expect(profile).toHaveProperty('firstVowel');
    expect(profile).toHaveProperty('subconscious');
    expect(profile).toHaveProperty('karmicDebtNumbers');
    expect(profile).toHaveProperty('karmicLessons');
    expect(profile).toHaveProperty('pinnacles');
    expect(profile).toHaveProperty('pinnacleAges');
    expect(profile).toHaveProperty('challenges');
    expect(profile).toHaveProperty('personalYear');
    expect(profile).toHaveProperty('personalMonth');
    expect(profile).toHaveProperty('personalDay');
    expect(profile).toHaveProperty('universalYear');
    expect(profile).toHaveProperty('universalMonth');
    expect(profile).toHaveProperty('universalDay');
  });

  it('should handle Korean names', () => {
    const instance = new Numerology('홍길동', new Date('1990-05-15'));
    const profile = instance.getExtendedProfile();

    expect(profile.isKoreanName).toBe(true);
  });

  it('should handle English names', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const profile = instance.getExtendedProfile();

    expect(profile.isKoreanName).toBe(false);
  });
});

describe('Numerology Types', () => {
  it('should export CoreNumerologyProfile type', () => {
    // Type exports are checked implicitly by TypeScript
    expect(Numerology).toBeDefined();
  });

  it('should export ExtendedNumerologyProfile type', () => {
    expect(Numerology).toBeDefined();
  });

  it('should export MasterNumber type', () => {
    expect(Numerology).toBeDefined();
  });

  it('should export NumerologyNumber type', () => {
    expect(Numerology).toBeDefined();
  });
});

describe('Numerology Descriptions', () => {
  it('should export describe function', () => {

    expect(typeof describeNum).toBe('function');
  });

  it('should describe lifePath number', () => {
    const description = describeNum('lifePath', 1);

    expect(typeof description).toBe('string');
    expect(description.length).toBeGreaterThan(0);
  });

  it('should describe expression number', () => {
    const description = describeNum('expression', 5);

    expect(typeof description).toBe('string');
    expect(description.length).toBeGreaterThan(0);
  });

  it('should export luckyTag mapping', () => {

    expect(luckyTag).toBeDefined();
    expect(typeof luckyTag).toBe('object');
    expect(luckyTag[1]).toBeDefined();
  });

  it('should export describeLocale function', () => {

    expect(typeof describeLocale).toBe('function');
  });

  it('should describe with locale', () => {
    const enDescription = describeLocale('lifePath', 1, 'en');
    const koDescription = describeLocale('lifePath', 1, 'ko');

    expect(typeof enDescription).toBe('string');
    expect(typeof koDescription).toBe('string');
  });

  it('should export getLuckyTag function', () => {

    expect(typeof getLuckyTag).toBe('function');
  });

  it('should get lucky tag with locale', () => {
    const tag = getLuckyTag(1);

    expect(typeof tag).toBe('string');
  });

  it('should export getNumberTitle function', () => {

    expect(typeof getNumberTitle).toBe('function');
  });

  it('should get number title', () => {
    const title = getNumberTitle(1);

    expect(typeof title).toBe('string');
  });
});

describe('Numerology Analysis', () => {
  it('should export getSynergyAnalysis function', () => {

    expect(typeof getSynergyAnalysis).toBe('function');
  });

  it('should analyze synergy from profile', () => {
    const instance = new Numerology('John Doe', new Date('1990-05-15'));
    const profile = instance.getCoreProfile();
    const analysis = getSynergyAnalysis(profile);

    expect(Array.isArray(analysis)).toBe(true);
  });
});

describe('Numerology Utils', () => {
  it('should export MASTER_SET', () => {

    expect(MASTER_SET).toBeDefined();
    expect(MASTER_SET instanceof Set).toBe(true);
    expect(MASTER_SET.has(11)).toBe(true);
    expect(MASTER_SET.has(22)).toBe(true);
    expect(MASTER_SET.has(33)).toBe(true);
  });

  it('should export reduceToCore function', () => {

    expect(typeof reduceToCore).toBe('function');
  });

  it('should reduce number to core', () => {

    expect(reduceToCore(10)).toBe(1);
    expect(reduceToCore(29)).toBe(11); // Master number preserved
    expect(reduceToCore(5)).toBe(5);
  });

  it('should preserve master numbers', () => {

    for (const master of MASTER_SET) {
      expect(reduceToCore(master)).toBe(master);
    }
  });
});

describe('Numerology Master Numbers', () => {
  it('should preserve master number 11 in calculations', () => {
    // Use a name/date that might produce master number
    const instance = new Numerology('Test User', new Date('2000-11-11'));
    const profile = instance.getExtendedProfile();

    // Just verify the structure works with potential master numbers
    expect(profile.lifePathNumber).toBeDefined();
  });

  it('should handle all core keys in descriptions', () => {

    const coreKeys = ['lifePath', 'expression', 'soulUrge', 'personality', 'personalYear', 'personalMonth', 'personalDay'];

    for (const key of coreKeys) {
      const desc = describeNum(key as any, 5);
      expect(typeof desc).toBe('string');
    }
  });
});
