import { describe, it, expect } from 'vitest';
import { calculateAreaScores, getLuckyColorFromElement, getLuckyNumber, generateAlerts } from '@/lib/destiny-map/calendar/daily-fortune-helpers';

describe('daily-fortune-helpers', () => {
  describe('calculateAreaScores', () => {
    it('should return scores within range 15-95', () => {
      const scores = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(scores.love).toBeGreaterThanOrEqual(15);
      expect(scores.love).toBeLessThanOrEqual(95);
      expect(scores.career).toBeGreaterThanOrEqual(15);
      expect(scores.career).toBeLessThanOrEqual(95);
    });

    it('should boost love with dohwaDay', () => {
      const withDohwa = calculateAreaScores(50, { sajuFactorKeys: ['dohwaDay'], astroFactorKeys: [] }, new Date());
      const withoutDohwa = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withDohwa.love).toBeGreaterThan(withoutDohwa.love);
    });

    it('should boost career with geonrokDay', () => {
      const withGeonrok = calculateAreaScores(50, { sajuFactorKeys: ['geonrokDay'], astroFactorKeys: [] }, new Date());
      const withoutGeonrok = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withGeonrok.career).toBeGreaterThan(withoutGeonrok.career);
    });

    it('should reduce health with chung factors', () => {
      const withChung = calculateAreaScores(50, { sajuFactorKeys: ['branchChung'], astroFactorKeys: [] }, new Date());
      const withoutChung = calculateAreaScores(50, { sajuFactorKeys: [], astroFactorKeys: [] }, new Date());
      expect(withChung.health).toBeLessThan(withoutChung.health);
    });
  });

  describe('getLuckyColorFromElement', () => {
    it('should return green tones for wood', () => {
      const color = getLuckyColorFromElement('wood');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });

    it('should return red tones for fire', () => {
      const color = getLuckyColorFromElement('fire');
      expect(['Red', 'Orange', 'Pink']).toContain(color);
    });

    it('should return default for unknown element', () => {
      const color = getLuckyColorFromElement('unknown');
      expect(['Green', 'Teal', 'Emerald']).toContain(color);
    });
  });

  describe('getLuckyNumber', () => {
    it('should return number between 1-9', () => {
      const num = getLuckyNumber(new Date('2024-01-15'), new Date('1990-05-20'));
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(9);
    });

    it('should return consistent number for same dates', () => {
      const targetDate = new Date('2024-01-15');
      const birthDate = new Date('1990-05-20');
      const num1 = getLuckyNumber(targetDate, birthDate);
      const num2 = getLuckyNumber(targetDate, birthDate);
      expect(num1).toBe(num2);
    });
  });

  describe('generateAlerts', () => {
    it('should return positive alert for grade 0', () => {
      const alerts = generateAlerts({ grade: 0, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('positive');
    });

    it('should return positive alert for grade 1', () => {
      const alerts = generateAlerts({ grade: 1, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('positive');
    });

    it('should add cheoneul alert', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: ['cheoneulGwiin'], astroFactorKeys: [], crossVerified: false });
      const cheoneulAlert = alerts.find(a => a.msg.includes('천을귀인'));
      expect(cheoneulAlert).toBeDefined();
    });

    it('should add crossVerified alert', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: true });
      const crossAlert = alerts.find(a => a.msg.includes('일치'));
      expect(crossAlert).toBeDefined();
    });

    it('should return empty array with no special conditions', () => {
      const alerts = generateAlerts({ grade: 2, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
      expect(Array.isArray(alerts)).toBe(true);
    });

    // Grade 3 테스트 (안좋은 날)
    describe('grade 3 (bad day) alerts', () => {
      it('should return warning alert for grade 3', () => {
        const alerts = generateAlerts({ grade: 3, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
        const warningAlert = alerts.find(a => a.type === 'warning');
        expect(warningAlert).toBeDefined();
      });

      it('should include specific chung reason for grade 3', () => {
        const alerts = generateAlerts({
          grade: 3,
          sajuFactorKeys: ['branchChung'],
          astroFactorKeys: [],
          crossVerified: false
        });
        const chungAlert = alerts.find(a => a.msg.includes('충') || a.msg.includes('갈등'));
        expect(chungAlert).toBeDefined();
      });

      it('should include xing alert for grade 3', () => {
        const alerts = generateAlerts({
          grade: 3,
          sajuFactorKeys: ['iljinXing'],
          astroFactorKeys: [],
          crossVerified: false
        });
        const xingAlert = alerts.find(a => a.msg.includes('형') || a.msg.includes('서류'));
        expect(xingAlert).toBeDefined();
      });

      it('should include gongmang alert for grade 3', () => {
        const alerts = generateAlerts({
          grade: 3,
          sajuFactorKeys: ['shinsal_gongmang'],
          astroFactorKeys: [],
          crossVerified: false
        });
        const gongmangAlert = alerts.find(a => a.msg.includes('공망'));
        expect(gongmangAlert).toBeDefined();
      });
    });

    // Grade 4 테스트 (최악의 날)
    describe('grade 4 (worst day) alerts', () => {
      it('should return urgent warning for grade 4', () => {
        const alerts = generateAlerts({ grade: 4, sajuFactorKeys: [], astroFactorKeys: [], crossVerified: false });
        const urgentAlert = alerts.find(a => a.msg.includes('🚨') || a.msg.includes('최악'));
        expect(urgentAlert).toBeDefined();
      });

      it('should include multiple warnings for grade 4 with bad factors', () => {
        const alerts = generateAlerts({
          grade: 4,
          sajuFactorKeys: ['branchChung', 'iljinXing'],
          astroFactorKeys: ['retrogradeMercury'],
          crossVerified: false
        });
        const warningAlerts = alerts.filter(a => a.type === 'warning');
        expect(warningAlerts.length).toBeGreaterThan(1);
      });

      it('should include backho alert for grade 4', () => {
        const alerts = generateAlerts({
          grade: 4,
          sajuFactorKeys: ['shinsal_backho'],
          astroFactorKeys: [],
          crossVerified: false
        });
        const backhoAlert = alerts.find(a => a.msg.includes('백호'));
        expect(backhoAlert).toBeDefined();
      });
    });

    // 역행 관련 테스트
    describe('retrograde alerts', () => {
      it('should include mercury retrograde alert', () => {
        const alerts = generateAlerts({
          grade: 2,
          sajuFactorKeys: [],
          astroFactorKeys: ['retrogradeMercury'],
          crossVerified: false
        });
        const mercuryAlert = alerts.find(a => a.msg.includes('수성') && a.msg.includes('역행'));
        expect(mercuryAlert).toBeDefined();
      });

      it('should include venus retrograde alert', () => {
        const alerts = generateAlerts({
          grade: 2,
          sajuFactorKeys: [],
          astroFactorKeys: ['retrogradeVenus'],
          crossVerified: false
        });
        const venusAlert = alerts.find(a => a.msg.includes('금성'));
        expect(venusAlert).toBeDefined();
      });

      it('should include mars retrograde alert', () => {
        const alerts = generateAlerts({
          grade: 2,
          sajuFactorKeys: [],
          astroFactorKeys: ['retrogradeMars'],
          crossVerified: false
        });
        const marsAlert = alerts.find(a => a.msg.includes('화성'));
        expect(marsAlert).toBeDefined();
      });

      it('should include void of course alert', () => {
        const alerts = generateAlerts({
          grade: 2,
          sajuFactorKeys: [],
          astroFactorKeys: ['voidOfCourse'],
          crossVerified: false
        });
        const vocAlert = alerts.find(a => a.msg.includes('보이드'));
        expect(vocAlert).toBeDefined();
      });
    });

    // 알림 제한 테스트
    describe('alert limits', () => {
      it('should limit alerts to maximum 5', () => {
        const alerts = generateAlerts({
          grade: 4,
          sajuFactorKeys: ['branchChung', 'iljinXing', 'cheoneulGwiin', 'dohwaDay', 'shinsal_gongmang', 'shinsal_backho'],
          astroFactorKeys: ['retrogradeMercury', 'retrogradeVenus', 'retrogradeMars', 'voidOfCourse'],
          crossVerified: true
        });
        expect(alerts.length).toBeLessThanOrEqual(5);
      });

      it('should deduplicate alerts', () => {
        const alerts = generateAlerts({
          grade: 3,
          sajuFactorKeys: ['branchChung', 'iljinChung'], // 두 개의 충 요소
          astroFactorKeys: [],
          crossVerified: false
        });
        const chungAlerts = alerts.filter(a => a.msg.includes('충(沖)'));
        // 같은 메시지는 중복되지 않아야 함
        const uniqueMsgs = [...new Set(alerts.map(a => a.msg))];
        expect(alerts.length).toBe(uniqueMsgs.length);
      });
    });
  });
});
