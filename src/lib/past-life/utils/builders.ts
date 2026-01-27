/**
 * Result builder functions for past-life analysis
 * Functions that build each section of the PastLifeResult
 */

import type { GeokgukType, HeavenlyStem, HouseNumber } from '../data/types';
import type { PastLifeResult } from '../types';
import { SOUL_PATTERNS } from '../data/soul-patterns';
import { PAST_LIFE_THEMES } from '../data/past-life-themes';
import { NODE_JOURNEY } from '../data/node-journey';
import { SATURN_LESSONS } from '../data/saturn-lessons';
import { DAY_MASTER_MISSION } from '../data/day-master-mission';
import {
  GEOKGUK_TALENTS,
  FALLBACK_TEXTS,
  DEFAULT_VALUES,
  SATURN_RETURN_AGES,
} from '../data/constants';
import { selectLang, selectLangFromArray } from './helpers';

/**
 * Build the soul pattern section
 */
export function buildSoulPattern(
  geokgukType: GeokgukType | null,
  isKo: boolean
): PastLifeResult['soulPattern'] {
  if (geokgukType && SOUL_PATTERNS[geokgukType]) {
    const pattern = SOUL_PATTERNS[geokgukType];
    return {
      type: selectLang(isKo, pattern.type),
      emoji: pattern.emoji,
      title: selectLang(isKo, pattern.title),
      description: selectLang(isKo, pattern.description),
      traits: isKo ? pattern.traits.ko : pattern.traits.en,
    };
  }

  return {
    type: selectLang(isKo, DEFAULT_VALUES.SOUL_TYPE),
    emoji: DEFAULT_VALUES.SOUL_EMOJI,
    title: selectLang(isKo, DEFAULT_VALUES.SOUL_TITLE),
    description: selectLang(isKo, DEFAULT_VALUES.SOUL_DESCRIPTION),
    traits: [...(isKo ? DEFAULT_VALUES.SOUL_TRAITS.ko : DEFAULT_VALUES.SOUL_TRAITS.en)],
  };
}

/**
 * Build the past life theme section
 */
export function buildPastLife(
  geokgukType: GeokgukType | null,
  isKo: boolean
): PastLifeResult['pastLife'] {
  if (geokgukType && PAST_LIFE_THEMES[geokgukType]) {
    const theme = PAST_LIFE_THEMES[geokgukType];
    return {
      likely: selectLang(isKo, theme.likely),
      talents: selectLang(isKo, theme.talents),
      lessons: selectLang(isKo, theme.lessons),
      era: theme.era ? selectLang(isKo, theme.era) : undefined,
    };
  }

  return {
    likely: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.likely),
    talents: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.talents),
    lessons: selectLang(isKo, FALLBACK_TEXTS.PAST_LIFE.lessons),
  };
}

/**
 * Build the soul journey section (North Node)
 */
export function buildSoulJourney(
  northNodeHouse: HouseNumber | null,
  isKo: boolean
): PastLifeResult['soulJourney'] {
  if (northNodeHouse && NODE_JOURNEY[northNodeHouse]) {
    const journey = NODE_JOURNEY[northNodeHouse];
    return {
      pastPattern: selectLang(isKo, journey.pastPattern),
      releasePattern: selectLang(isKo, journey.release),
      currentDirection: selectLang(isKo, journey.direction),
      lessonToLearn: selectLang(isKo, journey.lesson),
    };
  }

  return {
    pastPattern: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.pastPattern),
    releasePattern: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.releasePattern),
    currentDirection: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.currentDirection),
    lessonToLearn: selectLang(isKo, FALLBACK_TEXTS.SOUL_JOURNEY.lessonToLearn),
  };
}

/**
 * Build the Saturn lesson section
 */
export function buildSaturnLesson(
  saturnHouse: HouseNumber | null,
  isKo: boolean
): PastLifeResult['saturnLesson'] {
  if (saturnHouse && SATURN_LESSONS[saturnHouse]) {
    const lesson = SATURN_LESSONS[saturnHouse];
    return {
      lesson: selectLang(isKo, lesson.lesson),
      challenge: selectLang(isKo, lesson.challenge),
      mastery: selectLang(isKo, lesson.mastery),
    };
  }

  return {
    lesson: selectLang(isKo, FALLBACK_TEXTS.SATURN_LESSON.lesson),
    challenge: isKo
      ? `${SATURN_RETURN_AGES.FIRST}세, ${SATURN_RETURN_AGES.SECOND}세 전후로 큰 시험이 와요`
      : `Major tests come around ages ${SATURN_RETURN_AGES.FIRST} and ${SATURN_RETURN_AGES.SECOND}`,
    mastery: selectLang(isKo, FALLBACK_TEXTS.SATURN_LESSON.mastery),
  };
}

/**
 * Extract talents carried from past lives
 */
export function extractTalentsCarried(geokgukType: GeokgukType | null, isKo: boolean): string[] {
  if (!geokgukType) {
    return [...selectLangFromArray(isKo, FALLBACK_TEXTS.DEFAULT_TALENTS)];
  }

  const geokTalents = GEOKGUK_TALENTS[geokgukType];
  return geokTalents ? selectLangFromArray(isKo, geokTalents) : [];
}

/**
 * Build the this life mission section
 */
export function buildThisLifeMission(
  dayMasterChar: HeavenlyStem | null,
  isKo: boolean
): PastLifeResult['thisLifeMission'] {
  if (dayMasterChar && DAY_MASTER_MISSION[dayMasterChar]) {
    const mission = DAY_MASTER_MISSION[dayMasterChar];
    return {
      core: selectLang(isKo, mission.core),
      expression: selectLang(isKo, mission.expression),
      fulfillment: selectLang(isKo, mission.fulfillment),
    };
  }

  return {
    core: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.core),
    expression: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.expression),
    fulfillment: selectLang(isKo, FALLBACK_TEXTS.THIS_LIFE_MISSION.fulfillment),
  };
}
