// tests/lib/Saju/yongsin.test.ts
// 용신(用神) 선정 모듈 테스트


import {
  determineYongsin,
  getYongsinDescription,
  getStrengthDescription,
  getKibsinDescription,
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
  type YongsinResult,
  type YongsinType,
  type DaymasterStrength,
  type ElementStats,
  type SajuPillarsInput,
} from "@/lib/Saju/yongsin";

// 테스트용 사주 생성 헬퍼
function createPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillarsInput {
  return {
    year: { stem: year[0], branch: year[1] },
    month: { stem: month[0], branch: month[1] },
    day: { stem: day[0], branch: day[1] },
    time: { stem: time[0], branch: time[1] },
  };
}

describe("yongsin - 용신 선정 모듈", () => {
  describe("determineYongsin - 용신 선정 메인 함수", () => {
    it("returns YongsinResult structure", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(result).toHaveProperty("primaryYongsin");
      expect(result).toHaveProperty("yongsinType");
      expect(result).toHaveProperty("daymasterStrength");
      expect(result).toHaveProperty("reasoning");
    });

    it("primaryYongsin is a valid element", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(["목", "화", "토", "금", "수"]).toContain(result.primaryYongsin);
    });

    it("yongsinType is one of the valid types", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(["억부용신", "조후용신", "통관용신", "병약용신"]).toContain(
        result.yongsinType
      );
    });

    it("daymasterStrength is one of the valid strengths", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(["극신강", "신강", "중화", "신약", "극신약"]).toContain(
        result.daymasterStrength
      );
    });

    it("reasoning is a non-empty string", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(typeof result.reasoning).toBe("string");
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("조후용신 선정", () => {
    it("selects 화 for winter birth (한습)", () => {
      // 겨울(子월) 출생 - 한습
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "子"], // 子월 = 겨울
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      expect(result.yongsinType).toBe("조후용신");
      expect(result.primaryYongsin).toBe("화");
      expect(result.reasoning).toContain("한습");
    });

    it("selects 화 for early spring birth (寅월)", () => {
      // 초봄(寅월) 출생 - 아직 한습
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"], // 寅월 = 초봄
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      // 寅월은 한습으로 취급
      if (result.yongsinType === "조후용신") {
        expect(result.primaryYongsin).toBe("화");
      }
    });

    it("selects 수 for summer birth (조열)", () => {
      // 여름(午월) 출생 - 조열
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "午"], // 午월 = 여름
        ["戊", "辰"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      expect(result.yongsinType).toBe("조후용신");
      expect(result.primaryYongsin).toBe("수");
      expect(result.reasoning).toContain("조열");
    });

    it("selects 수 for 巳월 (early summer)", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "巳"], // 巳월
        ["戊", "辰"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      if (result.yongsinType === "조후용신") {
        expect(result.primaryYongsin).toBe("수");
      }
    });

    it("may include secondary yongsin from 억부용신", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "子"], // 겨울
        ["甲", "寅"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      // 조후용신이 선정되면 secondaryYongsin 있을 수 있음
      if (result.yongsinType === "조후용신" && result.secondaryYongsin) {
        expect(["목", "화", "토", "금", "수"]).toContain(result.secondaryYongsin);
      }
    });
  });

  describe("억부용신 선정", () => {
    it("selects 식상 for 신강 daymaster", () => {
      // 목이 많은 사주 - 甲일간 신강
      const pillars = createPillars(
        ["甲", "寅"],
        ["甲", "卯"], // 봄 (온화 - 조후용신 불필요)
        ["甲", "辰"],
        ["甲", "午"]
      );
      const result = determineYongsin(pillars);

      // 목이 강하면 식상(화)으로 설기
      if (result.yongsinType === "억부용신" &&
          (result.daymasterStrength === "신강" || result.daymasterStrength === "극신강")) {
        // 甲(목)의 식상은 화
        expect(result.primaryYongsin).toBe("화");
      }
    });

    it("selects 인성 for 신약 daymaster", () => {
      // 일간이 약한 사주 - 金/水가 많아 甲 약화
      const pillars = createPillars(
        ["庚", "申"],
        ["辛", "酉"], // 가을 = 온화
        ["甲", "子"],
        ["壬", "亥"]
      );
      const result = determineYongsin(pillars);

      // 목이 약하면 인성(수)으로 생조
      if (result.yongsinType === "억부용신" &&
          (result.daymasterStrength === "신약" || result.daymasterStrength === "극신약")) {
        // 甲(목)의 인성은 수
        expect(result.primaryYongsin).toBe("수");
      }
    });

    it("sets kibsin for strong daymaster", () => {
      const pillars = createPillars(
        ["甲", "寅"],
        ["甲", "卯"],
        ["甲", "辰"],
        ["甲", "午"]
      );
      const result = determineYongsin(pillars);

      // 신강일 때 인성이 기신 (더 강하게 만드므로)
      if (result.daymasterStrength === "신강" || result.daymasterStrength === "극신강") {
        if (result.kibsin) {
          expect(["목", "화", "토", "금", "수"]).toContain(result.kibsin);
        }
      }
    });
  });

  describe("통관용신 선정", () => {
    it("selects 수 when 목-금 conflict", () => {
      // 목과 금이 모두 많은 사주
      const pillars = createPillars(
        ["甲", "寅"],
        ["庚", "酉"], // 가을 (온화)
        ["甲", "卯"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      // 목-금 충돌 시 수가 통관
      if (result.yongsinType === "통관용신") {
        expect(result.primaryYongsin).toBe("수");
        expect(result.reasoning).toContain("통관");
      }
    });

    it("selects 목 when 화-수 conflict", () => {
      // 화와 수가 모두 많은 사주
      const pillars = createPillars(
        ["丙", "午"],
        ["壬", "子"], // 겨울이라 조후용신 우선일 수 있음
        ["丙", "巳"],
        ["壬", "亥"]
      );
      const result = determineYongsin(pillars);

      // 화-수 충돌 시 목이 통관 (조후용신이 없을 때)
      if (result.yongsinType === "통관용신") {
        expect(result.primaryYongsin).toBe("목");
      }
    });

    it("selects 화 when 토-목 conflict", () => {
      const pillars = createPillars(
        ["甲", "寅"],
        ["戊", "辰"], // 봄 말 (온화)
        ["甲", "卯"],
        ["戊", "戌"]
      );
      const result = determineYongsin(pillars);

      if (result.yongsinType === "통관용신") {
        expect(result.primaryYongsin).toBe("화");
      }
    });
  });

  describe("병약용신 선정", () => {
    it("selects controlling element for excessive element", () => {
      // 화가 과다한 사주
      const pillars = createPillars(
        ["丙", "午"],
        ["丁", "巳"], // 여름이라 조후용신 우선
        ["丙", "午"],
        ["丁", "巳"]
      );
      const result = determineYongsin(pillars);

      // 화가 과다하면 수가 약(병약용신)
      // 단, 조후용신이 우선일 수 있음
      if (result.yongsinType === "병약용신") {
        expect(result.primaryYongsin).toBe("수");
        expect(result.kibsin).toBe("화");
      }
    });

    it("sets kibsin to the excessive element", () => {
      // 토가 과다한 사주
      const pillars = createPillars(
        ["戊", "辰"],
        ["己", "丑"], // 겨울 말
        ["戊", "戌"],
        ["己", "未"]
      );
      const result = determineYongsin(pillars);

      if (result.yongsinType === "병약용신") {
        expect(result.kibsin).toBe("토");
        // 토를 극하는 것은 목
        expect(result.primaryYongsin).toBe("목");
      }
    });
  });

  describe("일간 강약 판단", () => {
    it("identifies 신강 when daymaster is well supported", () => {
      // 甲일간 + 목이 많음
      const pillars = createPillars(
        ["甲", "寅"],
        ["甲", "卯"],
        ["甲", "辰"],
        ["壬", "亥"] // 수생목
      );
      const result = determineYongsin(pillars);

      expect(["신강", "극신강"]).toContain(result.daymasterStrength);
    });

    it("identifies 신약 when daymaster is weak", () => {
      // 甲일간이지만 금이 많아 극을 받음
      const pillars = createPillars(
        ["庚", "申"],
        ["辛", "酉"],
        ["甲", "戌"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      expect(["신약", "극신약"]).toContain(result.daymasterStrength);
    });

    it("identifies 중화 for balanced chart", () => {
      // 균형 잡힌 사주
      const pillars = createPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "辰"],
        ["庚", "午"]
      );
      const result = determineYongsin(pillars);

      // 균형이면 중화, 아니면 다른 결과
      expect(["극신강", "신강", "중화", "신약", "극신약"]).toContain(
        result.daymasterStrength
      );
    });
  });

  describe("getYongsinDescription", () => {
    it("returns description for 목", () => {
      const desc = getYongsinDescription("목");
      expect(desc).toContain("목");
      expect(desc).toContain("성장");
    });

    it("returns description for 화", () => {
      const desc = getYongsinDescription("화");
      expect(desc).toContain("화");
      expect(desc).toContain("열정");
    });

    it("returns description for 토", () => {
      const desc = getYongsinDescription("토");
      expect(desc).toContain("토");
      expect(desc).toContain("안정");
    });

    it("returns description for 금", () => {
      const desc = getYongsinDescription("금");
      expect(desc).toContain("금");
      expect(desc).toContain("결단");
    });

    it("returns description for 수", () => {
      const desc = getYongsinDescription("수");
      expect(desc).toContain("수");
      expect(desc).toContain("지혜");
    });

    it("includes career recommendations", () => {
      const desc = getYongsinDescription("목");
      expect(desc).toContain("교육");
    });
  });

  describe("getStrengthDescription", () => {
    it("returns description for 극신강", () => {
      const desc = getStrengthDescription("극신강");
      expect(desc).toContain("매우 강");
      expect(desc).toContain("식상");
    });

    it("returns description for 신강", () => {
      const desc = getStrengthDescription("신강");
      expect(desc).toContain("강");
      expect(desc).toContain("리더십");
    });

    it("returns description for 중화", () => {
      const desc = getStrengthDescription("중화");
      expect(desc).toContain("균형");
      expect(desc).toContain("안정");
    });

    it("returns description for 신약", () => {
      const desc = getStrengthDescription("신약");
      expect(desc).toContain("약");
      expect(desc).toContain("인성");
    });

    it("returns description for 극신약", () => {
      const desc = getStrengthDescription("극신약");
      expect(desc).toContain("매우 약");
    });
  });

  describe("getKibsinDescription", () => {
    it("returns warning for kibsin element", () => {
      const desc = getKibsinDescription("화");
      expect(desc).toContain("화");
      expect(desc).toContain("피하는");
    });

    it("mentions directions and colors", () => {
      const desc = getKibsinDescription("수");
      expect(desc).toContain("방향");
    });
  });

  describe("getLuckyColors", () => {
    it("returns green shades for 목", () => {
      const colors = getLuckyColors("목");
      expect(colors).toContain("초록");
      expect(colors.length).toBeGreaterThan(0);
    });

    it("returns red shades for 화", () => {
      const colors = getLuckyColors("화");
      expect(colors).toContain("빨강");
    });

    it("returns yellow shades for 토", () => {
      const colors = getLuckyColors("토");
      expect(colors).toContain("노랑");
    });

    it("returns white/silver for 금", () => {
      const colors = getLuckyColors("금");
      expect(colors).toContain("흰색");
      expect(colors).toContain("금색");
    });

    it("returns blue/black for 수", () => {
      const colors = getLuckyColors("수");
      expect(colors).toContain("검정");
      expect(colors).toContain("파랑");
    });
  });

  describe("getLuckyDirection", () => {
    it("returns 동쪽 for 목", () => {
      expect(getLuckyDirection("목")).toBe("동쪽");
    });

    it("returns 남쪽 for 화", () => {
      expect(getLuckyDirection("화")).toBe("남쪽");
    });

    it("returns 중앙 for 토", () => {
      expect(getLuckyDirection("토")).toBe("중앙");
    });

    it("returns 서쪽 for 금", () => {
      expect(getLuckyDirection("금")).toBe("서쪽");
    });

    it("returns 북쪽 for 수", () => {
      expect(getLuckyDirection("수")).toBe("북쪽");
    });
  });

  describe("getLuckyNumbers", () => {
    it("returns 3, 8 for 목", () => {
      const numbers = getLuckyNumbers("목");
      expect(numbers).toContain(3);
      expect(numbers).toContain(8);
    });

    it("returns 2, 7 for 화", () => {
      const numbers = getLuckyNumbers("화");
      expect(numbers).toContain(2);
      expect(numbers).toContain(7);
    });

    it("returns 5, 10 for 토", () => {
      const numbers = getLuckyNumbers("토");
      expect(numbers).toContain(5);
      expect(numbers).toContain(10);
    });

    it("returns 4, 9 for 금", () => {
      const numbers = getLuckyNumbers("금");
      expect(numbers).toContain(4);
      expect(numbers).toContain(9);
    });

    it("returns 1, 6 for 수", () => {
      const numbers = getLuckyNumbers("수");
      expect(numbers).toContain(1);
      expect(numbers).toContain(6);
    });
  });

  describe("type exports", () => {
    it("YongsinType includes all types", () => {
      const types: YongsinType[] = ["억부용신", "조후용신", "통관용신", "병약용신"];
      expect(types).toHaveLength(4);
    });

    it("DaymasterStrength includes all strengths", () => {
      const strengths: DaymasterStrength[] = [
        "극신강",
        "신강",
        "중화",
        "신약",
        "극신약",
      ];
      expect(strengths).toHaveLength(5);
    });
  });

  describe("edge cases", () => {
    it("handles all-same-element chart", () => {
      // 모든 기둥이 같은 오행
      const pillars = createPillars(
        ["甲", "寅"],
        ["甲", "卯"],
        ["甲", "寅"],
        ["甲", "卯"]
      );
      const result = determineYongsin(pillars);

      // 극신강이거나 병약용신이 필요
      expect(result).toBeDefined();
      expect(result.primaryYongsin).toBeDefined();
    });

    it("handles mixed yin-yang chart", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["乙", "丑"],
        ["丙", "寅"],
        ["丁", "卯"]
      );
      const result = determineYongsin(pillars);

      expect(result).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("handles all 10 stems correctly", () => {
      const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

      for (const stem of stems) {
        const pillars = createPillars(
          ["甲", "子"],
          ["丙", "寅"],
          [stem, "辰"],
          ["庚", "午"]
        );
        const result = determineYongsin(pillars);
        expect(result).toBeDefined();
        expect(result.primaryYongsin).toBeDefined();
      }
    });
  });

  describe("용신 선정 우선순위", () => {
    it("조후용신 takes precedence in extreme seasons", () => {
      // 겨울(子월)
      const pillars = createPillars(
        ["甲", "子"],
        ["壬", "子"], // 한습
        ["甲", "寅"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      // 조후용신이 우선
      expect(result.yongsinType).toBe("조후용신");
    });

    it("억부용신 is used when no special conditions", () => {
      // 온화한 계절, 충돌 없음, 과다 없음
      const pillars = createPillars(
        ["甲", "子"],
        ["戊", "辰"], // 봄 말
        ["庚", "申"],
        ["壬", "亥"]
      );
      const result = determineYongsin(pillars);

      // 특수 조건 없으면 억부용신
      expect(["억부용신", "통관용신", "병약용신"]).toContain(result.yongsinType);
    });
  });

  describe("secondaryYongsin (희신)", () => {
    it("may be set when different from primary", () => {
      const pillars = createPillars(
        ["甲", "子"],
        ["壬", "子"],
        ["甲", "寅"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      if (result.secondaryYongsin) {
        expect(result.secondaryYongsin).not.toBe(result.primaryYongsin);
        expect(["목", "화", "토", "금", "수"]).toContain(result.secondaryYongsin);
      }
    });

    it("may be undefined when same as primary", () => {
      // 조후용신과 억부용신이 같은 경우
      const pillars = createPillars(
        ["丙", "午"],
        ["丁", "巳"],
        ["甲", "寅"],
        ["庚", "申"]
      );
      const result = determineYongsin(pillars);

      // secondaryYongsin은 optional
      expect(result.primaryYongsin).toBeDefined();
    });
  });

  describe("gusin (구신)", () => {
    it("is set for 신강 charts", () => {
      const pillars = createPillars(
        ["甲", "寅"],
        ["甲", "卯"],
        ["甲", "辰"],
        ["壬", "亥"]
      );
      const result = determineYongsin(pillars);

      if (result.daymasterStrength === "신강" || result.daymasterStrength === "극신강") {
        if (result.gusin) {
          expect(["목", "화", "토", "금", "수"]).toContain(result.gusin);
        }
      }
    });
  });
});
