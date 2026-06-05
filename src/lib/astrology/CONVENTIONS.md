# 점성 계산 컨벤션 (Astrology Conventions)

이 문서는 **점성 계산 코드가 따르는 학파·관례**를 한 곳에 정리한 단일 출처(SSOT)다.
사주 쪽 [`src/lib/saju/CONVENTIONS.md`](../saju/CONVENTIONS.md)의 점성 짝 문서.
새 코드를 추가하거나 외부 차트 도구와 결과가 다를 때, *이 문서가 우리 코드의 정답 기준*이다.

> **한 줄 요약:** 전통(헬레니즘/프톨레마이오스) 노선 — 7행성 중심 dignity, 메이저 어스펙트만,
> Swiss Ephemeris 위치 위임, Placidus 하우스(극지방 Whole Sign 폴백), sect(주야) 반영.
>
> 최종 갱신: 2026-06 (점성 doctrine audit 반영 — 이전 `docs/AUDIT_ASTRO.md` 통합·대체)

---

## 적용 범위

- `src/lib/astrology/foundation/*` — 점성 코어 (astrologyService, aspects, houses, dignities, ephe, shared …)
- `src/lib/astrology/advanced/*` — 고급 어스펙트/옵션
- `src/app/api/astrology/route.ts` — API 진입점

해석 문구는 [`src/lib/astrology/interpretations.ts`](./interpretations.ts).

새 점성 모듈을 추가할 때 *다른* 관례가 필요하면 별도 모듈로 분리하지 말고 이 문서를 PR로 갱신한다.

---

## 1. 진입점 / 위치 계산

| 항목 | 내용 | 위치 |
|---|---|---|
| API | 입력 검증 후 차트 산출 | `src/app/api/astrology/route.ts` |
| 엔진 | `calculateNatalChart()` | `foundation/astrologyService.ts` |
| 행성 위치 | **Swiss Ephemeris(`swisseph`) 위임** — `swe_calc_ut` | `foundation/ephe.ts`, `astrologyService.ts` |
| 시각→JD | local datetime → tz-aware → UTC → Julian Day | `foundation/shared.ts natalToJD()` |

**원칙:** 행성·ASC·MC·노드·소행성 좌표는 전부 Swiss Ephemeris가 정답. 우리 코드는 *파생 doctrine*(어스펙트·dignity·하우스 추론·고급 기법)만 책임진다. 위치 자체가 의심되면 ephemeris 로딩/JD 변환을 먼저 본다.

---

## 2. 각도(Aspect) — 메이저 중심

**선택:** 메이저 5종만 사용. **마이너 어스펙트는 런타임 차단**(전통 헬레니즘 노선, 의도적).

| 어스펙트 | 각도 |
|---|---|
| Conjunction | 0° |
| Sextile | 60° |
| Square | 90° |
| Trine | 120° |
| Opposition | 180° |

- `angleDiff`: conj=0·opp=180 정확, 360 wrap 정상 (conj↔opp swap 회귀 방지됨)
- 오브: **moiety(반경 평균)** 기반. `rules.orbs` 명시 시 legacy max 경로
- applying/separating: signedSep × relSpeed 부호로 판정

**위치:** `foundation/aspects.ts`, `foundation/aspectCore.ts`, `foundation/utils.ts angleDiff()`

**의도적 미사용:** semisextile(30)·semisquare(45)·quintile(72)·sesquiquadrate(135)·quincunx(150) — `MINOR_ASPECTS=[]` + `BLOCKED_MINOR`.

---

## 3. 하우스(House)

**선택:** **Placidus** 기본, 극지방 실패 시 **Whole Sign 폴백**(라벨에 정직하게 반영).

- Whole Sign: ASC 사인 0°를 1궁, 30°씩 등분
- 시간 미상(`birthTimeUnknown`): ASC/MC 의존 정보 마스킹

**위치:** `foundation/houses.ts`, `astrologyService.ts`

---

## 4. Dignity — 전통 7행성

**선택:** 전통 7행성만. **외행성(천왕·해왕·명왕) dignity 미사용**(의도적).

| 체계 | 내용 |
|---|---|
| Domicile(룰러십) | Aries→화성 … Pisces→목성 (전통 12사인 룰러) |
| Exaltation | 태양→Aries, 달→Taurus, 수성→Virgo, 금성→Pisces, 화성→Cap, 목성→Cancer, 토성→Libra |
| Detriment / Fall | 각각 룰러십/exaltation의 대척점 |
| Terms(텀) | 이집트 텀 (12사인×5, 프톨레마이오스/발렌스) |
| Faces(페이스) | 칼데안 순서 (0°Aries=화성 시작, 36 face) |
| Triplicity | 도로테우스 (낮/밤/참여 룰러) |

**위치:** `foundation/dignities.ts`

---

## 5. Arabic Parts / Profection

