/**
 * Destiny Calendar Constants
 * 운명 캘린더에서 사용하는 상수 정의.
 *
 * 천간/지지·오행·지장간·합충형해(合冲刑害) 등 사주 공용 상수는 saju/constants
 * 정본에서 재export/파생한다 — 복사본을 두지 않아 정본과 갈라지지 않는다.
 * (예전 이 파일의 午/亥 지장간이 정본 수정과 어긋나 운명 캘린더만 옛 값을 쓰던
 *  회귀를 차단.) 아래 캘린더 고유 상수(삼재·역마·도화·건록·십신표·오행관계·
 *  황도 12궁·영역 설정)만 로컬로 둔다.
 */

import {
  STEM_NAMES,
  BRANCH_NAMES,
  STEMS as SAJU_STEMS,
  BRANCHES as SAJU_BRANCHES,
  SAMHAP as SAJU_SAMHAP,
} from '@/lib/saju/constants'

// 합충형해·천을귀인·지장간은 정본을 그대로 재export (동일 객체 → 갈라질 수 없음).
export { CHEONEUL_GWIIN_MAP, JIJANGGAN, YUKHAP, CHUNG, XING, HAI } from '@/lib/saju/constants'

// ============================================================
// 천간/지지 기본 데이터 (정본 이름 배열에서 복사 — 소비처 변형이 정본에 새지 않게)
// ============================================================
export const STEMS = [...STEM_NAMES]
export const BRANCHES = [...BRANCH_NAMES]

// 오행 영문 표기 — 캘린더 레이어는 wood/fire/earth/metal/water 를 쓴다. 정본의
// 한글 오행을 1:1 로 매핑해 파생(값은 동일, 표기만 영문).
const ELEMENT_KO_TO_EN: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
export const STEM_TO_ELEMENT: Record<string, string> = Object.fromEntries(
  SAJU_STEMS.map((s) => [s.name, ELEMENT_KO_TO_EN[s.element]])
)
export const BRANCH_TO_ELEMENT: Record<string, string> = Object.fromEntries(
  SAJU_BRANCHES.map((b) => [b.name, ELEMENT_KO_TO_EN[b.element]])
)

// 삼합(三合) — 정본은 한글 오행 키(수/목/화/금), 캘린더는 영문 키. 키만 매핑(값 동일).
export const SAMHAP: Record<string, string[]> = {
  water: SAJU_SAMHAP['수'],
  wood: SAJU_SAMHAP['목'],
  fire: SAJU_SAMHAP['화'],
  metal: SAJU_SAMHAP['금'],
}

// ============================================================
// 삼재 (三災)
// ============================================================
export const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  寅: ['申', '酉', '戌'],
  午: ['申', '酉', '戌'],
  戌: ['申', '酉', '戌'],
  巳: ['寅', '卯', '辰'],
  酉: ['寅', '卯', '辰'],
  丑: ['寅', '卯', '辰'],
  申: ['巳', '午', '未'],
  子: ['巳', '午', '未'],
  辰: ['巳', '午', '未'],
  亥: ['亥', '子', '丑'],
  卯: ['亥', '子', '丑'],
  未: ['亥', '子', '丑'],
}

// ============================================================
// 역마살 (驛馬殺)
// ============================================================
export const YEOKMA_BY_YEAR_BRANCH: Record<string, string> = {
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  申: '寅',
  子: '寅',
  辰: '寅',
  亥: '巳',
  卯: '巳',
  未: '巳',
}

// ============================================================
// 도화살 (桃花殺)
// ============================================================
export const DOHWA_BY_YEAR_BRANCH: Record<string, string> = {
  寅: '卯',
  午: '卯',
  戌: '卯',
  巳: '午',
  酉: '午',
  丑: '午',
  申: '酉',
  子: '酉',
  辰: '酉',
  亥: '子',
  卯: '子',
  未: '子',
}

// ============================================================
// 건록 (建祿)
// ============================================================
export const GEONROK_BY_DAY_STEM: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
}

