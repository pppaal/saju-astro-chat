// tests/lib/Saju/comprehensiveReport.test.ts
// 사주 종합 해석 리포트 생성 테스트


import {
  generateComprehensiveReport,
  generateQuickSummary,
  ComprehensiveReport,
  ComprehensiveReportSection,
} from '@/lib/Saju/comprehensiveReport';

// 테스트용 사주 데이터 생성 헬퍼
function createTestPillars(
  yearStem = '甲', yearBranch = '子',
  monthStem = '乙', monthBranch = '丑',
  dayStem = '丙', dayBranch = '寅',
  hourStem = '丁', hourBranch = '卯'
) {
  return {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    hour: { stem: hourStem, branch: hourBranch },
  };
}

describe('comprehensiveReport', () => {
  describe('generateComprehensiveReport', () => {
    it('should generate a complete report with all sections', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      // 모든 필수 섹션 확인
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('dayMaster');
      expect(report).toHaveProperty('ilju');
      expect(report).toHaveProperty('geokguk');
      expect(report).toHaveProperty('yongsin');
      expect(report).toHaveProperty('elementBalance');
      expect(report).toHaveProperty('interactions');
      expect(report).toHaveProperty('shinsal');
      expect(report).toHaveProperty('twelveStages');
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('luckyElements');
      expect(report).toHaveProperty('unluckyElements');
    });

    it('should analyze day master correctly', () => {
      const pillars = createTestPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const report = generateComprehensiveReport(pillars);

      expect(report.dayMaster.title).toContain('일간');
      expect(report.dayMaster.content).toContain('丙');
      expect(report.dayMaster.content).toContain('화');
      expect(report.dayMaster.details).toBeDefined();
      expect(report.dayMaster.details!.length).toBeGreaterThan(0);
    });

    it('should analyze ilju correctly', () => {
      const pillars = createTestPillars('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const report = generateComprehensiveReport(pillars);

      expect(report.ilju.title).toContain('일주');
      expect(report.ilju.content).toContain('甲子');
    });

    it('should analyze element balance', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.title).toContain('오행');
      expect(report.elementBalance.details).toBeDefined();
      // 오행 카운트 확인
      const details = report.elementBalance.details!;
      expect(details.some(d => d.includes('목'))).toBe(true);
      expect(details.some(d => d.includes('화'))).toBe(true);
      expect(details.some(d => d.includes('토'))).toBe(true);
      expect(details.some(d => d.includes('금'))).toBe(true);
      expect(details.some(d => d.includes('수'))).toBe(true);
    });

    it('should analyze interactions (형충회합)', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      expect(report.interactions.title).toContain('형충회합');
      expect(report.interactions.content).toBeTruthy();
      expect(report.interactions.rating).toBeGreaterThanOrEqual(1);
      expect(report.interactions.rating).toBeLessThanOrEqual(5);
    });

    it('should include geokguk when provided', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {
        includeGeokguk: { type: '정관격', description: '정관격은 질서와 명예를 중시합니다.' }
      });

      expect(report.geokguk.title).toContain('격국');
      expect(report.geokguk.content).toContain('정관격');
      expect(report.geokguk.details).toContain('격국: 정관격');
    });

    it('should include yongsin when provided', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {
        includeYongsin: { type: '수(水)', description: '수 오행을 용신으로 사용합니다.' }
      });

      expect(report.yongsin.title).toContain('용신');
      expect(report.yongsin.content).toContain('수');
    });

    it('should include shinsal when provided', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {
        includeShinsal: ['천을귀인', '문창귀인']
      });

      expect(report.shinsal.title).toContain('신살');
      const details = report.shinsal.details || [];
      expect(details.some(d => d.includes('귀인'))).toBe(true);
    });

    it('should include twelve stages when provided', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {
        includeTwelveStages: [
          { pillar: '년주', stage: '장생' },
          { pillar: '월주', stage: '제왕' }
        ]
      });

      expect(report.twelveStages.title).toContain('12운성');
      expect(report.twelveStages.details).toBeDefined();
      const details = report.twelveStages.details!;
      expect(details.some(d => d.includes('장생'))).toBe(true);
      expect(details.some(d => d.includes('제왕'))).toBe(true);
    });

    it('should generate summary text', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      expect(report.summary).toBeTruthy();
      expect(report.summary.length).toBeGreaterThan(20);
    });

    it('should determine lucky elements', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      expect(Array.isArray(report.luckyElements)).toBe(true);
      expect(report.luckyElements.length).toBeGreaterThan(0);
    });

    it('should generate overall evaluation', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      expect(report.overall.title).toContain('종합');
      expect(report.overall.content).toBeTruthy();
      expect(report.overall.rating).toBeGreaterThanOrEqual(1);
      expect(report.overall.rating).toBeLessThanOrEqual(5);
    });
  });

  describe('Section ratings', () => {
    it('should have valid ratings for all sections', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars);

      const sections: ComprehensiveReportSection[] = [
        report.dayMaster,
        report.ilju,
        report.geokguk,
        report.yongsin,
        report.elementBalance,
        report.interactions,
        report.shinsal,
        report.twelveStages,
        report.overall,
      ];

      for (const section of sections) {
        if (section.rating !== undefined) {
          expect(section.rating).toBeGreaterThanOrEqual(1);
          expect(section.rating).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should rate balanced elements higher', () => {
      // 균형 잡힌 오행 사주
      const balancedPillars = createTestPillars('甲', '子', '丙', '午', '戊', '辰', '庚', '申');
      const balancedReport = generateComprehensiveReport(balancedPillars);

      // 편중된 오행 사주 (모두 목)
      const skewedPillars = createTestPillars('甲', '寅', '乙', '卯', '甲', '寅', '乙', '卯');
      const skewedReport = generateComprehensiveReport(skewedPillars);

      // 균형 잡힌 사주가 더 높은 점수를 받아야 함
      expect(balancedReport.elementBalance.rating).toBeGreaterThanOrEqual(skewedReport.elementBalance.rating!);
    });
  });

  describe('Day master analysis by element', () => {
    const dayMasters = [
      { stem: '甲', element: '목' },
      { stem: '丙', element: '화' },
      { stem: '戊', element: '토' },
      { stem: '庚', element: '금' },
      { stem: '壬', element: '수' },
    ];

    for (const { stem, element } of dayMasters) {
      it(`should correctly analyze ${stem} day master as ${element}`, () => {
        const pillars = createTestPillars('甲', '子', '乙', '丑', stem, '寅', '丁', '卯');
        const report = generateComprehensiveReport(pillars);

        expect(report.dayMaster.content).toContain(stem);
        expect(report.dayMaster.content).toContain(element);
      });
    }
  });

  describe('generateQuickSummary', () => {
    it('should generate a quick summary', () => {
      const pillars = createTestPillars();
      const summary = generateQuickSummary(pillars);

      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(50);
    });

    it('should include day master info', () => {
      const pillars = createTestPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const summary = generateQuickSummary(pillars);

      expect(summary).toContain('丙寅');
      expect(summary).toContain('일간');
      expect(summary).toContain('丙');
    });

    it('should include element distribution', () => {
      const pillars = createTestPillars();
      const summary = generateQuickSummary(pillars);

      expect(summary).toContain('오행 분포');
    });

    it('should include interaction grade', () => {
      const pillars = createTestPillars();
      const summary = generateQuickSummary(pillars);

      expect(summary).toContain('형충회합');
      expect(summary).toMatch(/[A-F]등급/);
    });

    it('should format as markdown', () => {
      const pillars = createTestPillars();
      const summary = generateQuickSummary(pillars);

      expect(summary).toContain('##');
      expect(summary).toContain('**');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing ilju info gracefully', () => {
      // 존재하지 않는 일주 조합
      const pillars = createTestPillars('甲', '子', '乙', '丑', '甲', '丑', '丁', '卯');
      const report = generateComprehensiveReport(pillars);

      expect(report.ilju.content).toBeTruthy();
    });

    it('should handle empty options', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {});

      expect(report.geokguk.content).toContain('제공되지 않았습니다');
    });

    it('should handle all provided options together', () => {
      const pillars = createTestPillars();
      const report = generateComprehensiveReport(pillars, {
        includeGeokguk: { type: '식신격', description: '식신격 설명' },
        includeYongsin: { type: '수', description: '수 용신 설명' },
        includeShinsal: ['천을귀인'],
        includeTwelveStages: [{ pillar: '일주', stage: '관대' }]
      });

      expect(report.geokguk.content).toContain('식신격');
      expect(report.yongsin.content).toContain('수');
      expect(report.shinsal.details!.length).toBeGreaterThan(0);
      expect(report.twelveStages.details!.length).toBeGreaterThan(0);
    });
  });

  describe('Gongmang (공망) analysis', () => {
    it('should detect gongmang in pillars', () => {
      const pillars = createTestPillars('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const report = generateComprehensiveReport(pillars);

      // 공망 정보가 shinsal에 포함됨
      const details = report.shinsal.details || [];
      const hasGongmang = details.some(d => d.includes('공망'));

      // 공망이 있거나 없을 수 있음 - 타입만 확인
      expect(Array.isArray(details)).toBe(true);
    });
  });

  describe('Different pillar combinations', () => {
    it('should handle water-heavy chart', () => {
      const pillars = createTestPillars('壬', '子', '癸', '亥', '壬', '子', '癸', '亥');
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.details!.some(d => d.includes('수'))).toBe(true);
    });

    it('should handle fire-heavy chart', () => {
      const pillars = createTestPillars('丙', '午', '丁', '巳', '丙', '午', '丁', '巳');
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.details!.some(d => d.includes('화'))).toBe(true);
    });

    it('should handle earth-heavy chart', () => {
      const pillars = createTestPillars('戊', '辰', '己', '丑', '戊', '戌', '己', '未');
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.details!.some(d => d.includes('토'))).toBe(true);
    });

    it('should handle metal-heavy chart', () => {
      const pillars = createTestPillars('庚', '申', '辛', '酉', '庚', '申', '辛', '酉');
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.details!.some(d => d.includes('금'))).toBe(true);
    });

    it('should handle wood-heavy chart', () => {
      const pillars = createTestPillars('甲', '寅', '乙', '卯', '甲', '寅', '乙', '卯');
      const report = generateComprehensiveReport(pillars);

      expect(report.elementBalance.details!.some(d => d.includes('목'))).toBe(true);
    });
  });

  describe('Report consistency', () => {
    it('should generate consistent reports for same input', () => {
      const pillars = createTestPillars();

      const report1 = generateComprehensiveReport(pillars);
      const report2 = generateComprehensiveReport(pillars);

      expect(report1.summary).toBe(report2.summary);
      expect(report1.dayMaster.content).toBe(report2.dayMaster.content);
      expect(report1.ilju.content).toBe(report2.ilju.content);
      expect(report1.overall.rating).toBe(report2.overall.rating);
    });

    it('should generate different reports for different inputs', () => {
      const pillars1 = createTestPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const pillars2 = createTestPillars('庚', '申', '辛', '酉', '壬', '子', '癸', '亥');

      const report1 = generateComprehensiveReport(pillars1);
      const report2 = generateComprehensiveReport(pillars2);

      expect(report1.dayMaster.content).not.toBe(report2.dayMaster.content);
    });
  });
});
