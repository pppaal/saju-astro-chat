# 사주·점성 계산 로드맵 — 서비스별 사용 + 추가 계획

**최종 업데이트**: 2026-06-06

본 문서는 4개 사용자-facing 서비스 (운명상담사 / 궁합 / 통합 리포트 / 운흐름) 에 대해 **현재 사용 중인 계산 + 그 역할** 과 **추가 예정 계산 + 어디 쓸지** 를 정리한다. `docs/CALCULATION_COVERAGE_AUDIT.md` 의 ✅/❌ 매트릭스를 보완하는 시나리오 중심 문서.

---

## 1. 운명상담사 (`/destiny-counselor`)

### 정체성
LLM 챗봇. 사용자가 자유 질문 → 사주+점성 컨텍스트로 답변.

### 현재 사용 중 (raw → LLM 프롬프트)
| 필드 | 역할 |
|---|---|
| pillars (4기둥) | 본명 천간·지지·지장간 — 모든 답변의 기반 |
| dayMaster + strength | 일간 강약 — 신강·신약 판정 |
| yongsin / 격국 / 십신 / 공망 | 사주 풀이 핵심 어휘 |
| daeun (현재 + 다음 대운) | "지금 시기" 답변용 |
| natalShinsal / natalRelations | 본명 신살·합충 |
| 12운성 | 일주 시기 강약 |
| fiveElements | 오행 분포 — 부족/과다 진단 |
| chart (planets/houses/ASC/MC) | 점성 본명 |
| sect (낮/밤) | 헬레니즘 풀이 기초 |
| extraPoints (Chiron/Lilith) | 보조 표상 |
| natalAspects | 행성 간 어스펙트 |
| dignities | 행성 위계 점수 |
| **profections** | "올해 운명 군주" — 사주 세운 짝꿍 ✅ |
| 일주 archetype | 일주 60갑자 별 인격 stereotype |

### 추가 예정 (compute 있음, 아직 LLM에 안 들어감)
| 필드 | 어떻게 쓸 건가 | 왜 |
|---|---|---|
| 형충회합 (hyeongchung) | 본명 컨텍스트에 "year-day 충 / month-time 합" 명시 | 인생 갈등 패턴 추론 |
| 통근 (tonggeun) | "일간 X 가 월지 Y 에 통근 80%" 등 정량 근거 주입 | 강약 답변의 "왜" 보강 |
| 득령 (deukryeong) | "월령 득령 여부 + 점수" | 강약 판정 첫 단계 명시 |
| 조후용신 (johuYongsin) | 계절 한열 + 조후 용신 sign | 일반 용신과 별도 시즌 케어 답변 |
| 명궁 (myungGung) | "당신의 명궁은 X" 1줄 컨텍스트 | 자아·운명 표상 보조 |
| 납음 (nayin) | 일주 납음 (예: 海中金) | 통변 비유 풍부화 |
| lots (7 Arabic Parts) | Fortune/Spirit 위치 — "이번 생 운명 / 영혼 방향" | Hellenistic 본명 정체성 |
| almutenFiguris | "본명 지배 행성: X" | "인생 전체의 보스" 한 줄 |
| zodiacalReleasing (현재 챕터) | Spirit/Fortune L1+L2 활성 챕터 sign | "지금 인생 시즌" Hellenistic 답변 |
| fixed stars | 행성-항성 합 (Regulus/Spica/Algol 등) | 특별 운 표상 |

### 추가 예정 (compute 아직 없음)
| 필드 | 어떻게 쓸 건가 | 왜 |
|---|---|---|
| Vedic dasha (Vimshottari) | "지금 X 다샤" 시간 군주 답변 | 인도 점성 표준 시간축 |
| Hyleg/Alcocoden | "수명 표상 행성: X" | 헬레니즘 생명력 분석 |
| 자평진전 8격 정밀 | "정관격/편관격 등" 정확한 격국 | 일반 격국보다 정밀 |
| 천을귀인 정밀 활성도 | "본명 천을 + 현재 운기 활성도" | 길성 영향력 정량 |

---

