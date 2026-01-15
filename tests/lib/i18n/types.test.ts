/**
 * I18n Types Tests
 *
 * Tests for internationalization type definitions
 */


import type {
  SupportedLocale,
  LocaleExtension,
  UnifiedAnalysisLabels,
  DailyRitualLabels,
  PsychologyLabels,
  MeditationLabels,
} from "@/lib/i18n/types";

describe("SupportedLocale type", () => {
  it("accepts valid locales", () => {
    const validLocales: SupportedLocale[] = ["en", "ko", "es", "fr", "ja", "zh", "ru", "ar"];
    expect(validLocales).toHaveLength(8);
  });

  it("includes English", () => {
    const locale: SupportedLocale = "en";
    expect(locale).toBe("en");
  });

  it("includes Korean", () => {
    const locale: SupportedLocale = "ko";
    expect(locale).toBe("ko");
  });

  it("includes Japanese", () => {
    const locale: SupportedLocale = "ja";
    expect(locale).toBe("ja");
  });

  it("includes Chinese", () => {
    const locale: SupportedLocale = "zh";
    expect(locale).toBe("zh");
  });

  it("includes Arabic", () => {
    const locale: SupportedLocale = "ar";
    expect(locale).toBe("ar");
  });
});

describe("LocaleExtension interface", () => {
  it("accepts valid extension structure", () => {
    const extension: LocaleExtension = {
      en: {
        common: {
          hello: "Hello",
          goodbye: "Goodbye",
        },
        errors: {
          notFound: "Not found",
        },
      },
      ko: {
        common: {
          hello: "안녕하세요",
          goodbye: "안녕히 가세요",
        },
      },
    };

    expect(extension.en.common.hello).toBe("Hello");
    expect(extension.ko.common.hello).toBe("안녕하세요");
  });

  it("supports nested structures", () => {
    const extension: LocaleExtension = {
      en: {
        nested: {
          level1: {
            level2: "deep value",
          },
        },
      },
    };

    const nested = extension.en.nested.level1 as Record<string, string>;
    expect(nested.level2).toBe("deep value");
  });
});

describe("UnifiedAnalysisLabels interface", () => {
  it("has correct structure", () => {
    const labels: UnifiedAnalysisLabels = {
      diagnose: {
        title: "Diagnose",
        description: "Diagnose description",
      },
      analyze: {
        title: "Analyze",
        description: "Analyze description",
      },
      heal: {
        title: "Heal",
        description: "Heal description",
      },
    };

    expect(labels.diagnose.title).toBe("Diagnose");
    expect(labels.analyze.description).toBe("Analyze description");
    expect(labels.heal.title).toBe("Heal");
  });

  it("requires all three sections", () => {
    const labels: UnifiedAnalysisLabels = {
      diagnose: { title: "D", description: "D desc" },
      analyze: { title: "A", description: "A desc" },
      heal: { title: "H", description: "H desc" },
    };

    expect(Object.keys(labels)).toHaveLength(3);
    expect(labels).toHaveProperty("diagnose");
    expect(labels).toHaveProperty("analyze");
    expect(labels).toHaveProperty("heal");
  });
});

describe("DailyRitualLabels interface", () => {
  it("has all required fields", () => {
    const labels: DailyRitualLabels = {
      title: "Daily Ritual",
      subtitle: "Start your day right",
      todayRitual: "Today's Ritual",
      meditation: "Meditation",
      journaling: "Journaling",
      gratitude: "Gratitude",
      elementBoost: "Element Boost",
      duration: "Duration",
      complete: "Complete",
      skip: "Skip",
    };

    expect(labels.title).toBe("Daily Ritual");
    expect(labels.meditation).toBe("Meditation");
    expect(labels.complete).toBe("Complete");
    expect(labels.skip).toBe("Skip");
  });

  it("all fields are strings", () => {
    const labels: DailyRitualLabels = {
      title: "T",
      subtitle: "S",
      todayRitual: "TR",
      meditation: "M",
      journaling: "J",
      gratitude: "G",
      elementBoost: "EB",
      duration: "D",
      complete: "C",
      skip: "SK",
    };

    Object.values(labels).forEach((value) => {
      expect(typeof value).toBe("string");
    });
  });
});

describe("PsychologyLabels interface", () => {
  it("has mbti section", () => {
    const labels: PsychologyLabels = {
      mbti: {
        title: "MBTI",
        description: "Myers-Briggs Type Indicator",
      },
      big5: {
        title: "Big Five",
        openness: "Openness",
        conscientiousness: "Conscientiousness",
        extraversion: "Extraversion",
        agreeableness: "Agreeableness",
        neuroticism: "Neuroticism",
      },
    };

    expect(labels.mbti.title).toBe("MBTI");
    expect(labels.mbti.description).toContain("Myers-Briggs");
  });

  it("has big5 section with all traits", () => {
    const labels: PsychologyLabels = {
      mbti: { title: "M", description: "MD" },
      big5: {
        title: "Big Five",
        openness: "O",
        conscientiousness: "C",
        extraversion: "E",
        agreeableness: "A",
        neuroticism: "N",
      },
    };

    expect(labels.big5.title).toBe("Big Five");
    expect(labels.big5.openness).toBe("O");
    expect(labels.big5.conscientiousness).toBe("C");
    expect(labels.big5.extraversion).toBe("E");
    expect(labels.big5.agreeableness).toBe("A");
    expect(labels.big5.neuroticism).toBe("N");
  });
});

describe("MeditationLabels interface", () => {
  it("has all required fields", () => {
    const labels: MeditationLabels = {
      title: "Meditation",
      guided: "Guided Meditation",
      breathing: "Breathing Exercise",
      singingBowl: "Singing Bowl",
      nature: "Nature Sounds",
      duration: "Duration",
      start: "Start",
      pause: "Pause",
      complete: "Complete",
    };

    expect(labels.title).toBe("Meditation");
    expect(labels.guided).toBe("Guided Meditation");
    expect(labels.breathing).toBe("Breathing Exercise");
    expect(labels.singingBowl).toBe("Singing Bowl");
    expect(labels.nature).toBe("Nature Sounds");
    expect(labels.start).toBe("Start");
    expect(labels.pause).toBe("Pause");
    expect(labels.complete).toBe("Complete");
  });

  it("has meditation types", () => {
    const labels: MeditationLabels = {
      title: "T",
      guided: "G",
      breathing: "B",
      singingBowl: "SB",
      nature: "N",
      duration: "D",
      start: "S",
      pause: "P",
      complete: "C",
    };

    const meditationTypes = [labels.guided, labels.breathing, labels.singingBowl, labels.nature];
    expect(meditationTypes).toHaveLength(4);
  });
});
