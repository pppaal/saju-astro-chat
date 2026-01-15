import { describe, it, expect } from 'vitest';
import {
  themeKeywords,
  complexityKeywords,
  quickQuestions,
  directMatches,
  dangerousKeywords,
  cardCountPatterns,
  type DirectMatch,
} from '@/lib/Tarot/tarot-recommend.data';

describe('Tarot Recommend Data', () => {
  describe('themeKeywords', () => {
    it('should have all required themes', () => {
      const expectedThemes = [
        'love-relationships',
        'career-work',
        'money-finance',
        'well-being-health',
        'decisions-crossroads',
        'daily-reading',
        'self-discovery',
        'spiritual-growth',
        'general-insight',
      ];

      expectedThemes.forEach(theme => {
        expect(themeKeywords[theme]).toBeDefined();
        expect(Array.isArray(themeKeywords[theme])).toBe(true);
        expect(themeKeywords[theme].length).toBeGreaterThan(0);
      });
    });

    it('should have Korean keywords for love theme', () => {
      const loveKeywords = themeKeywords['love-relationships'];

      expect(loveKeywords).toContain('연애');
      expect(loveKeywords).toContain('사랑');
      expect(loveKeywords).toContain('결혼');
      expect(loveKeywords).toContain('이별');
      expect(loveKeywords).toContain('재회');
    });

    it('should have English keywords for love theme', () => {
      const loveKeywords = themeKeywords['love-relationships'];

      expect(loveKeywords).toContain('love');
      expect(loveKeywords).toContain('relationship');
      expect(loveKeywords).toContain('marriage');
      expect(loveKeywords).toContain('breakup');
    });

    it('should have Korean keywords for career theme', () => {
      const careerKeywords = themeKeywords['career-work'];

      expect(careerKeywords).toContain('직장');
      expect(careerKeywords).toContain('이직');
      expect(careerKeywords).toContain('취업');
      expect(careerKeywords).toContain('시험');
      expect(careerKeywords).toContain('합격');
    });

    it('should have English keywords for career theme', () => {
      const careerKeywords = themeKeywords['career-work'];

      expect(careerKeywords).toContain('career');
      expect(careerKeywords).toContain('job');
      expect(careerKeywords).toContain('promotion');
      expect(careerKeywords).toContain('exam');
    });

    it('should have Korean keywords for money theme', () => {
      const moneyKeywords = themeKeywords['money-finance'];

      expect(moneyKeywords).toContain('돈');
      expect(moneyKeywords).toContain('투자');
      expect(moneyKeywords).toContain('주식');
      expect(moneyKeywords).toContain('재물운');
    });

    it('should have keywords for health theme', () => {
      const healthKeywords = themeKeywords['well-being-health'];

      expect(healthKeywords).toContain('건강');
      expect(healthKeywords).toContain('스트레스');
      expect(healthKeywords).toContain('멘탈');
      expect(healthKeywords).toContain('health');
    });

    it('should have keywords for decisions theme', () => {
      const decisionKeywords = themeKeywords['decisions-crossroads'];

      expect(decisionKeywords).toContain('선택');
      expect(decisionKeywords).toContain('결정');
      expect(decisionKeywords).toContain('언제');
      expect(decisionKeywords).toContain('타이밍');
    });

    it('should have keywords for daily reading theme', () => {
      const dailyKeywords = themeKeywords['daily-reading'];

      expect(dailyKeywords).toContain('오늘');
      expect(dailyKeywords).toContain('하루');
      expect(dailyKeywords).toContain('today');
    });

    it('should have keywords for self-discovery theme', () => {
      const selfKeywords = themeKeywords['self-discovery'];

      expect(selfKeywords).toContain('나는 누구');
      expect(selfKeywords).toContain('정체성');
      expect(selfKeywords).toContain('myself');
    });
  });

  describe('complexityKeywords', () => {
    it('should have simple keywords', () => {
      expect(complexityKeywords.simple).toContain('간단');
      expect(complexityKeywords.simple).toContain('빠르게');
      expect(complexityKeywords.simple).toContain('quick');
      expect(complexityKeywords.simple).toContain('simple');
    });

    it('should have detailed keywords', () => {
      expect(complexityKeywords.detailed).toContain('자세히');
      expect(complexityKeywords.detailed).toContain('깊게');
      expect(complexityKeywords.detailed).toContain('분석');
      expect(complexityKeywords.detailed).toContain('detail');
    });
  });

  describe('quickQuestions', () => {
    it('should have multiple quick questions', () => {
      expect(quickQuestions.length).toBeGreaterThan(5);
    });

    it('should have required fields for emoji-based questions', () => {
      const emojiQuestions = quickQuestions.filter(q => 'emoji' in q && 'label' in q);

      emojiQuestions.forEach(q => {
        expect(q.emoji).toBeDefined();
        expect(q.label).toBeDefined();
        expect(q.labelEn).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.questionEn).toBeDefined();
      });
    });

    it('should have today fortune question', () => {
      const todayQ = quickQuestions.find(q => 'label' in q && q.label === '오늘 운세');

      expect(todayQ).toBeDefined();
      expect(todayQ?.emoji).toBe('☀️');
    });

    it('should have crush question', () => {
      const crushQ = quickQuestions.find(q => 'label' in q && q.label === '썸남/썸녀');

      expect(crushQ).toBeDefined();
      expect(crushQ?.emoji).toBe('💕');
    });

    it('should have interview question', () => {
      const interviewQ = quickQuestions.find(q => 'label' in q && q.label === '면접 결과');

      expect(interviewQ).toBeDefined();
      expect(interviewQ?.emoji).toBe('💼');
    });

    it('should have A vs B choice question', () => {
      const choiceQ = quickQuestions.find(q => 'label' in q && q.label === 'A vs B');

      expect(choiceQ).toBeDefined();
      expect(choiceQ?.emoji).toBe('⚖️');
    });

    it('should have keyword-based questions with proper structure', () => {
      const keywordQuestions = quickQuestions.filter(q => 'keywords' in q);

      keywordQuestions.forEach(q => {
        expect(Array.isArray(q.keywords)).toBe(true);
        expect(q.themeId).toBeDefined();
        expect(q.spreadId).toBeDefined();
        expect(q.reason).toBeDefined();
        expect(q.reasonKo).toBeDefined();
        expect(typeof q.priority).toBe('number');
      });
    });
  });

  describe('directMatches', () => {
    it('should be an array of DirectMatch objects', () => {
      expect(Array.isArray(directMatches)).toBe(true);
      expect(directMatches.length).toBeGreaterThan(20);
    });

    it('should have required fields for all matches', () => {
      directMatches.forEach((match: DirectMatch) => {
        expect(Array.isArray(match.keywords)).toBe(true);
        expect(match.keywords.length).toBeGreaterThan(0);
        expect(match.themeId).toBeDefined();
        expect(match.spreadId).toBeDefined();
        expect(match.reason).toBeDefined();
        expect(match.reasonKo).toBeDefined();
        expect(typeof match.priority).toBe('number');
      });
    });

    it('should have high priority for timing-based complex matches', () => {
      const timingMatches = directMatches.filter(m =>
        m.contextKeywords?.some(k => ['언제', '시기', '타이밍', 'when', 'timing'].includes(k))
      );

      timingMatches.forEach(m => {
        expect(m.priority).toBeGreaterThanOrEqual(100);
      });
    });

    it('should have love-related matches', () => {
      const loveMatches = directMatches.filter(m => m.themeId === 'love-relationships');

      expect(loveMatches.length).toBeGreaterThan(3);

      // Check for specific love match types
      const crushMatch = loveMatches.find(m => m.spreadId === 'crush-feelings');
      const reconciliationMatch = loveMatches.find(m => m.spreadId === 'reconciliation');
      const relationshipMatch = loveMatches.find(m => m.spreadId === 'relationship-check-in');

      expect(crushMatch).toBeDefined();
      expect(reconciliationMatch).toBeDefined();
      expect(relationshipMatch).toBeDefined();
    });

    it('should have career-related matches', () => {
      const careerMatches = directMatches.filter(m => m.themeId === 'career-work');

      expect(careerMatches.length).toBeGreaterThan(5);

      // Check for specific career match types
      const interviewMatch = careerMatches.find(m => m.spreadId === 'interview-result');
      const examMatch = careerMatches.find(m => m.spreadId === 'exam-pass');
      const jobChangeMatch = careerMatches.find(m => m.spreadId === 'job-change');

      expect(interviewMatch).toBeDefined();
      expect(examMatch).toBeDefined();
      expect(jobChangeMatch).toBeDefined();
    });

    it('should have money-related matches', () => {
      const moneyMatches = directMatches.filter(m => m.themeId === 'money-finance');

      expect(moneyMatches.length).toBeGreaterThan(2);

      // Check for specific money match types
      const investMatch = moneyMatches.find(m =>
        m.keywords.some(k => ['투자', '주식', 'invest'].includes(k))
      );
      const lotteryMatch = moneyMatches.find(m =>
        m.keywords.some(k => ['로또', '복권', 'lottery'].includes(k))
      );

      expect(investMatch).toBeDefined();
      expect(lotteryMatch).toBeDefined();
    });

    it('should have health-related matches', () => {
      const healthMatches = directMatches.filter(m => m.themeId === 'well-being-health');

      expect(healthMatches.length).toBeGreaterThan(1);

      const mentalMatch = healthMatches.find(m => m.spreadId === 'mind-body-scan');
      expect(mentalMatch).toBeDefined();
    });

    it('should have daily reading matches', () => {
      const dailyMatches = directMatches.filter(m => m.themeId === 'daily-reading');

      expect(dailyMatches.length).toBeGreaterThan(2);

      const todayMatch = dailyMatches.find(m => m.spreadId === 'day-card');
      const weeklyMatch = dailyMatches.find(m => m.spreadId === 'weekly-forecast');

      expect(todayMatch).toBeDefined();
      expect(weeklyMatch).toBeDefined();
    });

    it('should have decision-related matches', () => {
      const decisionMatches = directMatches.filter(m => m.themeId === 'decisions-crossroads');

      expect(decisionMatches.length).toBeGreaterThan(3);

      const yesNoMatch = decisionMatches.find(m => m.spreadId === 'yes-no-why');
      const twoPathsMatch = decisionMatches.find(m => m.spreadId === 'two-paths');
      const timingMatch = decisionMatches.find(m => m.spreadId === 'timing-window');

      expect(yesNoMatch).toBeDefined();
      expect(twoPathsMatch).toBeDefined();
      expect(timingMatch).toBeDefined();
    });

    it('should have proper priority ordering', () => {
      // Higher priority items should be handled first
      const priorities = directMatches.map(m => m.priority);
      const maxPriority = Math.max(...priorities);
      const minPriority = Math.min(...priorities);

      expect(maxPriority).toBe(100);
      expect(minPriority).toBeGreaterThanOrEqual(30);
    });
  });

  describe('dangerousKeywords', () => {
    it('should have Korean crisis keywords', () => {
      expect(dangerousKeywords).toContain('자살');
      expect(dangerousKeywords).toContain('죽고 싶');
      expect(dangerousKeywords).toContain('살기 싫');
      expect(dangerousKeywords).toContain('자해');
    });

    it('should have English crisis keywords', () => {
      expect(dangerousKeywords).toContain('suicide');
      expect(dangerousKeywords).toContain('kill myself');
      expect(dangerousKeywords).toContain('end my life');
      expect(dangerousKeywords).toContain('want to die');
    });

    it('should have sufficient coverage', () => {
      expect(dangerousKeywords.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('cardCountPatterns', () => {
    it('should have all card count categories', () => {
      expect(cardCountPatterns.one).toBeDefined();
      expect(cardCountPatterns.two).toBeDefined();
      expect(cardCountPatterns.three).toBeDefined();
      expect(cardCountPatterns.four).toBeDefined();
      expect(cardCountPatterns.five).toBeDefined();
      expect(cardCountPatterns.seven).toBeDefined();
      expect(cardCountPatterns.ten).toBeDefined();
    });

    it('should have one-card patterns for simple readings', () => {
      expect(cardCountPatterns.one).toContain('오늘');
      expect(cardCountPatterns.one).toContain('하루');
      expect(cardCountPatterns.one).toContain('간단');
      expect(cardCountPatterns.one).toContain('quick');
    });

    it('should have two-card patterns for choices', () => {
      expect(cardCountPatterns.two).toContain('vs');
      expect(cardCountPatterns.two).toContain('둘 중');
      expect(cardCountPatterns.two).toContain('할까 말까');
      expect(cardCountPatterns.two).toContain('should i');
    });

    it('should have three-card patterns for timeline readings', () => {
      expect(cardCountPatterns.three).toContain('과거');
      expect(cardCountPatterns.three).toContain('현재');
      expect(cardCountPatterns.three).toContain('미래');
      expect(cardCountPatterns.three).toContain('past');
    });

    it('should have four-card patterns for job-related readings', () => {
      expect(cardCountPatterns.four).toContain('이직');
      expect(cardCountPatterns.four).toContain('퇴사');
      expect(cardCountPatterns.four).toContain('관계');
    });

    it('should have five-card patterns for detailed readings', () => {
      expect(cardCountPatterns.five).toContain('자세히');
      expect(cardCountPatterns.five).toContain('깊게');
      expect(cardCountPatterns.five).toContain('분석');
      expect(cardCountPatterns.five).toContain('detail');
    });

    it('should have seven-card patterns for weekly readings', () => {
      expect(cardCountPatterns.seven).toContain('이번 주');
      expect(cardCountPatterns.seven).toContain('주간');
      expect(cardCountPatterns.seven).toContain('week');
    });

    it('should have ten-card patterns for comprehensive readings', () => {
      expect(cardCountPatterns.ten).toContain('인생');
      expect(cardCountPatterns.ten).toContain('전체');
      expect(cardCountPatterns.ten).toContain('켈틱');
      expect(cardCountPatterns.ten).toContain('celtic');
    });
  });

  describe('Data Integrity', () => {
    it('should have unique keywords across themes (no excessive overlap)', () => {
      const allKeywords = Object.values(themeKeywords).flat();
      const uniqueKeywords = new Set(allKeywords);

      // Some overlap is expected, but shouldn't be too much
      const overlapRatio = uniqueKeywords.size / allKeywords.length;
      expect(overlapRatio).toBeGreaterThan(0.8); // At least 80% unique
    });

    it('should have valid themeIds in directMatches', () => {
      const validThemes = Object.keys(themeKeywords);

      directMatches.forEach(match => {
        expect(validThemes).toContain(match.themeId);
      });
    });

    it('should have non-empty keyword arrays', () => {
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        expect(keywords.length).toBeGreaterThan(0);
      });
    });

    it('should not have empty strings in keywords', () => {
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        keywords.forEach(keyword => {
          expect(keyword.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('should have bilingual support in directMatches', () => {
      directMatches.forEach(match => {
        expect(match.reason).toBeDefined(); // English
        expect(match.reasonKo).toBeDefined(); // Korean
      });
    });
  });

  describe('Keyword Detection', () => {
    it('should detect Korean love question', () => {
      const question = '그 사람이 나를 좋아할까요?';
      const loveKeywords = themeKeywords['love-relationships'];

      const hasMatch = loveKeywords.some(keyword => question.includes(keyword));
      expect(hasMatch).toBe(true);
    });

    it('should detect English career question', () => {
      const question = 'Will I pass this interview?';
      const careerKeywords = themeKeywords['career-work'];

      const hasMatch = careerKeywords.some(keyword =>
        question.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasMatch).toBe(true);
    });

    it('should detect money-related question', () => {
      const question = '이번 달 돈이 들어올까요?';
      const moneyKeywords = themeKeywords['money-finance'];

      const hasMatch = moneyKeywords.some(keyword => question.includes(keyword));
      expect(hasMatch).toBe(true);
    });

    it('should detect dangerous content', () => {
      const dangerousQuestion = '너무 힘들어서 죽고 싶어요';

      const isDangerous = dangerousKeywords.some(keyword =>
        dangerousQuestion.includes(keyword)
      );
      expect(isDangerous).toBe(true);
    });

    it('should not flag normal questions as dangerous', () => {
      const normalQuestions = [
        '오늘 운세가 어떨까요?',
        '그 사람이 나를 좋아할까요?',
        '이직해도 될까요?'
      ];

      normalQuestions.forEach(question => {
        const isDangerous = dangerousKeywords.some(keyword =>
          question.includes(keyword)
        );
        expect(isDangerous).toBe(false);
      });
    });
  });
});
