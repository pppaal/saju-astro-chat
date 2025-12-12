// src/lib/Saju/johuYongsin.ts
// 궁통보감(窮通寶鑑) 기반 조후용신 데이터베이스
// 일간 10개 × 월령 12개 = 120개 케이스

import { FiveElement } from './types';

/**
 * 조후용신 상세 정보
 */
export interface JohuYongsinInfo {
  daymaster: string;           // 일간 (甲~癸)
  month: string;               // 월지 (子~亥)
  climate: '한' | '습' | '조' | '열' | '온화';  // 기후 특성
  primaryYongsin: FiveElement; // 주 조후용신
  secondaryYongsin?: FiveElement; // 보조 조후용신
  reasoning: string;           // 조후용신 선정 이유
  caution?: string;            // 주의사항
  rating: 1 | 2 | 3 | 4 | 5;   // 조후 필요도 (5가 가장 급함)
}

/**
 * 월지별 계절/기후 매핑
 */
export const MONTH_CLIMATE: Record<string, { season: string; climate: string; temperature: string }> = {
  '寅': { season: '초봄', climate: '한습', temperature: '추위가 남음' },
  '卯': { season: '중봄', climate: '온화', temperature: '따뜻해짐' },
  '辰': { season: '늦봄', climate: '습', temperature: '습기 있음' },
  '巳': { season: '초여름', climate: '열', temperature: '더워짐' },
  '午': { season: '한여름', climate: '조열', temperature: '가장 덥고 건조' },
  '未': { season: '늦여름', climate: '습열', temperature: '덥고 습함' },
  '申': { season: '초가을', climate: '조', temperature: '선선해짐' },
  '酉': { season: '중가을', climate: '조', temperature: '건조함' },
  '戌': { season: '늦가을', climate: '조한', temperature: '건조하고 쌀쌀' },
  '亥': { season: '초겨울', climate: '한습', temperature: '추워짐' },
  '子': { season: '한겨울', climate: '한', temperature: '가장 춥고 습함' },
  '丑': { season: '늦겨울', climate: '한습', temperature: '춥고 습함' },
};

/**
 * 궁통보감 조후용신 데이터베이스 (120개 케이스)
 */