## 2. 궁합 상담사 (`/compatibility/counselor`)

### 정체성
LLM 챗봇. 두 사람의 사주+점성 비교 → 관계 답변.

### 현재 사용 중
| 필드 | 역할 |
|---|---|
| pillars (사람1 + 사람2) | 자체 sajuPayload — 두 사주의 기본 |
| dayMaster, strength, yongsin, geokguk, sibsin | 사주 궁합 분석 |
| daeun (두 사람) | 두 시간축 동시 비교 |
| fiveElements (두 사람) | 오행 균형 비교 |

### 비어있음 (가장 큰 missing)
| 영역 | 현재 | 왜 missing |
|---|---|---|
| **점성 synastry** (두 차트 간 어스펙트) | ❌ 코드는 있는데 0 사용 | 궁합이 사주만 다룸. 점성 측면 0 |
| **점성 composite** (두 차트 평균) | ❌ 코드는 있는데 0 사용 | 동일 |
| **두 차트 dignity 비교** | ❌ | "내 화성 vs 너의 금성" 류 답변 안 됨 |
| **두 사람 ZR 챕터 비교** | ❌ | 둘의 인생 시즌이 어떻게 만나나 |

### 추가 예정 (compute 있음, 궁합 페이지에 wire 필요)
| 필드 | 어떻게 쓸 건가 | 왜 |
|---|---|---|
| **synastry aspects** | 두 차트 행성 간 어스펙트 → 끌림/긴장 매핑 | 궁합 점성 핵심 |
| **composite chart** | 두 차트 평균 → "관계 자체의 인격" | 관계 본명 표상 |
| **lots 비교** | Fortune-Fortune, Spirit-Spirit 거리 | 운명/영혼 매칭 |
| almutenFiguris 비교 | 두 사람 인생 지배 행성 | 인생 톤 매칭 |

### 추가 예정 (compute 없음)
| 필드 | 어떻게 쓸 건가 |
|---|---|
| Vertex 매칭 | "운명적 만남" 표상 |
| 두 사람 progressed sun/moon 시너지 | 시간 따라 변하는 케미스트리 |

---

## 3. 통합 명식 리포트 (`/integrated-report`)

### 정체성
정적 페이지. 5섹션으로 본명 + 통합 cross 표시. LLM 없음 (순수 데이터 표시).

### 현재 사용 중
| 섹션 | 데이터 |
|---|---|
| **1. 사주 명식** | pillars / dayMaster / 12운성 / jijanggan / 신살 / relations |
| **2. 오행 / 용신** | fiveElements 분포 / yongsin / 격국 / strength |
| **3. 천궁도** | chart (planets/houses/ASC/MC) / sect / extraPoints |
| **4. 어스펙트** | natalAspects / dignities |
| **5. 통합 테마 (cross)** | natalCross 12 evaluators (정체성/욕망/사회역할/길흉/관계/강점/기질/에너지/드러나는 나/추진력/핵심성향 + 공망카르마) |

### 비어있음
| 영역 | 왜 missing |
|---|---|
| 6. 심화 사주 분석 섹션 | 형충회합/통근/득령/조후/명궁/납음/health/career 다 계산은 됨, 표시 안 됨 |
| 7. 헬레니즘 본명 섹션 | lots/almutenFiguris/ZR 현재 챕터 — 운흐름에만 노출 |
| 8. 어드밴스 점성 | fixed stars / asteroids / midpoints / harmonics — 통합 리포트 안 표시 |

### 추가 예정 (compute 있음)
| 섹션 | 필드 | 왜 |
|---|---|---|
| **신규 6. 심화 사주** | 형충회합 / 통근 / 득령 / 조후용신 + 명궁 + 납음 | 사주 핵심 분석 정량 표시 |
| **신규 7. 헬레니즘 본명** | lots (7 Arabic Parts) + almutenFiguris + ZR 현재 챕터 | 점성 본명 깊이 |
| **신규 cross 13** | 명궁 × ASC | 자아 표상 동·서 매칭 |
| **신규 cross 14** | 납음 × Sun sign | 자아 비유 매칭 |
| **신규 cross 15** | 통근 × essential dignity | 강도 시스템 매칭 |

