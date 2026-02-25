/**
 * Tarot Question Classifiers Tests
 * Tests for pattern-based question classification
 */

import {
  clearClassifierCache,
  isYesNoQuestion,
  isCrushQuestion,
  isReconciliationQuestion,
  isExamInterviewQuestion,
  isJobChangeQuestion,
  isComparisonQuestion,
  isTimingQuestion,
  isFindingPartnerQuestion,
  isTodayFortuneQuestion,
  isWeeklyMonthlyQuestion,
  isMoneyFortuneQuestion,
  isHealthFortuneQuestion,
  isFamilyRelationQuestion,
  isBusinessQuestion,
  isStudyFortuneQuestion,
  isTravelQuestion,
  isLegalQuestion,
  isPetQuestion,
  isMarriageRelationQuestion,
  isMovingRealEstateQuestion,
  isDietWeightQuestion,
  isGeneralFortuneQuestion,
  isWorkRelationQuestion,
  isDrivingQuestion,
  isFriendRelationQuestion,
  isBeautyFashionQuestion,
  isParentCareQuestion,
  isSleepRestQuestion,
  isOnlineShoppingQuestion,
  isRentalLeaseQuestion,
  isPhoneDeviceQuestion,
  isHairAppearanceQuestion,
  isGiftPresentQuestion,
  isLanguageLearningQuestion,
  isDriverLicenseQuestion,
  isVolunteerCharityQuestion,
  isCoupleFightQuestion,
} from '@/lib/Tarot/questionClassifiers'

