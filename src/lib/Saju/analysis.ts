// src/lib/Saju/analysis.ts
//
// Saju 라이브러리 개요/설계/알고리즘 메모(문서용)
// - 코드 의존 없음. 번들 제외를 원하면 빌드 설정에서 제외하세요.
//
// 디렉터리 개요
// ├─ constants.ts   : 도메인 상수/룩업/절입 계산 훅(getSolarTermKST)
// ├─ index.ts       : 공개 엔트리(퍼블릭 API)
// ├─ relations.ts   : 합/충/형/파/해/원진/삼합/육합/방합/공망 등 관계 판단 유틸
// ├─ saju.ts        : 핵심 원국 계산기(연/월/일/시 기둥 산출)
// ├─ shinsal.ts     : 신살(역마/화개/겁살 등) 계산 유틸
// ├─ timezone.ts    : 타임존 유틸(Intl 기반 오프셋 계산 + 성능 캐시)
// ├─ types.ts       : 도메인 타입의 단일 출처(SSOT)
// └─ unse.ts        : 운세/달력 유틸(대운/연운/월운/일진)
//
// 핵심 타입 개요(types.ts)
// - FiveElement(오행), YinYang(음양), SibsinKind(십성)
// - StemBranchInfo: 간지 기본 정보(name, element, yin_yang)
// - PillarGanjiData: 원국 기둥에 놓인 간지 + 해당 십성
//   - name, element, yin_yang, sibsin
// - PillarData: 각 기둥(천간/지지/지장간)
// - SajuPillars: 4주 컨테이너(year/month/day/time)
// - 운세 타입: DaeunData/YeonunData/WolunData/IljinData
// - 관계/신살 표현 타입: RelationHit, ShinsalHit 등
//
// 상수/룩업(constants.ts)
// - STEMS(10천간), BRANCHES(12지지): StemBranchInfo[] 형태
// - MONTH_STEM_LOOKUP: 연간 → 寅월 월간
// - CHEONEUL_GWIIN_MAP: 천을귀인 매핑(일간 → 지지 목록)
// - FIVE_ELEMENT_RELATIONS: 상생/상극 테이블
// - getSolarTermKST(year, month): 해당 연/월의 절입 시각을 KST 기준 Date로 반환
//   - 사용부에서는 “KST 기반 Date”라는 가정을 유지
//
// 타임존(timezone.ts)
// - getSupportedTimezones(): 런타임 지원 타임존 목록
// - getUserTimezone(): 런타임 기본 타임존
// - getOffsetMinutes(instantUTC, timeZone): timeZone 오프셋(분) 계산
//   - Intl.DateTimeFormat(...).formatToParts 기반, 캐시로 성능 개선
// - formatOffset(+540) → "UTC+09:00"
//
// 원국 계산(saju.ts) 개요
// - 입력: 출생 시각/장소(타임존), 양/음력, 윤달 등
// - 단계:
//   1) 출생 시각 정규화: "출생지 타임존 로컬" → UTC Date
//      - date-fns-tz toDate 또는 timezone.ts 오프셋 방식 사용
//   2) 절입/사시 경계 고려해 연/월/일/시 간지 계산
//   3) 지장간 채우기, 각 지장간의 십성 산정
//   4) PillarGanjiData(천간/지지)에 name, element, yin_yang, sibsin 채우기
// - 결과: calculateSajuData → { pillars: SajuPillars, dayMaster, ... }
//
// 운세/달력(unse.ts)
// - getDaeunCycles(birthDate, gender, sajuPillars, dayMaster, timeZone)
//   - 방향: 연간 음양과 성별로 전진/후진 결정
//   - daeunsu(대운수): 출생 순간과 직전/직후 절입 사이 시간 차를 일수로 → 정책(3일=1세)
//     - 라운딩 정책 DAEUN_ROUNDING: round/ceil/floor (기본 round)
//   - 시작점: 월주에서 1주(10년)씩 10회 생성(옵션화 가능)
//   - 십성: getSibseong(dayMaster, STEM/BRANCH)
// - getAnnualCycles(startYear, count, dayMaster)
//   - gapja_index = (year - 4) % 60로 간지 산출, 십성 부여
// - getMonthlyCycles(year, dayMaster) [간편 모드]
//   - YEAR_STEM → 寅월 월간으로 시작, 양력월을 고정 매핑(1=丑, 2=寅, ... 12=子)
//   - 정확 모드(절기월)는 추후 별도 함수로 확장 권장
// - getIljinCalendar(year, month, dayMaster)
//   - 앵커: 1984-02-04 00:00 KST == 1984-02-03 15:00 UTC
//   - KST 자정 간격으로 진행하여 일간/일지 산출, 십성/천을귀인 플래그 포함
// - normalizeBirthToUTC: date-fns-tz toDate(isoLocal, { timeZone }) 사용
//
// 관계(relations.ts) / 신살(shinsal.ts)
// - relations.ts: 천간합/충, 지지 육합/삼합/방합/충/형/파/해/원진, 공망 등 판단
//   - 반환: RelationHit[] 형태 권장
// - shinsal.ts: 역마/화개/겁살/육해/길성/흉성 등 규칙에 따른 적중 표시
//   - 반환: ShinsalHit[]
//
// 공개 엔트리(index.ts)
// - 외부 사용자는 index.ts만 import해서 사용(경로/의존 안정화)
//
// 설계 원칙/정책
// - 타입 일관성: types.ts가 계약의 단일 출처
// - 타임존 안정성: date-fns-tz 또는 Intl 기반 유틸로 호스트 타임존 의존 제거
// - 성능: Intl 포맷터 캐시, 상수 룩업 재사용
// - 모드 분리: 월운 간편/정확 모드 분리(현재는 간편 모드만 노출)
//
// 테스트 권장
// - 타임존: Asia/Seoul, America/Los_Angeles, America/St_Johns(30/45분 오프셋 포함 지역), Asia/Kolkata
// - 절입 경계: 절입 직전/직후 ±1시간 출생
// - 일진 앵커 검증: 1984-02-04 KST 및 인접 날짜 공개 만세력 대조
//
// FAQ
// Q. PillarGanjiData에 음양(yin_yang)을 포함하는 이유?
//  - 계산/표시에 자주 필요하고, StemBranchInfo에서 복사 비용이 낮음. 타입 일관성↑.
// Q. 왜 월운이 양력월 기준?
//  - 간편 모드. 정확 모드는 절기월 경계 사용이 필요해 별도 함수로 확장 예정.
// Q. 대운수 계산의 3일=1세 근거?
//  - 전통적 환산법 중 하나. 프로젝트 정책으로 고정하며 라운딩은 선택지 제공.
//
// 사용 흐름 예시
//   import { calculateSajuData, getDaeunCycles, getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/Saju';
//
//   const saju = calculateSajuData(input); // { pillars, dayMaster, ... }
//   const daeun = getDaeunCycles(birthDate, gender, saju.pillars, saju.dayMaster, timeZone);
//   const yeonun = getAnnualCycles(currentYear - 5, 11, saju.dayMaster);
//   const wolun = getMonthlyCycles(currentYear, saju.dayMaster);
//   const iljin = getIljinCalendar(year, month, saju.dayMaster);