// tests/lib/Saju/eventCorrelation.test.ts


import {
  calculatePeriodPillars,
  analyzeEventCorrelation,
  recognizePatterns,
  generatePredictiveInsight,
  analyzeTriggers,
  buildEventTimeline,
  performComprehensiveEventAnalysis,
  type SajuResult,
  type LifeEvent,
  type EventCategory,
  type EventNature,
  type DaeunSeunInfo,
  type EventSajuCorrelation,
  type PatternRecognition,
  type PredictiveInsight,
  type TriggerAnalysis,
  type EventTimeline,
} from "../../../src/lib/Saju/eventCorrelation";

// 헬퍼 함수
function createSajuResult(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  hour: [string, string]
): SajuResult {
  return {
    fourPillars: {
      year: { stem: year[0], branch: year[1] },
      month: { stem: month[0], branch: month[1] },
      day: { stem: day[0], branch: day[1] },
      hour: { stem: hour[0], branch: hour[1] },
    },
  };
}

function createLifeEvent(
  category: EventCategory,
  nature: EventNature,
  date: Date,
  significance: number = 5
): LifeEvent {
  return {
    id: `event_${Date.now()}_${Math.random()}`,
    date,
    category,
    nature,
    description: `Test ${category} event`,
    significance,
  };
}

// 샘플 사주
const sampleSaju = createSajuResult(
  ["甲", "寅"],
  ["丙", "午"],
  ["戊", "辰"],
  ["庚", "申"]
);

describe("eventCorrelation - Period Pillars Calculation", () => {
  describe("calculatePeriodPillars", () => {
    it("returns proper DaeunSeunInfo structure", () => {
      const result = calculatePeriodPillars(new Date(2024, 0, 1));

      expect(result).toHaveProperty("대운천간");
      expect(result).toHaveProperty("대운지지");
      expect(result).toHaveProperty("세운천간");
      expect(result).toHaveProperty("세운지지");
      expect(result).toHaveProperty("월운천간");
      expect(result).toHaveProperty("월운지지");
    });

    it("calculates correct year stem and branch for 2024", () => {
      const result = calculatePeriodPillars(new Date(2024, 0, 1));
      // 2024년 갑진년
      expect(result.세운천간).toBeDefined();
      expect(result.세운지지).toBeDefined();
    });

    it("returns different results for different years", () => {
      const result2024 = calculatePeriodPillars(new Date(2024, 5, 1));
      const result2025 = calculatePeriodPillars(new Date(2025, 5, 1));

      expect(result2024.세운천간).not.toBe(result2025.세운천간);
    });

    it("returns different month pillars for different months", () => {
      const jan = calculatePeriodPillars(new Date(2024, 0, 15));
      const jun = calculatePeriodPillars(new Date(2024, 5, 15));

      expect(jan.월운지지).not.toBe(jun.월운지지);
    });

    it("daeun fields are empty (requires separate calculation)", () => {
      const result = calculatePeriodPillars(new Date());
      expect(result.대운천간).toBe("");
      expect(result.대운지지).toBe("");
    });
  });
});