// ============================================================
// 십신 (十神)
// ============================================================
export const SIPSIN_RELATIONS: Record<string, Record<string, string>> = {
  甲: {
    甲: '비견',
    乙: '겁재',
    丙: '식신',
    丁: '상관',
    戊: '편재',
    己: '정재',
    庚: '편관',
    辛: '정관',
    壬: '편인',
    癸: '정인',
  },
  乙: {
    乙: '비견',
    甲: '겁재',
    丁: '식신',
    丙: '상관',
    己: '편재',
    戊: '정재',
    辛: '편관',
    庚: '정관',
    癸: '편인',
    壬: '정인',
  },
  丙: {
    丙: '비견',
    丁: '겁재',
    戊: '식신',
    己: '상관',
    庚: '편재',
    辛: '정재',
    壬: '편관',
    癸: '정관',
    甲: '편인',
    乙: '정인',
  },
  丁: {
    丁: '비견',
    丙: '겁재',
    己: '식신',
    戊: '상관',
    辛: '편재',
    庚: '정재',
    癸: '편관',
    壬: '정관',
    乙: '편인',
    甲: '정인',
  },
  戊: {
    戊: '비견',
    己: '겁재',
    庚: '식신',
    辛: '상관',
    壬: '편재',
    癸: '정재',
    甲: '편관',
    乙: '정관',
    丙: '편인',
    丁: '정인',
  },
  己: {
    己: '비견',
    戊: '겁재',
    辛: '식신',
    庚: '상관',
    癸: '편재',
    壬: '정재',
    乙: '편관',
    甲: '정관',
    丁: '편인',
    丙: '정인',
  },
  庚: {
    庚: '비견',
    辛: '겁재',
    壬: '식신',
    癸: '상관',
    甲: '편재',
    乙: '정재',
    丙: '편관',
    丁: '정관',
    戊: '편인',
    己: '정인',
  },
  辛: {
    辛: '비견',
    庚: '겁재',
    癸: '식신',
    壬: '상관',
    乙: '편재',
    甲: '정재',
    丁: '편관',
    丙: '정관',
    己: '편인',
    戊: '정인',
  },
  壬: {
    壬: '비견',
    癸: '겁재',
    甲: '식신',
    乙: '상관',
    丙: '편재',
    丁: '정재',
    戊: '편관',
    己: '정관',
    庚: '편인',
    辛: '정인',
  },
  癸: {
    癸: '비견',
    壬: '겁재',
    乙: '식신',
    甲: '상관',
    丁: '편재',
    丙: '정재',
    己: '편관',
    戊: '정관',
    辛: '편인',
    庚: '정인',
  },
}

// ============================================================
// 오행 관계
// ============================================================
export const ELEMENT_RELATIONS: Record<
  string,
  { generates: string; controls: string; generatedBy: string; controlledBy: string }
> = {
  wood: { generates: 'fire', controls: 'earth', generatedBy: 'water', controlledBy: 'metal' },
  fire: { generates: 'earth', controls: 'metal', generatedBy: 'wood', controlledBy: 'water' },
  earth: { generates: 'metal', controls: 'water', generatedBy: 'fire', controlledBy: 'wood' },
  metal: { generates: 'water', controls: 'wood', generatedBy: 'earth', controlledBy: 'fire' },
  water: { generates: 'wood', controls: 'fire', generatedBy: 'metal', controlledBy: 'earth' },
}

// ============================================================
// 황도 12궁 오행
// ============================================================
export const ZODIAC_TO_ELEMENT: Record<string, string> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

// FortuneArea + AREA_CONFIG (6축: career/wealth/love/health/study/travel)
// 통째 제거 (2026-06-06): caller 0 — 옛 destiny-map 영역 점수 시스템 잔재.
// 점수축 SSOT 는 src/lib/astrology/themes/types.ts 의 AstroThemeKey
// (5축: love/money/career/health/growth) — 캘린더 + destinypal 카드 모두
// 그쪽 import 함. 6축 의문 사라짐.