export const JOHU_YONGSIN_DB: JohuYongsinInfo[] = [
  // ============ 甲木 일간 (12개월) ============
  {
    daymaster: '甲', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 갑목은 아직 추위가 남아 병화로 따뜻하게 해야. 계수로 뿌리 보양.',
    rating: 4
  },
  {
    daymaster: '甲', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 갑목은 왕성하니 병화로 발산하고 경금으로 조각해야 쓸모있음.',
    rating: 3
  },
  {
    daymaster: '甲', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 습토월, 갑목 뿌리 튼튼하니 병화 설기하고 경금으로 제련.',
    rating: 3
  },
  {
    daymaster: '甲', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '초여름 갑목은 열기에 마르니 계수로 윤택하게, 병화는 보조.',
    rating: 4
  },
  {
    daymaster: '甲', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 극열, 갑목 고갈되니 임계수 급히 필요. 경금으로 수원 생성.',
    rating: 5
  },
  {
    daymaster: '甲', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 습열, 아직 더우니 계수로 해갈하고 경신금으로 수생.',
    rating: 4
  },
  {
    daymaster: '甲', month: '申',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '초가을 금왕, 갑목 극받으니 임수로 통관하고 병정화로 금제어.',
    rating: 4
  },
  {
    daymaster: '甲', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 금왕지, 정화로 금을 제련하고 임계수로 목을 보양.',
    rating: 4
  },
  {
    daymaster: '甲', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 건조, 갑목 마르니 임계수로 윤택, 병화로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '甲', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 갑목은 수왕지에서 병화가 급함. 무토로 수 제어.',
    rating: 5
  },
  {
    daymaster: '甲', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 갑목은 얼어붙으니 병정화 필수. 무기토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '甲', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 갑목은 아직 추우니 병화로 해동. 경금으로 조각.',
    rating: 4
  },

  // ============ 乙木 일간 (12개월) ============
  {
    daymaster: '乙', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 을목은 추위 남아 병화로 해동. 계수로 뿌리 보양.',
    rating: 4
  },
  {
    daymaster: '乙', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중봄 을목 왕지, 병화로 꽃피우고 계수로 뿌리 보양.',
    rating: 3
  },
  {
    daymaster: '乙', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 을목은 병화로 습기 말리고, 신금으로 다듬어야.',
    rating: 3
  },
  {
    daymaster: '乙', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 을목은 열에 시드니 계수로 적시고 신금으로 수원.',
    rating: 4
  },
  {
    daymaster: '乙', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 을목 고갈, 임계수 급히 필요하고 경신금 수원 필수.',
    rating: 5
  },
  {
    daymaster: '乙', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 을목은 습열에 지치니 계수로 해갈.',
    rating: 4
  },
  {
    daymaster: '乙', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 을목은 금에 극받으니 병정화로 금 제어.',
    rating: 4
  },
  {
    daymaster: '乙', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 을목은 신금에 극심, 정화로 금 녹이고 계수 보양.',
    rating: 5
  },
  {
    daymaster: '乙', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 건조, 을목 마르니 계수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '乙', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 을목은 수다하니 병화가 급함.',
    rating: 5
  },
  {
    daymaster: '乙', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 을목은 얼어붙으니 병화 필수.',
    rating: 5
  },
  {
    daymaster: '乙', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦겨울 을목은 병화로 해동하고 계수로 뿌리 보양.',
    rating: 4
  },

  // ============ 丙火 일간 (12개월) ============
  {
    daymaster: '丙', month: '寅',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초봄 병화는 목생화로 기운 얻어야. 갑을목이 좋음.',
    rating: 3
  },
  {
    daymaster: '丙', month: '卯',
    climate: '온화', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '중봄 병화는 목의 생조 받아 빛남. 무기토로 설기.',
    rating: 2
  },
  {
    daymaster: '丙', month: '辰',
    climate: '습', primaryYongsin: '목', secondaryYongsin: '금',
    reasoning: '늦봄 습토월, 갑목으로 병화 생조하고 경금으로 갑목 조각.',
    rating: 3
  },
  {
    daymaster: '丙', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 병화 왕성, 임수로 제어하고 경금으로 수원 생성.',
    rating: 4
  },
  {
    daymaster: '丙', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 병화 극왕, 임수 필수로 조열 해소.',
    rating: 5
  },
  {
    daymaster: '丙', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 병화 아직 강하니 임계수로 식히고 경신금 보조.',
    rating: 4
  },
  {
    daymaster: '丙', month: '申',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '초가을 금왕, 병화 쇠하니 갑목으로 생조하고 임수 통관.',
    rating: 3
  },
  {
    daymaster: '丙', month: '酉',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '중가을 병화 쇠약, 갑을목으로 생조 필요.',
    rating: 4
  },
  {
    daymaster: '丙', month: '戌',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦가을 건조, 갑목으로 병화 살리고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '丙', month: '亥',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초겨울 병화는 갑목의 생조 급히 필요.',
    rating: 4
  },
  {
    daymaster: '丙', month: '子',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '한겨울 병화 쇠약, 갑을목 생조 필수. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '丙', month: '丑',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦겨울 병화는 갑목으로 생조받아야 빛남.',
    rating: 4
  },

  // ============ 丁火 일간 (12개월) ============
  {
    daymaster: '丁', month: '寅',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초봄 정화는 갑을목 생조로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '丁', month: '卯',
    climate: '온화', primaryYongsin: '목', secondaryYongsin: '금',
    reasoning: '중봄 정화는 을목 생조 좋고, 경금으로 갑목 조각.',
    rating: 2
  },
  {
    daymaster: '丁', month: '辰',
    climate: '습', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦봄 정화는 갑목 생조 필요. 병화 도움.',
    rating: 3
  },
  {
    daymaster: '丁', month: '巳',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '초여름 정화는 갑목 있어야 빛남. 임수로 과열 방지.',
    rating: 3
  },
  {
    daymaster: '丁', month: '午',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '한여름 정화는 갑목 필수. 임수로 조열 해소.',
    rating: 4
  },
  {
    daymaster: '丁', month: '未',
    climate: '열', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦여름 정화는 갑목으로 빛내고 계수로 습열 조절.',
    rating: 3
  },
  {
    daymaster: '丁', month: '申',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초가을 정화 쇠하니 갑을목 생조 필요.',
    rating: 4
  },
  {
    daymaster: '丁', month: '酉',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '중가을 정화 쇠약, 갑목 생조 급함.',
    rating: 4
  },
  {
    daymaster: '丁', month: '戌',
    climate: '조', primaryYongsin: '목', secondaryYongsin: '수',
    reasoning: '늦가을 정화는 갑목으로 살리고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '丁', month: '亥',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '초겨울 정화는 갑목 생조 필수.',
    rating: 5
  },
  {
    daymaster: '丁', month: '子',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '토',
    reasoning: '한겨울 정화 꺼지기 쉬우니 갑목 생조 급함. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '丁', month: '丑',
    climate: '한', primaryYongsin: '목', secondaryYongsin: '화',
    reasoning: '늦겨울 정화는 갑을목 생조로 살려야.',
    rating: 4
  },

  // ============ 戊土 일간 (12개월) ============
  {
    daymaster: '戊', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초봄 무토는 병화로 따뜻하게. 목왕절이라 화 필수.',
    rating: 4
  },
  {
    daymaster: '戊', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 무토는 병화로 생조받고 경금으로 설기.',
    rating: 3
  },
  {
    daymaster: '戊', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦봄 무토는 병화로 습기 말리고 갑목으로 소토.',
    rating: 3
  },
  {
    daymaster: '戊', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 무토는 화다하니 임수로 식히고 경금 수원.',
    rating: 4
  },
  {
    daymaster: '戊', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 무토 건조, 임수 급히 필요. 갑목 소토.',
    rating: 5
  },
  {
    daymaster: '戊', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '목',
    reasoning: '늦여름 무토는 임계수로 습윤하게, 갑목 소토.',
    rating: 4
  },
  {
    daymaster: '戊', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 무토는 병화로 생조하고 임수로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '戊', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 무토 설기 심하니 병화 생조 필요.',
    rating: 4
  },
  {
    daymaster: '戊', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '목',
    reasoning: '늦가을 무토 건조, 임계수로 윤택하게. 갑목 소토.',
    rating: 4
  },
  {
    daymaster: '戊', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 무토는 수다하니 병화 급함.',
    rating: 5
  },
  {
    daymaster: '戊', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 무토는 수에 잠기니 병화 필수.',
    rating: 5
  },
  {
    daymaster: '戊', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦겨울 무토는 병화로 해동하고 갑목으로 소토.',
    rating: 4
  },

  // ============ 己土 일간 (12개월) ============
  {
    daymaster: '己', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초봄 기토는 병정화로 따뜻하게 해야 만물 생육.',
    rating: 4
  },
  {
    daymaster: '己', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '중봄 기토는 병화 생조받고 신금으로 설기.',
    rating: 3
  },
  {
    daymaster: '己', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦봄 기토는 병화로 습기 말리고 신금 설기.',
    rating: 3
  },
  {
    daymaster: '己', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '초여름 기토는 계수로 식히고 신금 수원.',
    rating: 4
  },
  {
    daymaster: '己', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '한여름 기토 건조, 계수 급히 필요.',
    rating: 5
  },
  {
    daymaster: '己', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '금',
    reasoning: '늦여름 기토는 계수로 습윤하게.',
    rating: 4
  },
  {
    daymaster: '己', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 기토는 병정화 생조 필요.',
    rating: 3
  },
  {
    daymaster: '己', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 기토 설기 심하니 병화 생조.',
    rating: 4
  },
  {
    daymaster: '己', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦가을 기토 건조, 계수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '己', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 기토는 수다하니 병화 급함.',
    rating: 5
  },
  {
    daymaster: '己', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 기토는 병화 필수.',
    rating: 5
  },
  {
    daymaster: '己', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 기토는 병화로 해동.',
    rating: 4
  },

  // ============ 庚金 일간 (12개월) ============
  {
    daymaster: '庚', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초봄 경금은 병정화로 제련해야 쓸모있음.',
    rating: 4
  },
  {
    daymaster: '庚', month: '卯',
    climate: '온화', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중봄 경금은 정화로 제련하고 무토 생조.',
    rating: 3
  },
  {
    daymaster: '庚', month: '辰',
    climate: '습', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦봄 경금은 병화로 제련하고 갑목 보조.',
    rating: 3
  },
  {
    daymaster: '庚', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초여름 경금은 임수로 식히고 무토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '한여름 경금 녹으니 임수 급히 필요. 무토 생조.',
    rating: 5
  },
  {
    daymaster: '庚', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦여름 경금은 임수로 식히고 무기토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '초가을 경금 왕성, 정화로 제련해야 그릇됨.',
    rating: 3
  },
  {
    daymaster: '庚', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '중가을 경금 극왕, 정화 제련 필수. 임수 설기.',
    rating: 4
  },
  {
    daymaster: '庚', month: '戌',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦가을 경금은 정화로 제련하고 임수 윤택.',
    rating: 3
  },
  {
    daymaster: '庚', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 경금은 병정화로 제련. 무토 생조.',
    rating: 4
  },
  {
    daymaster: '庚', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 경금은 병정화 필수. 무토로 수 막음.',
    rating: 5
  },
  {
    daymaster: '庚', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '목',
    reasoning: '늦겨울 경금은 병정화로 제련. 갑목 보조.',
    rating: 4
  },

  // ============ 辛金 일간 (12개월) ============
  {
    daymaster: '辛', month: '寅',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '초봄 신금은 무기토 생조 필요. 병화로 따뜻하게.',
    rating: 4
  },
  {
    daymaster: '辛', month: '卯',
    climate: '온화', primaryYongsin: '토', secondaryYongsin: '수',
    reasoning: '중봄 신금은 무기토 생조하고 임수로 씻어야 빛남.',
    rating: 3
  },
  {
    daymaster: '辛', month: '辰',
    climate: '습', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '늦봄 신금은 임수로 씻어 빛내고 병화로 건조.',
    rating: 3
  },
  {
    daymaster: '辛', month: '巳',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초여름 신금은 임계수로 씻고 무기토 생조.',
    rating: 4
  },
  {
    daymaster: '辛', month: '午',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '한여름 신금 녹으니 임계수 급히 필요. 기토 생조.',
    rating: 5
  },
  {
    daymaster: '辛', month: '未',
    climate: '열', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦여름 신금은 임수로 씻고 기토 생조.',
    rating: 4
  },
  {
    daymaster: '辛', month: '申',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '초가을 신금은 임수로 씻어야 보석처럼 빛남.',
    rating: 3
  },
  {
    daymaster: '辛', month: '酉',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '화',
    reasoning: '중가을 신금 왕지, 임수로 씻어 빛내야.',
    rating: 4
  },
  {
    daymaster: '辛', month: '戌',
    climate: '조', primaryYongsin: '수', secondaryYongsin: '토',
    reasoning: '늦가을 신금은 임수로 윤택하게.',
    rating: 3
  },
  {
    daymaster: '辛', month: '亥',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '초겨울 신금은 무기토 생조하고 병화로 따뜻하게.',
    rating: 4
  },
  {
    daymaster: '辛', month: '子',
    climate: '한', primaryYongsin: '토', secondaryYongsin: '화',
    reasoning: '한겨울 신금은 무기토 생조 필수. 병화로 해동.',
    rating: 5
  },
  {
    daymaster: '辛', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '수',
    reasoning: '늦겨울 신금은 병화로 따뜻하게 하고 임수로 씻음.',
    rating: 4
  },

  // ============ 壬水 일간 (12개월) ============
  {
    daymaster: '壬', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '초봄 임수는 병화로 따뜻하게. 경금 수원.',
    rating: 4
  },
  {
    daymaster: '壬', month: '卯',
    climate: '온화', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '중봄 임수는 경신금 수원 필요. 병화 보조.',
    rating: 3
  },
  {
    daymaster: '壬', month: '辰',
    climate: '습', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦봄 임수는 경금 수원하고 병화로 설기.',
    rating: 3
  },
  {
    daymaster: '壬', month: '巳',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '초여름 임수 말라가니 경신금 수원 급함.',
    rating: 4
  },
  {
    daymaster: '壬', month: '午',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '한여름 임수 고갈, 경신금 수원 필수. 계수 보조.',
    rating: 5
  },
  {
    daymaster: '壬', month: '未',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '늦여름 임수는 경신금 수원 필요.',
    rating: 4
  },
  {
    daymaster: '壬', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초가을 임수 득령, 병화로 따뜻하게. 무토 제수.',
    rating: 3
  },
  {
    daymaster: '壬', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중가을 임수 왕성, 병화로 설기하고 무토 제수.',
    rating: 3
  },
  {
    daymaster: '壬', month: '戌',
    climate: '조', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦가을 임수는 경금 수원하고 병화로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '壬', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 임수 왕지, 병화 필수로 한기 해소.',
    rating: 5
  },
  {
    daymaster: '壬', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 임수 극왕, 병화 급함. 무토 제수.',
    rating: 5
  },
  {
    daymaster: '壬', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 임수는 병화로 해동하고 경금 수원.',
    rating: 4
  },

  // ============ 癸水 일간 (12개월) ============
  {
    daymaster: '癸', month: '寅',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '초봄 계수는 병정화로 따뜻하게. 신금 수원.',
    rating: 4
  },
  {
    daymaster: '癸', month: '卯',
    climate: '온화', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '중봄 계수는 신금 수원 필요. 정화 보조.',
    rating: 3
  },
  {
    daymaster: '癸', month: '辰',
    climate: '습', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦봄 계수는 신금 수원하고 정화로 설기.',
    rating: 3
  },
  {
    daymaster: '癸', month: '巳',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '초여름 계수 마르니 신금 수원 급함.',
    rating: 4
  },
  {
    daymaster: '癸', month: '午',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '한여름 계수 고갈, 신금 수원 필수. 임수 보조.',
    rating: 5
  },
  {
    daymaster: '癸', month: '未',
    climate: '열', primaryYongsin: '금', secondaryYongsin: '수',
    reasoning: '늦여름 계수는 신금 수원 필요.',
    rating: 4
  },
  {
    daymaster: '癸', month: '申',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초가을 계수 득령, 정화로 따뜻하게.',
    rating: 3
  },
  {
    daymaster: '癸', month: '酉',
    climate: '조', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '중가을 계수 왕성, 정화로 설기하고 기토 제수.',
    rating: 3
  },
  {
    daymaster: '癸', month: '戌',
    climate: '조', primaryYongsin: '금', secondaryYongsin: '화',
    reasoning: '늦가을 계수는 신금 수원하고 정화로 건조 해소.',
    rating: 3
  },
  {
    daymaster: '癸', month: '亥',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '초겨울 계수 왕, 정화 필수.',
    rating: 5
  },
  {
    daymaster: '癸', month: '子',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '토',
    reasoning: '한겨울 계수 극왕, 정화 급함. 기토 제수.',
    rating: 5
  },
  {
    daymaster: '癸', month: '丑',
    climate: '한', primaryYongsin: '화', secondaryYongsin: '금',
    reasoning: '늦겨울 계수는 정화로 해동하고 신금 수원.',
    rating: 4
  },
];