describe('Tarot Question Classifiers', () => {
  beforeEach(() => {
    clearClassifierCache()
  })

  describe('clearClassifierCache', () => {
    it('clears the cache without error', () => {
      isYesNoQuestion('테스트 질문')
      expect(() => clearClassifierCache()).not.toThrow()
    })
  })

  describe('isYesNoQuestion', () => {
    it('detects yes/no questions with 할까 ending', () => {
      expect(isYesNoQuestion('이 일을 할까?')).toBe(true)
      expect(isYesNoQuestion('갈까')).toBe(true)
    })

    it('detects yes/no questions with mid patterns', () => {
      expect(isYesNoQuestion('해야 하나 고민이에요')).toBe(true)
      expect(isYesNoQuestion('해도 될까 궁금해요')).toBe(true)
      expect(isYesNoQuestion('할까 말까')).toBe(true)
    })

    it('detects decision questions with 맞나/맞냐 phrasing', () => {
      expect(isYesNoQuestion('거기로 가는 게 맞나?')).toBe(true)
      expect(isYesNoQuestion('거기로 가는게 맞냐')).toBe(true)
      expect(isYesNoQuestion('이 선택이 맞는지 궁금해')).toBe(true)
    })

    it('caches results for repeated queries', () => {
      const question = '이 일을 할까?'
      const result1 = isYesNoQuestion(question)
      const result2 = isYesNoQuestion(question)
      expect(result1).toBe(result2)
      expect(result1).toBe(true)
    })

    it('does not treat open-ended guidance questions as yes/no', () => {
      expect(isYesNoQuestion('몸과 마음의 균형을 어떻게 회복할까요?')).toBe(false)
      expect(isYesNoQuestion('How can I recover my balance?')).toBe(false)
    })
  })

  describe('isCrushQuestion', () => {
    it('detects crush-related questions with 짝사랑', () => {
      expect(isCrushQuestion('짝사랑하는 사람')).toBe(true)
    })

    it('detects crush questions with 좋아하는 사람', () => {
      expect(isCrushQuestion('좋아하는 사람이 있어요')).toBe(true)
    })

    it('detects English crush patterns', () => {
      expect(isCrushQuestion('does he like me')).toBe(true)
      expect(isCrushQuestion('how does she feel about me')).toBe(true)
    })

    it('returns false for unrelated questions', () => {
      expect(isCrushQuestion('오늘 날씨')).toBe(false)
    })

    it('does not classify mind-body recovery questions as crush', () => {
      expect(isCrushQuestion('몸과 마음의 균형을 어떻게 회복할까요?')).toBe(false)
    })

    it('does not classify generic mind-state questions as crush without relationship context', () => {
      expect(isCrushQuestion('마음이 너무 복잡하고 불안해요')).toBe(false)
    })
  })

  describe('isReconciliationQuestion', () => {
    it('detects 재회 keyword', () => {
      expect(isReconciliationQuestion('재회 가능할까요')).toBe(true)
    })

    it('detects 다시 만날 pattern', () => {
      expect(isReconciliationQuestion('다시 만날 수 있을까')).toBe(true)
    })

    it('detects 복합 keyword', () => {
      expect(isReconciliationQuestion('복합하고 싶어요')).toBe(true)
    })

    it('detects 전 애인 pattern', () => {
      expect(isReconciliationQuestion('전 남친이 연락올까')).toBe(true)
      expect(isReconciliationQuestion('전여친')).toBe(true)
    })

    it('returns false for new relationship questions', () => {
      expect(isReconciliationQuestion('새로운 만남')).toBe(false)
    })
  })

  describe('isExamInterviewQuestion', () => {
    it('detects 면접 keyword', () => {
      expect(isExamInterviewQuestion('면접 결과')).toBe(true)
    })

    it('detects 시험 keyword', () => {
      expect(isExamInterviewQuestion('시험 합격')).toBe(true)
    })

    it('detects 자격증 keyword', () => {
      expect(isExamInterviewQuestion('자격증 합격할까요')).toBe(true)
    })

    it('returns false for general work questions', () => {
      expect(isExamInterviewQuestion('회사 분위기')).toBe(false)
    })
  })

  describe('isJobChangeQuestion', () => {
    it('detects 이직 keyword', () => {
      expect(isJobChangeQuestion('이직 타이밍')).toBe(true)
    })

    it('detects 퇴사 keyword', () => {
      expect(isJobChangeQuestion('퇴사 타이밍')).toBe(true)
    })

    it('detects 회사 옮기 pattern', () => {
      expect(isJobChangeQuestion('회사를 옮길까')).toBe(true)
    })

    it('returns false for general career questions', () => {
      expect(isJobChangeQuestion('승진')).toBe(false)
    })
  })

  describe('isComparisonQuestion', () => {
    it('detects A B 중 pattern', () => {
      expect(isComparisonQuestion('A B 중에 뭐가 좋을까')).toBe(true)
    })

    it('detects 둘 중 pattern', () => {
      expect(isComparisonQuestion('둘 중 하나')).toBe(true)
    })

    it('detects 어느 쪽 pattern', () => {
      expect(isComparisonQuestion('어느 쪽이 좋을까')).toBe(true)
    })
  })

  describe('isTimingQuestion', () => {
    it('detects 언제쯤 keyword', () => {
      expect(isTimingQuestion('언제쯤')).toBe(true)
    })

    it('detects 시기 keyword', () => {
      expect(isTimingQuestion('시기가 궁금해요')).toBe(true)
    })

    it('detects 때 keyword in context', () => {
      expect(isTimingQuestion('적절한 때')).toBe(true)
    })
  })

  describe('isFindingPartnerQuestion', () => {
    it('detects 연인 생길 pattern', () => {
      expect(isFindingPartnerQuestion('연인이 생길까')).toBe(true)
    })

    it('detects 인연 keyword', () => {
      expect(isFindingPartnerQuestion('좋은 인연')).toBe(true)
    })

    it('detects 소개팅 keyword', () => {
      expect(isFindingPartnerQuestion('소개팅')).toBe(true)
    })
  })

  describe('isTodayFortuneQuestion', () => {
    it('detects 오늘 keyword', () => {
      expect(isTodayFortuneQuestion('오늘 운세')).toBe(true)
      expect(isTodayFortuneQuestion('오늘의 운세')).toBe(true)
    })

    it('detects today in English', () => {
      expect(isTodayFortuneQuestion('today fortune')).toBe(true)
    })
  })

  describe('isWeeklyMonthlyQuestion', () => {
    it('detects 이번 주 pattern', () => {
      expect(isWeeklyMonthlyQuestion('이번 주 운세')).toBe(true)
    })

    it('detects 이번 달 pattern', () => {
      expect(isWeeklyMonthlyQuestion('이번 달 운세')).toBe(true)
    })

    it('detects 주간 keyword', () => {
      expect(isWeeklyMonthlyQuestion('주간 운세')).toBe(true)
    })
  })

  describe('isMoneyFortuneQuestion', () => {
    it('detects 재물 keyword', () => {
      expect(isMoneyFortuneQuestion('재물운')).toBe(true)
    })

    it('detects 돈 keyword', () => {
      expect(isMoneyFortuneQuestion('돈운')).toBe(true)
    })

    it('detects 투자 keyword', () => {
      expect(isMoneyFortuneQuestion('투자 운')).toBe(true)
    })

    it('detects 로또 keyword', () => {
      expect(isMoneyFortuneQuestion('로또 당첨')).toBe(true)
    })
  })

  describe('isHealthFortuneQuestion', () => {
    it('detects 건강 keyword', () => {
      expect(isHealthFortuneQuestion('건강운')).toBe(true)
      expect(isHealthFortuneQuestion('건강 운세')).toBe(true)
    })

    it('detects 병원 keyword', () => {
      expect(isHealthFortuneQuestion('병원 결과')).toBe(true)
    })

    it('detects 수술 keyword', () => {
      expect(isHealthFortuneQuestion('수술 결과')).toBe(true)
    })

    it('detects mind-body balance recovery patterns', () => {
      expect(isHealthFortuneQuestion('몸과 마음의 균형을 어떻게 회복할까요?')).toBe(true)
    })
  })

  describe('isFamilyRelationQuestion', () => {
    it('detects 부모 keyword', () => {
      expect(isFamilyRelationQuestion('부모님 관계')).toBe(true)
    })

    it('detects 형제 keyword', () => {
      expect(isFamilyRelationQuestion('형제 관계')).toBe(true)
    })

    it('detects 가족 keyword', () => {
      expect(isFamilyRelationQuestion('가족 관계')).toBe(true)
    })
  })

  describe('isBusinessQuestion', () => {
    it('detects 사업 keyword', () => {
      expect(isBusinessQuestion('사업 운')).toBe(true)
    })

    it('detects 창업 keyword', () => {
      expect(isBusinessQuestion('창업 운')).toBe(true)
    })

    it('detects 자영업 keyword', () => {
      expect(isBusinessQuestion('자영업 전망')).toBe(true)
    })
  })

  describe('isStudyFortuneQuestion', () => {
    it('detects 공부 keyword', () => {
      expect(isStudyFortuneQuestion('공부운')).toBe(true)
    })

    it('detects 학업 keyword', () => {
      expect(isStudyFortuneQuestion('학업운')).toBe(true)
    })

    it('detects 학업 context', () => {
      expect(isStudyFortuneQuestion('학습 어떻')).toBe(true)
    })
  })

  describe('isTravelQuestion', () => {
    it('detects 여행 keyword', () => {
      expect(isTravelQuestion('여행운')).toBe(true)
    })

    it('detects 해외 keyword', () => {
      expect(isTravelQuestion('해외여행 어떻')).toBe(true)
    })

    it('detects 휴가 keyword', () => {
      expect(isTravelQuestion('휴가 계획')).toBe(true)
    })
  })

  describe('isLegalQuestion', () => {
    it('detects 소송 keyword', () => {
      expect(isLegalQuestion('소송 결과')).toBe(true)
    })

    it('detects 재판 keyword', () => {
      expect(isLegalQuestion('재판 결과')).toBe(true)
    })

    it('detects 법적 keyword', () => {
      expect(isLegalQuestion('법적 분쟁')).toBe(true)
    })
  })

  describe('isPetQuestion', () => {
    it('detects 반려동물 keyword', () => {
      expect(isPetQuestion('반려동물 건강')).toBe(true)
    })

    it('detects 강아지 keyword', () => {
      expect(isPetQuestion('강아지 건강')).toBe(true)
    })

    it('detects 고양이 keyword', () => {
      expect(isPetQuestion('고양이 건강')).toBe(true)
    })
  })

  describe('isMarriageRelationQuestion', () => {
    it('detects 결혼 생활 pattern', () => {
      expect(isMarriageRelationQuestion('결혼생활 어떻')).toBe(true)
    })

    it('detects 배우자 keyword', () => {
      expect(isMarriageRelationQuestion('결혼운')).toBe(true)
    })

    it('detects 부부 keyword', () => {
      expect(isMarriageRelationQuestion('연애 관계')).toBe(true)
    })
  })

  describe('isMovingRealEstateQuestion', () => {
    it('detects 이사 keyword', () => {
      expect(isMovingRealEstateQuestion('이사 운')).toBe(true)
    })

    it('detects 집 keyword with context', () => {
      expect(isMovingRealEstateQuestion('집 구할')).toBe(true)
    })

    it('detects 부동산 keyword', () => {
      expect(isMovingRealEstateQuestion('부동산 운')).toBe(true)
    })
  })

  describe('isDietWeightQuestion', () => {
    it('detects 다이어트 keyword', () => {
      expect(isDietWeightQuestion('다이어트 성공')).toBe(true)
    })

    it('detects 살 빼 pattern', () => {
      expect(isDietWeightQuestion('살 빼기')).toBe(true)
    })

    it('detects 체중 keyword', () => {
      expect(isDietWeightQuestion('체중 감량')).toBe(true)
    })

    it('detects exercise patterns', () => {
      expect(isDietWeightQuestion('운동 시작')).toBe(true)
      expect(isDietWeightQuestion('헬스 등록')).toBe(true)
    })

    it('detects English diet patterns', () => {
      expect(isDietWeightQuestion('weight loss how')).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('handles empty string', () => {
      expect(() => isYesNoQuestion('')).not.toThrow()
      expect(isYesNoQuestion('')).toBe(false)
    })

    it('handles very long questions', () => {
      const longQuestion = '이것은 매우 긴 질문입니다 '.repeat(100) + '할까?'
      expect(() => isYesNoQuestion(longQuestion)).not.toThrow()
    })

    it('handles special characters', () => {
      expect(() => isYesNoQuestion('@#$%^&*()')).not.toThrow()
    })

    it('handles mixed language', () => {
      expect(isCrushQuestion('does he like me')).toBe(true)
    })
  })

  describe('Caching behavior', () => {
    it('returns consistent results for same question', () => {
      const question = '오늘 운세'
      const results = Array.from({ length: 5 }, () => isTodayFortuneQuestion(question))
      expect(results.every((r) => r === results[0])).toBe(true)
    })

    it('cache is cleared properly', () => {
      const question = '할까?'
      isYesNoQuestion(question)
      clearClassifierCache()
      // Should still work after cache clear
      expect(isYesNoQuestion(question)).toBe(true)
    })
  })

  describe('isGeneralFortuneQuestion', () => {
    it('detects 운세 general patterns', () => {
      expect(isGeneralFortuneQuestion('운세')).toBe(true)
      expect(isGeneralFortuneQuestion('내 운세')).toBe(true)
      expect(isGeneralFortuneQuestion('종합운')).toBe(true)
    })

    it('detects 미래 patterns', () => {
      expect(isGeneralFortuneQuestion('앞으로 어떨지')).toBe(true)
      expect(isGeneralFortuneQuestion('미래가 어떻지')).toBe(true)
    })

    it('detects 인생 patterns', () => {
      expect(isGeneralFortuneQuestion('인생 어떻')).toBe(true)
      expect(isGeneralFortuneQuestion('내 인생')).toBe(true)
    })

    it('detects English general fortune patterns', () => {
      expect(isGeneralFortuneQuestion('my future')).toBe(true)
      expect(isGeneralFortuneQuestion('general reading')).toBe(true)
    })

    it('excludes specific fortune types', () => {
      expect(isGeneralFortuneQuestion('오늘 운세')).toBe(false)
      expect(isGeneralFortuneQuestion('이번 주 운세')).toBe(false)
    })
  })

  describe('isWorkRelationQuestion', () => {
    it('detects 상사 relationship patterns', () => {
      expect(isWorkRelationQuestion('상사와의 관계')).toBe(true)
      expect(isWorkRelationQuestion('팀장님 마음')).toBe(true)
    })

    it('detects 동료 patterns', () => {
      expect(isWorkRelationQuestion('동료와의 관계')).toBe(true)
      expect(isWorkRelationQuestion('직장동료 사이')).toBe(true)
    })

    it('detects workplace atmosphere patterns', () => {
      expect(isWorkRelationQuestion('직장 분위기')).toBe(true)
      expect(isWorkRelationQuestion('회사 인간관계')).toBe(true)
    })

    it('detects English work relation patterns', () => {
      expect(isWorkRelationQuestion('boss relationship')).toBe(true)
      expect(isWorkRelationQuestion('coworker how')).toBe(true)
    })
  })

  describe('isDrivingQuestion', () => {
    it('detects 면허 patterns', () => {
      expect(isDrivingQuestion('운전면허 따다')).toBe(true)
      expect(isDrivingQuestion('면허시험 합격')).toBe(true)
    })

    it('detects 차량 구매 patterns', () => {
      expect(isDrivingQuestion('차 구매')).toBe(true)
      expect(isDrivingQuestion('중고차 어떻')).toBe(true)
    })

    it('detects 교통사고 patterns', () => {
      expect(isDrivingQuestion('교통사고 날까')).toBe(true)
    })

    it('detects English driving patterns', () => {
      expect(isDrivingQuestion('driving license test')).toBe(true)
      expect(isDrivingQuestion('car purchase')).toBe(true)
    })
  })

  describe('isFriendRelationQuestion', () => {
    it('detects 친구 관계 patterns', () => {
      expect(isFriendRelationQuestion('친구와의 관계')).toBe(true)
      expect(isFriendRelationQuestion('친구 사이')).toBe(true)
    })

    it('detects 우정 patterns', () => {
      expect(isFriendRelationQuestion('우정이 어떻')).toBe(true)
    })

    it('detects 친구 갈등 patterns', () => {
      expect(isFriendRelationQuestion('친구와 싸웠')).toBe(true)
      expect(isFriendRelationQuestion('친구 갈등')).toBe(true)
    })

    it('detects English friend patterns', () => {
      expect(isFriendRelationQuestion('friendship how')).toBe(true)
      expect(isFriendRelationQuestion('best friend relationship')).toBe(true)
    })
  })

  describe('isBeautyFashionQuestion', () => {
    it('detects 외모 patterns', () => {
      expect(isBeautyFashionQuestion('외모운')).toBe(true)
      expect(isBeautyFashionQuestion('외모 좋아질')).toBe(true)
    })

    it('excludes yes/no questions', () => {
      expect(isBeautyFashionQuestion('외모 바꿀까?')).toBe(false)
    })
  })

  describe('isParentCareQuestion', () => {
    it('detects 효도 patterns', () => {
      expect(isParentCareQuestion('효도 어떻')).toBe(true)
      expect(isParentCareQuestion('부모님 돌봐')).toBe(true)
    })

    it('detects 부모님 건강 patterns', () => {
      expect(isParentCareQuestion('부모님 건강')).toBe(true)
      expect(isParentCareQuestion('어머니 병원')).toBe(true)
    })

    it('detects English parent care patterns', () => {
      expect(isParentCareQuestion('parent care')).toBe(true)
      expect(isParentCareQuestion('mother health')).toBe(true)
    })
  })

  describe('isSleepRestQuestion', () => {
    it('detects 수면 patterns', () => {
      expect(isSleepRestQuestion('수면 어떻')).toBe(true)
      expect(isSleepRestQuestion('불면증 나을')).toBe(true)
    })

    it('detects 휴식 patterns', () => {
      expect(isSleepRestQuestion('휴식이 필요')).toBe(true)
      expect(isSleepRestQuestion('피로 회복')).toBe(true)
    })

    it('detects 번아웃 patterns', () => {
      expect(isSleepRestQuestion('번아웃 회복')).toBe(true)
    })

    it('detects English sleep patterns', () => {
      expect(isSleepRestQuestion('sleep problem')).toBe(true)
      expect(isSleepRestQuestion('insomnia')).toBe(true)
      expect(isSleepRestQuestion('burnout')).toBe(true)
    })
  })

  describe('isOnlineShoppingQuestion', () => {
    it('detects 온라인쇼핑 patterns', () => {
      expect(isOnlineShoppingQuestion('온라인 쇼핑 어떻')).toBe(true)
      expect(isOnlineShoppingQuestion('쿠팡 주문')).toBe(true)
    })

    it('detects 중고거래 patterns', () => {
      expect(isOnlineShoppingQuestion('중고거래 어떻')).toBe(true)
      expect(isOnlineShoppingQuestion('당근마켓 거래')).toBe(true)
    })

    it('detects 사기 concern patterns', () => {
      expect(isOnlineShoppingQuestion('사기 걱정')).toBe(true)
    })

    it('detects English shopping patterns', () => {
      expect(isOnlineShoppingQuestion('online shopping')).toBe(true)
      expect(isOnlineShoppingQuestion('secondhand buy')).toBe(true)
    })
  })

  describe('isRentalLeaseQuestion', () => {
    it('detects 전세 patterns', () => {
      expect(isRentalLeaseQuestion('전세 구할')).toBe(true)
      expect(isRentalLeaseQuestion('전세금 돌려')).toBe(true)
    })

    it('detects 월세 patterns', () => {
      expect(isRentalLeaseQuestion('월세 구할')).toBe(true)
      expect(isRentalLeaseQuestion('임대료 인상')).toBe(true)
    })

    it('detects 집주인 patterns', () => {
      expect(isRentalLeaseQuestion('집주인 문제')).toBe(true)
    })

    it('detects English rental patterns', () => {
      expect(isRentalLeaseQuestion('rent apartment')).toBe(true)
      expect(isRentalLeaseQuestion('landlord issue')).toBe(true)
    })
  })

  describe('isPhoneDeviceQuestion', () => {
    it('detects 핸드폰 patterns', () => {
      expect(isPhoneDeviceQuestion('핸드폰 바꿀지')).toBe(true)
      expect(isPhoneDeviceQuestion('아이폰 어떻')).toBe(true)
    })

    it('detects 컴퓨터 patterns', () => {
      expect(isPhoneDeviceQuestion('노트북 어떻')).toBe(true)
      expect(isPhoneDeviceQuestion('맥북 바꿀지')).toBe(true)
    })

    it('detects English device patterns', () => {
      expect(isPhoneDeviceQuestion('phone buy when')).toBe(true)
      expect(isPhoneDeviceQuestion('laptop buy how')).toBe(true)
    })
  })

  describe('isHairAppearanceQuestion', () => {
    it('detects 헤어 patterns', () => {
      expect(isHairAppearanceQuestion('머리 바꿀지')).toBe(true)
      expect(isHairAppearanceQuestion('염색 어떻')).toBe(true)
    })

    it('detects 탈모 patterns', () => {
      expect(isHairAppearanceQuestion('탈모 치료')).toBe(true)
    })

    it('detects English hair patterns', () => {
      expect(isHairAppearanceQuestion('hair cut')).toBe(true)
      expect(isHairAppearanceQuestion('perm get')).toBe(true)
    })

    it('excludes yes/no and beauty fashion questions', () => {
      expect(isHairAppearanceQuestion('머리 자를까?')).toBe(false)
    })
  })

  describe('isGiftPresentQuestion', () => {
    it('detects 선물 patterns', () => {
      expect(isGiftPresentQuestion('선물 뭘')).toBe(true)
      expect(isGiftPresentQuestion('생일선물 추천')).toBe(true)
    })

    it('detects target-specific gift patterns', () => {
      expect(isGiftPresentQuestion('남친 선물')).toBe(true)
      expect(isGiftPresentQuestion('부모님 선물')).toBe(true)
    })

    it('detects English gift patterns', () => {
      expect(isGiftPresentQuestion('gift what')).toBe(true)
      expect(isGiftPresentQuestion('birthday gift')).toBe(true)
    })
  })

  describe('isLanguageLearningQuestion', () => {
    it('detects 영어 학습 patterns', () => {
      expect(isLanguageLearningQuestion('영어 공부')).toBe(true)
      expect(isLanguageLearningQuestion('토익 점수')).toBe(true)
    })

    it('detects 일본어 patterns', () => {
      expect(isLanguageLearningQuestion('일본어 배울')).toBe(true)
    })

    it('detects 중국어 patterns', () => {
      expect(isLanguageLearningQuestion('중국어 공부')).toBe(true)
    })

    it('detects English language learning patterns', () => {
      expect(isLanguageLearningQuestion('english study')).toBe(true)
      expect(isLanguageLearningQuestion('TOEFL')).toBe(true)
    })
  })

  describe('isDriverLicenseQuestion', () => {
    it('detects 면허 시험 patterns', () => {
      expect(isDriverLicenseQuestion('면허 따다')).toBe(true)
      expect(isDriverLicenseQuestion('도로주행 합격')).toBe(true)
    })

    it('detects 운전학원 patterns', () => {
      expect(isDriverLicenseQuestion('운전학원 등록')).toBe(true)
    })

    it('detects 차량 구매 patterns', () => {
      expect(isDriverLicenseQuestion('차 구매')).toBe(true)
      expect(isDriverLicenseQuestion('중고차 어떻')).toBe(true)
    })

    it('detects English driver license patterns', () => {
      expect(isDriverLicenseQuestion('driver license get')).toBe(true)
      expect(isDriverLicenseQuestion('car buy')).toBe(true)
    })
  })

  describe('isVolunteerCharityQuestion', () => {
    it('detects 봉사 patterns', () => {
      expect(isVolunteerCharityQuestion('봉사활동 어떻')).toBe(true)
      expect(isVolunteerCharityQuestion('자원봉사 시작')).toBe(true)
    })

    it('detects 기부 patterns', () => {
      expect(isVolunteerCharityQuestion('기부 얼마')).toBe(true)
      expect(isVolunteerCharityQuestion('후원 어떻')).toBe(true)
    })

    it('detects English volunteer patterns', () => {
      expect(isVolunteerCharityQuestion('volunteer how')).toBe(true)
      expect(isVolunteerCharityQuestion('donate how')).toBe(true)
    })
  })

  describe('isCoupleFightQuestion', () => {
    it('detects 싸움 patterns', () => {
      expect(isCoupleFightQuestion('싸웠어 어떻')).toBe(true)
      expect(isCoupleFightQuestion('다퉜어 화해')).toBe(true)
    })

    it('detects 화해 patterns', () => {
      expect(isCoupleFightQuestion('화해 방법')).toBe(true)
      expect(isCoupleFightQuestion('사과 해야')).toBe(true)
    })

    it('detects 감정 상태 patterns', () => {
      expect(isCoupleFightQuestion('삐졌어 연락')).toBe(true)
      expect(isCoupleFightQuestion('화났어 풀')).toBe(true)
    })

    it('detects 연락 단절 patterns', () => {
      expect(isCoupleFightQuestion('연락 없어')).toBe(true)
      expect(isCoupleFightQuestion('잠수 탔')).toBe(true)
    })
  })

  describe('Complex pattern interactions', () => {
    it('correctly prioritizes specific over general patterns', () => {
      expect(isTodayFortuneQuestion('오늘 운세')).toBe(true)
      expect(isGeneralFortuneQuestion('오늘 운세')).toBe(false)
    })

    it('handles overlapping keywords correctly', () => {
      expect(isExamInterviewQuestion('면접 결과')).toBe(true)
      expect(isDrivingQuestion('면허 시험')).toBe(true)
      expect(isDriverLicenseQuestion('면허 따다')).toBe(true)
    })

    it('distinguishes between similar topics', () => {
      expect(isFriendRelationQuestion('친구 관계')).toBe(true)
      expect(isWorkRelationQuestion('직장 동료 관계')).toBe(true)
      expect(isFamilyRelationQuestion('가족 관계')).toBe(true)
    })
  })

  describe('Performance and edge cases for new classifiers', () => {
    it('handles long questions efficiently', () => {
      const longQuestion =
        '나는 지금 ' + '매우 '.repeat(50) + '고민이 많은데 운전면허를 따야 할까요?'
      expect(() => isDriverLicenseQuestion(longQuestion)).not.toThrow()
    })

    it('handles questions with multiple topics', () => {
      expect(isWorkRelationQuestion('상사와의 관계도 좋지 않고')).toBe(true)
      expect(isSleepRestQuestion('요즘 잠도 못자고 피곤해')).toBe(true)
    })

    it('returns false for completely unrelated questions', () => {
      expect(isVolunteerCharityQuestion('날씨가 좋네요')).toBe(false)
      expect(isCoupleFightQuestion('점심 뭐 먹지')).toBe(false)
      expect(isLanguageLearningQuestion('123456')).toBe(false)
    })
  })
})