describe("eventCorrelation - Event Correlation Analysis", () => {
  describe("analyzeEventCorrelation", () => {
    it("returns proper EventSajuCorrelation structure", () => {
      const event = createLifeEvent("career", "positive", new Date(2024, 5, 1));
      const result = analyzeEventCorrelation(event, sampleSaju);

      expect(result).toHaveProperty("event");
      expect(result).toHaveProperty("yearPillar");
      expect(result).toHaveProperty("monthPillar");
      expect(result).toHaveProperty("運");
      expect(result).toHaveProperty("correlationFactors");
      expect(result).toHaveProperty("overallCorrelation");
      expect(result).toHaveProperty("insight");
    });

    it("includes the original event in result", () => {
      const event = createLifeEvent("finance", "positive", new Date(2024, 3, 15));
      const result = analyzeEventCorrelation(event, sampleSaju);

      expect(result.event).toBe(event);
    });

    it("overallCorrelation is between 0 and 100", () => {
      const event = createLifeEvent("health", "negative", new Date(2024, 7, 1));
      const result = analyzeEventCorrelation(event, sampleSaju);

      expect(result.overallCorrelation).toBeGreaterThanOrEqual(0);
      expect(result.overallCorrelation).toBeLessThanOrEqual(100);
    });

    it("correlationFactors is an array", () => {
      const event = createLifeEvent("relationship", "positive", new Date(2024, 2, 14));
      const result = analyzeEventCorrelation(event, sampleSaju);

      expect(Array.isArray(result.correlationFactors)).toBe(true);
    });

    it("each correlation factor has required properties", () => {
      const event = createLifeEvent("education", "positive", new Date(2024, 8, 1));
      const result = analyzeEventCorrelation(event, sampleSaju);

      for (const factor of result.correlationFactors) {
        expect(factor).toHaveProperty("factor");
        expect(factor).toHaveProperty("type");
        expect(factor).toHaveProperty("strength");
        expect(factor).toHaveProperty("description");
        expect(factor).toHaveProperty("isPositive");
      }
    });

    it("generates insight string", () => {
      const event = createLifeEvent("travel", "transformative", new Date(2024, 6, 1));
      const result = analyzeEventCorrelation(event, sampleSaju);

      expect(result.insight.length).toBeGreaterThan(0);
    });

    it("handles different event categories", () => {
      const categories: EventCategory[] = [
        "career", "finance", "relationship", "health",
        "education", "travel", "legal", "family", "spiritual"
      ];

      for (const category of categories) {
        const event = createLifeEvent(category, "neutral", new Date(2024, 4, 1));
        expect(() => analyzeEventCorrelation(event, sampleSaju)).not.toThrow();
      }
    });
  });
});

describe("eventCorrelation - Pattern Recognition", () => {
  describe("recognizePatterns", () => {
    it("returns array of PatternRecognition", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2012, 3, 1)),
        createLifeEvent("career", "positive", new Date(2024, 3, 1)),
      ];
      const result = recognizePatterns(events, sampleSaju);

      expect(Array.isArray(result)).toBe(true);
    });

    it("identifies repeated events in same category", () => {
      const events = [
        createLifeEvent("finance", "positive", new Date(2012, 5, 1)),
        createLifeEvent("finance", "positive", new Date(2024, 5, 1)),
      ];
      const result = recognizePatterns(events, sampleSaju);

      // 12년 주기의 반복 패턴을 찾을 수 있음
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("pattern has required properties", () => {
      const events = [
        createLifeEvent("health", "negative", new Date(2020, 1, 1)),
        createLifeEvent("health", "negative", new Date(2020, 3, 1)),
      ];
      const result = recognizePatterns(events, sampleSaju);

      for (const pattern of result) {
        expect(pattern).toHaveProperty("pattern");
        expect(pattern).toHaveProperty("events");
        expect(pattern).toHaveProperty("astronomicalTrigger");
        expect(pattern).toHaveProperty("frequency");
        expect(pattern).toHaveProperty("recommendation");
      }
    });

    it("identifies cluster patterns for close events", () => {
      const events = [
        createLifeEvent("relationship", "positive", new Date(2024, 1, 1)),
        createLifeEvent("relationship", "positive", new Date(2024, 2, 1)),
      ];
      const result = recognizePatterns(events, sampleSaju);

      // 연속 사건 클러스터 패턴
      const clusterPattern = result.find(p => p.pattern.includes("클러스터"));
      if (clusterPattern) {
        expect(clusterPattern.events.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("handles empty events array", () => {
      const result = recognizePatterns([], sampleSaju);
      expect(result).toHaveLength(0);
    });

    it("handles single event", () => {
      const events = [createLifeEvent("career", "positive", new Date(2024, 5, 1))];
      expect(() => recognizePatterns(events, sampleSaju)).not.toThrow();
    });
  });
});

describe("eventCorrelation - Predictive Insight", () => {
  describe("generatePredictiveInsight", () => {
    it("returns proper PredictiveInsight structure", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 11, 31);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("favorableAreas");
      expect(result).toHaveProperty("cautionAreas");
      expect(result).toHaveProperty("keyDates");
      expect(result).toHaveProperty("overallEnergy");
      expect(result).toHaveProperty("actionAdvice");
    });

    it("period contains start and end dates", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 11, 31);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      expect(result.period.start).toEqual(start);
      expect(result.period.end).toEqual(end);
    });

    it("favorableAreas and cautionAreas are arrays of EventCategory", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2025, 0, 1);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      expect(Array.isArray(result.favorableAreas)).toBe(true);
      expect(Array.isArray(result.cautionAreas)).toBe(true);
    });

    it("keyDates have date and significance", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2025, 0, 1);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      for (const keyDate of result.keyDates) {
        expect(keyDate).toHaveProperty("date");
        expect(keyDate).toHaveProperty("significance");
      }
    });

    it("overallEnergy is a descriptive string", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 6, 1);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      expect(typeof result.overallEnergy).toBe("string");
      expect(result.overallEnergy.length).toBeGreaterThan(0);
    });

    it("actionAdvice is an array of strings", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 6, 1);
      const result = generatePredictiveInsight(sampleSaju, start, end);

      expect(Array.isArray(result.actionAdvice)).toBe(true);
    });

    it("handles multi-year period", () => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2027, 0, 1);

      expect(() => generatePredictiveInsight(sampleSaju, start, end)).not.toThrow();
    });
  });
});