/**
 * 궁통보감 조후용신 조회 함수
 */
export function getJohuYongsin(daymaster: string, monthBranch: string): JohuYongsinInfo | null {
  return JOHU_YONGSIN_DB.find(
    info => info.daymaster === daymaster && info.month === monthBranch
  ) || null;
}

/**
 * 조후 필요도 평가 함수
 */
export function evaluateJohuNeed(daymaster: string, monthBranch: string): {
  rating: number;
  description: string;
  urgent: boolean;
} {
  const info = getJohuYongsin(daymaster, monthBranch);
  if (!info) {
    return { rating: 0, description: '조후 정보 없음', urgent: false };
  }

  const ratingDesc: Record<number, string> = {
    1: '조후 필요 낮음 - 기후 온화',
    2: '조후 필요 보통 - 약간의 조절 유리',
    3: '조후 필요 중간 - 조후용신 있으면 좋음',
    4: '조후 필요 높음 - 조후용신 중요',
    5: '조후 필요 급함 - 조후용신 필수'
  };

  return {
    rating: info.rating,
    description: ratingDesc[info.rating] || '',
    urgent: info.rating >= 4
  };
}

/**
 * 조후용신과 억부용신 조화 판단
 */
export function harmonizeYongsin(
  johuYongsin: FiveElement,
  eokbuYongsin: FiveElement,
  johuRating: number
): {
  primary: FiveElement;
  secondary: FiveElement;
  harmony: 'excellent' | 'good' | 'conflict';
  recommendation: string;
} {
  // 같으면 최상
  if (johuYongsin === eokbuYongsin) {
    return {
      primary: johuYongsin,
      secondary: johuYongsin,
      harmony: 'excellent',
      recommendation: '조후용신과 억부용신이 일치하여 최상의 조합'
    };
  }

  // 조후 필요도가 높으면 조후 우선
  if (johuRating >= 4) {
    return {
      primary: johuYongsin,
      secondary: eokbuYongsin,
      harmony: 'good',
      recommendation: '조후가 급하므로 조후용신 우선, 억부용신 보조'
    };
  }

  // 조후 필요도가 낮으면 억부 우선
  return {
    primary: eokbuYongsin,
    secondary: johuYongsin,
    harmony: 'good',
    recommendation: '조후 필요가 낮으므로 억부용신 우선, 조후용신 보조'
  };
}