### 추가 예정 (compute 없음)
| 섹션 | 필요한 계산 |
|---|---|
| 자평진전 8격 박스 | 8격 정밀 계산 추가 |
| 천을귀인 정밀 박스 | 정밀 활성도 계산 |

---

## 4. 운흐름 (`/destinypal`, `/destinypal/preview`)

### 정체성
5-tier 생애 운명 차트. 시간 스케일 별 (Lifetime / Decade / Year / Month / Day).

### 현재 사용 중 (tier 별)
| Tier | 사주 | 점성 |
|---|---|---|
| **Lifetime** | (없음 — 초장기는 점성이 강함) | almutenFiguris + ZR Spirit/Fortune 90년 sequence |
| **Decade** | daeun (10년) | ZR L2 chapter / firdaria |
| **Year** | 세운 (daeun 의 한 해) | profections / Solar Return-like (returns 모듈) |
| **Month** | 월운 | progressions (월 단위) |
| **Day** | 일진 | transit |

### 현재 사용 중인 데이터
- pillars / dayMaster / strength / daeun / fiveElements / dayJijanggan / 12운성
- chart / sect / extraPoints / dignities
- **lots** (전용) / **almutenFiguris** (전용) / **zodiacalReleasing** (전용)
- transits / progressions / returns

### 비어있음
| Tier | 비어있는 데이터 |
|---|---|
| Lifetime | 명궁 (사주 평생 표상) / Hyleg-Alcocoden / Vedic dasha 1차 |
| Decade | 천을귀인 정밀 활성도 / 자평진전 격국 |
| Year | profections (계산 있고 LLM 에 있는데 운흐름 Year tier 에 아직 안 들어감) / 조후용신 |
| Month | 형충회합 활성 패턴 |
| Day | 통근 강도 변화 |

### 추가 예정 (compute 있음)
| Tier | 필드 | 어떻게 쓸 건가 |
|---|---|---|
| Lifetime | 명궁 | 본명 시그널 박스 |
| Year | profections | Year tier 의 시간군주 강조 |
| Year | 조후용신 | "이 해 시즌 보정" 표시 |
| Month | 형충회합 | "이 달 어떤 신살 활성" |

### 추가 예정 (compute 없음)
| Tier | 필요한 계산 |
|---|---|
| Lifetime | Vedic Vimshottari dasha (인도 표준 시간축) |
| Lifetime | Hyleg/Alcocoden (헬레니즘 생명력) |
| Year | Tajaka annual chart (페르시아-인도 1년 차트) |

---

## 5. 계산 추가 우선순위 (cross-service)

### Tier S (가장 큰 임팩트)
1. **궁합 점성 synastry/composite 통합** — 코드 있음, UI 만. 궁합이 절반밖에 안 됨
2. **통합 리포트 신규 6/7 섹션** — 심화 사주 + 헬레니즘 본명 (compute 다 됨)

### Tier A (compute 있고 routing 만)
3. **명궁 / 납음** UI/LLM 통합
4. **lots/almutenFiguris/ZR 현재** 운명상담사 LLM 주입
5. **profections** 운흐름 Year tier 강조

### Tier B (compute 추가 필요)
6. **자평진전 8격 정밀** — 사주 해석 표준화
7. **Vedic Vimshottari dasha** — 인도 점성 표준 시간 군주
8. **Hyleg/Alcocoden** — 헬레니즘 생명력
9. **Vertex** — 운명의 만남 (궁합 보조)
10. **천을귀인 정밀 활성도** — 길성 정량

---

## 6. 결정 보드

다음 작업 후보:
- **A**: Tier S #1 (궁합 synastry) — 가장 큰 missing, compute 있음
- **B**: Tier S #2 (통합 리포트 6/7 섹션 추가) — UI 늘리기
- **C**: Tier A 일괄 (명궁/납음/lots/profections 라우팅) — compute 있는 거 전부 노출
- **D**: Tier B 새 compute 시작 — 자평진전 8격 / Vedic dasha 등