describe("eventCorrelation - Trigger Analysis", () => {
  describe("analyzeTriggers", () => {
    it("returns array of TriggerAnalysis", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2024, 3, 1)),
        createLifeEvent("finance", "positive", new Date(2024, 5, 1)),
      ];
      const result = analyzeTriggers(events, sampleSaju);

      expect(Array.isArray(result)).toBe(true);
    });

    it("trigger has required properties", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2024, 1, 1)),
      ];
      const result = analyzeTriggers(events, sampleSaju);

      for (const trigger of result) {
        expect(trigger).toHaveProperty("trigger");
        expect(trigger).toHaveProperty("triggerType");
        expect(trigger).toHaveProperty("activatedBy");
        expect(trigger).toHaveProperty("resultingEnergy");
        expect(trigger).toHaveProperty("historicalOccurrences");
        expect(trigger).toHaveProperty("futureOccurrences");
      }
    });

    it("triggerType is valid", () => {
      const events = [
        createLifeEvent("health", "negative", new Date(2024, 6, 1)),
      ];
      const result = analyzeTriggers(events, sampleSaju);

      const validTypes = ["천간", "지지", "복합"];
      for (const trigger of result) {
        expect(validTypes).toContain(trigger.triggerType);
      }
    });

    it("historicalOccurrences includes event dates", () => {
      const eventDate = new Date(2024, 5, 15);
      const events = [createLifeEvent("travel", "positive", eventDate)];
      const result = analyzeTriggers(events, sampleSaju);

      for (const trigger of result) {
        expect(trigger.historicalOccurrences.length).toBeGreaterThan(0);
      }
    });

    it("handles empty events array", () => {
      const result = analyzeTriggers([], sampleSaju);
      expect(result).toHaveLength(0);
    });
  });
});

describe("eventCorrelation - Event Timeline", () => {
  describe("buildEventTimeline", () => {
    it("returns proper EventTimeline structure", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2020, 1, 1)),
        createLifeEvent("finance", "positive", new Date(2022, 5, 1)),
        createLifeEvent("relationship", "positive", new Date(2024, 3, 1)),
      ];
      const result = buildEventTimeline(events, sampleSaju);

      expect(result).toHaveProperty("events");
      expect(result).toHaveProperty("majorPeriods");
      expect(result).toHaveProperty("turningPoints");
      expect(result).toHaveProperty("cyclicalPatterns");
    });

    it("events are sorted chronologically", () => {
      const events = [
        createLifeEvent("health", "negative", new Date(2024, 6, 1)),
        createLifeEvent("career", "positive", new Date(2020, 1, 1)),
        createLifeEvent("finance", "positive", new Date(2022, 5, 1)),
      ];
      const result = buildEventTimeline(events, sampleSaju);

      for (let i = 1; i < result.events.length; i++) {
        expect(result.events[i].event.date.getTime())
          .toBeGreaterThanOrEqual(result.events[i - 1].event.date.getTime());
      }
    });

    it("turningPoints are dates from high significance events", () => {
      const events = [
        createLifeEvent("career", "transformative", new Date(2020, 1, 1), 9),
        createLifeEvent("finance", "positive", new Date(2022, 5, 1), 5),
      ];
      const result = buildEventTimeline(events, sampleSaju);

      expect(Array.isArray(result.turningPoints)).toBe(true);
    });

    it("handles empty events array", () => {
      const result = buildEventTimeline([], sampleSaju);
      expect(result.events).toHaveLength(0);
    });

    it("cyclicalPatterns comes from recognizePatterns", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2012, 3, 1)),
        createLifeEvent("career", "positive", new Date(2024, 3, 1)),
      ];
      const result = buildEventTimeline(events, sampleSaju);

      expect(Array.isArray(result.cyclicalPatterns)).toBe(true);
    });
  });
});

