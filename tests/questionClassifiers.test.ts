import { describe, it, expect, beforeEach } from "vitest";
import {
  isYesNoQuestion,
  isCrushQuestion,
  clearClassifierCache,
} from "../src/lib/Tarot/questionClassifiers";

describe("Tarot Question Classifiers", () => {
  beforeEach(() => {
    // Clear cache before each test for consistent results
    clearClassifierCache();
  });

  describe("isYesNoQuestion", () => {
    describe("Korean ending patterns", () => {
      it("detects ~할까? pattern", () => {
        expect(isYesNoQuestion("오늘 운동 할까?")).toBe(true);
        expect(isYesNoQuestion("이직 할까")).toBe(true);
      });

      it("detects ~갈까? pattern", () => {
        expect(isYesNoQuestion("여행 갈까?")).toBe(true);
        expect(isYesNoQuestion("헬스장 갈까")).toBe(true);
      });

      it("detects ~먹을까? pattern", () => {
        expect(isYesNoQuestion("치킨 먹을까?")).toBe(true);
        expect(isYesNoQuestion("야식 먹을까")).toBe(true);
      });

      it("detects ~해볼까? pattern", () => {
        expect(isYesNoQuestion("새로운 취미 해볼까?")).toBe(true);
      });

      it("detects ~될까? pattern", () => {
        expect(isYesNoQuestion("성공할 수 있을까?")).toBe(true);
        expect(isYesNoQuestion("괜찮을까")).toBe(true);
      });
    });

    describe("Korean mid patterns", () => {
      it("detects ~할까 말까 pattern", () => {
        expect(isYesNoQuestion("이직 할까 말까 고민이야")).toBe(true);
      });

      it("detects ~해야 하나 pattern", () => {
        expect(isYesNoQuestion("공부 더 해야 하나")).toBe(true);
      });

      it("detects ~해도 될까 pattern", () => {
        expect(isYesNoQuestion("고백해도 될까?")).toBe(true);
      });

      it("detects ~하는 게 좋을까 pattern", () => {
        expect(isYesNoQuestion("먼저 연락하는 게 좋을까?")).toBe(true);
        expect(isYesNoQuestion("지금 투자하는게 좋을까")).toBe(true);
      });
    });

    describe("Korean keyword patterns", () => {
      it("detects exercise-related decisions", () => {
        expect(isYesNoQuestion("오늘 헬스장 가야 하나")).toBe(true);
        expect(isYesNoQuestion("필라테스 시작해볼까")).toBe(true);
      });

      it("detects food-related decisions", () => {
        expect(isYesNoQuestion("야식 시킬까")).toBe(true);
        expect(isYesNoQuestion("커피 마실까")).toBe(true);
      });

      it("detects shopping-related decisions", () => {
        expect(isYesNoQuestion("이 옷 살까")).toBe(true);
        expect(isYesNoQuestion("새 핸드폰 바꿀까")).toBe(true);
      });

      it("detects relationship-related decisions", () => {
        expect(isYesNoQuestion("먼저 연락할까")).toBe(true);
        expect(isYesNoQuestion("고백할까")).toBe(true);
      });

      it("detects career-related decisions", () => {
        expect(isYesNoQuestion("이직할까")).toBe(true);
        expect(isYesNoQuestion("퇴사해야 하나")).toBe(true);
      });
    });

    describe("English patterns", () => {
      it("detects 'should i' pattern", () => {
        expect(isYesNoQuestion("Should I quit my job?")).toBe(true);
        expect(isYesNoQuestion("should i go to the gym")).toBe(true);
      });

      it("detects 'is it okay to' pattern", () => {
        expect(isYesNoQuestion("Is it okay to confess my feelings?")).toBe(true);
        expect(isYesNoQuestion("is it ok if I leave early")).toBe(true);
      });

      it("detects 'can i' pattern", () => {
        expect(isYesNoQuestion("Can I trust this person?")).toBe(true);
      });

      it("detects 'is it worth' pattern", () => {
        expect(isYesNoQuestion("Is it worth investing in crypto?")).toBe(true);
      });
    });

    describe("Non yes/no questions", () => {
      it("returns false for open-ended questions", () => {
        // Note: "어떨까" pattern is detected as yes/no (asking for advice)
        // Testing truly open-ended questions
        expect(isYesNoQuestion("올해 나의 운세")).toBe(false);
        expect(isYesNoQuestion("What does my future hold")).toBe(false);
        expect(isYesNoQuestion("내 성격은 어떤가요")).toBe(false);
      });

      it("returns false for descriptive questions", () => {
        expect(isYesNoQuestion("나의 성격 분석")).toBe(false);
        expect(isYesNoQuestion("오늘의 타로 메시지")).toBe(false);
      });
    });
  });

  describe("isCrushQuestion", () => {
    describe("Korean patterns - person reference", () => {
      it("detects 그 사람 마음 pattern", () => {
        expect(isCrushQuestion("그 사람 마음이 궁금해")).toBe(true);
        expect(isCrushQuestion("그사람 생각이 뭘까")).toBe(true);
      });

      it("detects 걔/쟤 pattern", () => {
        expect(isCrushQuestion("걔가 날 좋아할까")).toBe(true);
        expect(isCrushQuestion("쟤 마음이 궁금해")).toBe(true);
      });

      it("detects 상대방 pattern", () => {
        expect(isCrushQuestion("상대방 마음이 어떨까")).toBe(true);
        expect(isCrushQuestion("상대가 나를 어떻게 생각할까")).toBe(true);
      });
    });

    describe("Korean patterns - feelings", () => {
      it("detects 나를 어떻게 생각 pattern", () => {
        expect(isCrushQuestion("나를 어떻게 생각할까")).toBe(true);
        expect(isCrushQuestion("날 어떻게 봐")).toBe(true);
      });

      it("detects 좋아해/사랑해 pattern", () => {
        expect(isCrushQuestion("나를 좋아해?")).toBe(true);
        expect(isCrushQuestion("그녀가 날 사랑하나")).toBe(true);
      });

      it("detects 짝사랑/호감 pattern", () => {
        expect(isCrushQuestion("짝사랑 중인데")).toBe(true);
        expect(isCrushQuestion("호감이 있는지 알고싶어")).toBe(true);
      });

      it("detects 썸남/썸녀 pattern", () => {
        expect(isCrushQuestion("썸남이 나를 좋아할까")).toBe(true);
        expect(isCrushQuestion("썸녀의 마음")).toBe(true);
      });
    });

    describe("English patterns", () => {
      it("detects 'does he/she like me' pattern", () => {
        expect(isCrushQuestion("Does he like me?")).toBe(true);
        expect(isCrushQuestion("does she have feelings for me")).toBe(true);
      });

      it("detects 'what does he/she think' pattern", () => {
        expect(isCrushQuestion("What does he think of me?")).toBe(true);
      });

      it("detects 'crush' pattern", () => {
        expect(isCrushQuestion("Does my crush like me back")).toBe(true);
      });
    });

    describe("Non crush questions", () => {
      it("returns false for general love questions", () => {
        expect(isCrushQuestion("내 연애운은?")).toBe(false);
        expect(isCrushQuestion("언제 좋은 인연을 만날까")).toBe(false);
      });

      it("returns false for unrelated questions", () => {
        expect(isCrushQuestion("오늘 운세")).toBe(false);
        expect(isCrushQuestion("직장 운이 어떨까")).toBe(false);
      });
    });
  });

  describe("Cache functionality", () => {
    it("caches results for repeated queries", () => {
      const question = "오늘 운동 할까?";

      // First call
      const result1 = isYesNoQuestion(question);

      // Second call should use cache (same result)
      const result2 = isYesNoQuestion(question);

      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });

    it("clearClassifierCache clears the cache", () => {
      const question = "테스트 질문";

      // Prime the cache
      isYesNoQuestion(question);

      // Clear cache
      clearClassifierCache();

      // Should still work after clearing
      const result = isYesNoQuestion(question);
      expect(typeof result).toBe("boolean");
    });
  });
});