| 항목 | 규칙 | 위치 |
|---|---|---|
| Part of Fortune | 낮: ASC+Moon−Sun / 밤: ASC+Sun−Moon (sect 반영) | `foundation/arabicParts.ts`, `extraPoints.ts` |
| sect(주야 판정) | 태양이 7~12궁(지평선 위)=낮 | `extraPoints.ts isNightChart()` |
| Annual Profection | 연간 프로펙션 하우스 = (나이 mod 12)+1 | `foundation/profections.ts` |

---

## 6. 고급 기법 (Advanced)

| 기법 | 규칙 | 위치 |
|---|---|---|
| Synastry | 두 차트 간 어스펙트 | `foundation/synastry.ts` |
| Composite | 미드포인트(짧은 호) 합성 | `foundation/composite.ts`, `midpoints.ts` |
| Transit | 트랜짓 + applying/separating | `foundation/transit.ts` |
| Secondary Progression | **1일 = 1년** (day-for-a-year), 생시 보존 | `foundation/progressions.ts` |
| Solar Arc | progressed Sun − natal Sun 을 전체에 가산 | `foundation/progressions.ts` |
| Solar/Lunar Return | 트랜짓 태양/달이 natal 경도 복귀 | `foundation/returns.ts`, `planetReturns.ts` |
| Draconic | North Node를 0° Aries로 이동 | `foundation/draconic.ts` |
| Harmonics | n배음 = (경도×n) mod 360 | `foundation/harmonics.ts` |
| Zodiacal Releasing | Lot of Spirit/Fortune; 행성년수 **Sat 30**·Jup 12·Mars 15·Sun 19·Ven 8·Mer 20·Moon 25 | `foundation/zodiacalReleasing.ts` |
| Eclipses / Asteroids / Fixed Stars | 일월식, 소행성(Ceres 등), 항성(세차보정 50.3"/yr) | `foundation/eclipses.ts`, `asteroids.ts`, `fixedStars.ts` |

---

## 7. 2026-06 doctrine audit 교정

- **ZR 토성 행성년수 27→30** (Hellenistic Lesser Years). 회귀: [`tests/saju-astro-doctrine-regressions.test.ts`](../../../tests/saju-astro-doctrine-regressions.test.ts)
- `angleDiff` conj↔opp swap 회귀 방지 확인(PR #816)
- dignity/aspect 핵심 doctrine 외부 검증 완료(domicile·exaltation·텀·페이스·트리플리시티·PoF sect·profection 정확)

---

## 8. 의도적 선택 / 미구현 (추후 결정)

| 항목 | 현재 | 비고 |
|---|---|---|
| 마이너 어스펙트 | 차단 | 전통 노선(의도) |
| 외행성 dignity | 미사용 | 전통 7행성(의도) |
| ZR loosing-of-bond 점프 | 미구현 | 정통 ZR엔 있음 — 검토 |
| Draconic 노드 | "True Node" 하드코딩 | Mean Node 설정 시 예외 — 검토 |
| Harmonic 군집 중심 | 산술평균 | 0°/360° 경계 오차 — 검토 |
| Antiscia / contra-antiscia | 미구현 | — |
| 하우스 시스템 | Placidus 고정(natal) | 사용자 선택 옵션 검토 |

---

## 9. 결정성(Determinism) / 테스트

- 반복 계산 안정성·경도 `[0,360)`·하우스 유효성·어스펙트 역쌍 비중복: `tests/lib/astrology/foundation/determinism-golden.test.ts`
- doctrine 회귀(ZR·angleDiff): `tests/saju-astro-doctrine-regressions.test.ts`

**권장 가드레일(미완):** 선택 행성 경도를 고정 정밀도로 잠그는 5개 벡터, progression/transit 월·년 경계 테스트, ephemeris 가용성 startup smoke check.

---

## 10. 알려진 리스크 (운영)

1. ephemeris(`swisseph`) 로드 실패 시 엔진 불가 — startup 체크 권장
2. natal 경로 Placidus 고정 가정
3. DST 전후 timezone 모호성
4. 고QPS에서 `swe_calc_ut`/고급 모듈 비용
5. 고급 모듈(소행성/식/하모닉/교정) 확장으로 회귀 표면 증가
6. progression/transit 월 경계 contract 테스트 약함
7. 고급 라우트 결정성 fixture 공유 부재

(점성 correctness confidence: 핵심 doctrine 검증 완료, 외부 오라클 대조·고급 표면 커버리지는 보강 여지.)

---

## 변경 이력

- 2026-06: 최초 작성. 기존 `docs/AUDIT_ASTRO.md`(2026-03 감사 리포트) 내용을 흡수·대체하고
  doctrine audit(ZR 토성 30 등) 반영. 사주 `CONVENTIONS.md`와 대칭 구조로 정리.