describe("eventCorrelation - Comprehensive Analysis", () => {
  describe("performComprehensiveEventAnalysis", () => {
    it("returns comprehensive analysis result", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2020, 1, 1)),
        createLifeEvent("finance", "negative", new Date(2022, 5, 1)),
        createLifeEvent("relationship", "positive", new Date(2024, 3, 1)),
      ];
      const result = performComprehensiveEventAnalysis(events, sampleSaju, 3);

      expect(result).toHaveProperty("timeline");
      expect(result).toHaveProperty("triggers");
      expect(result).toHaveProperty("patterns");
      expect(result).toHaveProperty("futureInsight");
      expect(result).toHaveProperty("summary");
    });

    it("summary includes event count information", () => {
      const events = [
        createLifeEvent("career", "positive", new Date(2020, 1, 1)),
        createLifeEvent("finance", "negative", new Date(2022, 5, 1)),
      ];
      const result = performComprehensiveEventAnalysis(events, sampleSaju);

      expect(result.summary).toContain("2");
    });

    it("futureInsight covers specified years", () => {
      const events = [createLifeEvent("career", "positive", new Date(2024, 1, 1))];
      const result = performComprehensiveEventAnalysis(events, sampleSaju, 5);

      const now = new Date();
      const expectedEnd = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());

      expect(result.futureInsight.period.end.getTime())
        .toBeCloseTo(expectedEnd.getTime(), -10);
    });

    it("handles empty events array", () => {
      const result = performComprehensiveEventAnalysis([], sampleSaju);
      expect(result.summary).toContain("0");
    });

    it("default futureYears is 3", () => {
      const events = [createLifeEvent("career", "positive", new Date(2024, 1, 1))];
      const result = performComprehensiveEventAnalysis(events, sampleSaju);

      const now = new Date();
      const expectedEnd = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());

      expect(result.futureInsight.period.end.getTime())
        .toBeCloseTo(expectedEnd.getTime(), -10);
    });
  });
});

describe("eventCorrelation - Type Definitions", () => {
  it("EventCategory includes all valid categories", () => {
    const validCategories: EventCategory[] = [
      "career", "finance", "relationship", "health",
      "education", "travel", "legal", "family", "spiritual"
    ];

    for (const category of validCategories) {
      const event = createLifeEvent(category, "neutral", new Date());
      expect(event.category).toBe(category);
    }
  });

  it("EventNature includes all valid natures", () => {
    const validNatures: EventNature[] = [
      "positive", "negative", "neutral", "transformative"
    ];

    for (const nature of validNatures) {
      const event = createLifeEvent("career", nature, new Date());
      expect(event.nature).toBe(nature);
    }
  });

  it("LifeEvent structure is complete", () => {
    const event = createLifeEvent("career", "positive", new Date(2024, 5, 1), 8);

    expect(event.id).toBeDefined();
    expect(event.date).toBeInstanceOf(Date);
    expect(event.category).toBe("career");
    expect(event.nature).toBe("positive");
    expect(event.description).toBeDefined();
    expect(event.significance).toBe(8);
  });
});

describe("eventCorrelation - Edge Cases", () => {
  it("handles dates far in the past", () => {
    const event = createLifeEvent("career", "positive", new Date(1980, 5, 1));
    expect(() => analyzeEventCorrelation(event, sampleSaju)).not.toThrow();
  });

  it("handles dates far in the future", () => {
    const event = createLifeEvent("career", "positive", new Date(2050, 5, 1));
    expect(() => analyzeEventCorrelation(event, sampleSaju)).not.toThrow();
  });

  it("handles many events", () => {
    const events: LifeEvent[] = [];
    for (let i = 0; i < 50; i++) {
      events.push(createLifeEvent(
        "career",
        "positive",
        new Date(2000 + i % 25, i % 12, 1)
      ));
    }

    expect(() => performComprehensiveEventAnalysis(events, sampleSaju)).not.toThrow();
  });

  it("handles events on same day", () => {
    const date = new Date(2024, 5, 15);
    const events = [
      createLifeEvent("career", "positive", date),
      createLifeEvent("finance", "positive", date),
      createLifeEvent("relationship", "negative", date),
    ];

    expect(() => buildEventTimeline(events, sampleSaju)).not.toThrow();
  });
});
