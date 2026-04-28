# Cross-Rules Spec — 사주 × 점성 교차 룰 명세

> 자동 생성 문서. 룰 정의가 진실의 원천이며, 이 문서는 `scripts/generate-rules-spec.ts`로 재생성됩니다.

총 룰 수: **117**  ·  메타룰 수: **10**

## 인덱스

- **정적 (state)**: 67개
- **관계 (relation)**: 11개
- **시점 (timing)**: 39개
    - 10년 (대운): 6개
    - 1년 (세운/SR): 18개
    - 1달 (월운/LR): 5개
    - 1일 (일진/transit): 2개
    - 이벤트 (활성화): 8개

### 도메인 분포

- **self**: 57개
- **love**: 9개
- **money**: 11개
- **career**: 22개
- **health**: 7개
- **family**: 11개

---

## 정적 (STATE) 레이어

### `self.state.fire-dominant`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 에너지 과다
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.state.elementDominant.fire`
- 점성 측: `astro.state.elementDominant.fire`
**서술 (confirm)**
> 사주 화 기운과 점성 fire 사인이 함께 강해, 추진력은 강하지만 소진되기 쉬움.

**서술 (conflict / 양면)**

> 사주 화는 강한데 점성 fire는 약하거나 그 반대 — 추진력의 외부 표현과 내적 동력이 어긋남.

### `self.state.water-deficient`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 감정 자원 부족
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementAbsent.water`
- 점성 측: `astro.state.elementCount.water`
**서술 (confirm)**
> 사주 수 결핍과 점성 water 약세가 겹쳐 감정·직관 자원이 얕음. 회복 시간을 따로 마련해야 함.

### `money.state.earth-anchor`
- **레이어**: 정적 (state)
- **도메인**: money
- **의미**: 재물 안정 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementDominant.earth`
- 점성 측: `astro.state.elementDominant.earth`
**서술 (confirm)**
> 사주 토 기운과 점성 earth 사인이 함께 — 천천히 쌓는 형태의 재물 안정성.

### `self.state.wood-growth`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 성장·시작 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementDominant.wood`
- 점성 측: `astro.state.elementDominant.air`
**서술 (confirm)**
> 사주 목 기운과 점성 air 사인이 함께 — 새 시작·확장·움직임에 적성.

### `career.state.metal-discipline`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 결단·구조화 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementDominant.metal`
- 점성 측: `astro.state.elementDominant.air`
**서술 (confirm)**
> 사주 금 기운과 점성 air 사인이 함께 — 분석·결단·정제. 책임 영역에서 성과 가능성 큰 결.

### `self.state.fire-deficient`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 추진력 부족
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementAbsent.fire`
- 점성 측: `astro.state.elementCount.fire`
**서술 (confirm)**
> 사주 화 결핍과 점성 fire 약세가 겹침 — 의지·실행력 자원이 약함. 외부 자극·동기부여가 필요한 결.

### `self.state.day-master-strength`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 자아 강도 — 사주·점성 일치 여부
- **폴라리티 힌트**: 런타임 결정 (predicate가 polarity 반환)
**발화 조건**
- 사주 측: `saju.state.dayMaster.strength.strong` / `saju.state.dayMaster.strength.weak`
- 점성 측: `astro.state.dignity.Sun.detriment` / `astro.state.dignity.Sun.domicile` / `astro.state.dignity.Sun.exaltation` / `astro.state.dignity.Sun.fall` / `astro.state.planet.Sun.house.1` / `astro.state.planet.Sun.house.10` / `astro.state.planet.Sun.house.12` / `astro.state.planet.Sun.house.6`
**서술 (confirm)**
> 사주 일간의 강약과 점성 태양의 dignity가 같은 방향을 가리킴. 자기 표현이 환경과 잘 맞음.

**서술 (conflict / 양면)**

> 사주에서는 자아가 강한데 점성 태양은 위축됐거나(또는 그 반대) — 내·외 자기 평가가 어긋나는 구조.

### `love.state.spouse-palace-emphasis`
- **레이어**: 정적 (state)
- **도메인**: love
- **의미**: 관계 영역 본질 비중
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Venus.house.5` / `astro.state.planet.Venus.house.7` / `astro.state.planet.Venus.sign.Libra` / `astro.state.planet.Venus.sign.Taurus`
**서술 (confirm)**
> 사주 일지(배우자궁)에 재성/관성이 들어와 있고 점성 Venus도 7궁/5궁 또는 자기 별자리에 있음 — 관계가 평생 핵심 테마.

### `family.state.parental-palace`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 부모·뿌리 영역 비중
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Moon.house.4` / `astro.state.planet.Moon.sign.Cancer`
**서술 (confirm)**
> 사주 월지(부모·사회궁)에 인성이 깔려 있고 점성도 4궁 강조 또는 Cancer 사인 강세 — 가정·뿌리가 정체성에 큰 비중.

### `family.state.children-palace`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 자녀·창조 영역
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Jupiter.house.5` / `astro.state.planet.Sun.house.5` / `astro.state.planet.Venus.house.5`
**서술 (confirm)**
> 사주 시지(자녀궁)에 식상이 깔려 있고 점성도 5궁 강조 — 자녀·창조 표현이 인생의 한 축.

### `career.state.officer-emphasis`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 책임·관성 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Saturn.domicile` / `astro.state.dignity.Saturn.exaltation` / `astro.state.planet.Saturn.house.10` / `astro.state.planet.Saturn.sign.Capricorn`
**서술 (confirm)**
> 사주 관성이 강하고 점성도 Saturn dignity 또는 10궁 강조 — 책임 구조 안에서 성취가 자기 결.

### `self.state.expression-strength`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 표현·창조 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mercury.domicile` / `astro.state.dignity.Mercury.exaltation` / `astro.state.planet.Mercury.house.3` / `astro.state.planet.Mercury.house.5`
**서술 (confirm)**
> 사주 식상이 강하고 점성도 Mercury 또는 3궁/5궁 강조 — 표현·창조가 자기 발산 통로.

### `family.state.scholar-emphasis`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 학습·보호 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Jupiter.domicile` / `astro.state.dignity.Jupiter.exaltation` / `astro.state.planet.Jupiter.house.9` / `astro.state.planet.Moon.house.9`
**서술 (confirm)**
> 사주 인성이 강하고 점성도 Jupiter 또는 9궁 강조 — 학습·전통·보호가 인생 자원.

### `money.state.wealth-emphasis`
- **레이어**: 정적 (state)
- **도메인**: money
- **의미**: 재물 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Venus.domicile` / `astro.state.dignity.Venus.exaltation` / `astro.state.planet.Jupiter.house.2` / `astro.state.planet.Venus.house.2`
**서술 (confirm)**
> 사주 재성이 강하고 점성도 Venus dignity 또는 2궁 강조 — 재물 영역이 평생 활성화된 자기 결.

### `self.state.self-emphasis`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 자아 강세
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mars.domicile` / `astro.state.dignity.Mars.exaltation` / `astro.state.planet.Mars.house.1`
**서술 (confirm)**
> 사주 비겁이 강하고 점성도 Mars dignity 또는 1궁 강조 — 독립·주도가 자기 결.

### `self.state.lucky-shinsal-cross-benefic`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 길성×benefic 조응
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.lucky.`
- 점성 측: `astro.state.dignity.Jupiter.domicile` / `astro.state.dignity.Jupiter.exaltation` / `astro.state.dignity.Venus.domicile` / `astro.state.dignity.Venus.exaltation`
**서술 (confirm)**
> 사주 길성 신살(천을귀인 등)과 점성 benefic(목성·금성)의 dignity가 함께 — 위기 상황에서 도움이 들어오는 구조.

### `self.state.unlucky-shinsal-cross-malefic`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 흉성×malefic 조응
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.unlucky.`
- 점성 측: `astro.state.dignity.Mars.detriment` / `astro.state.dignity.Mars.fall` / `astro.state.dignity.Saturn.detriment` / `astro.state.dignity.Saturn.fall`
**서술 (confirm)**
> 사주 흉성 신살(망신·겁살 등)과 점성 malefic(화성·토성)의 hard 또는 detriment/fall이 함께 — 결정적 시기에 마찰이 누적되는 결.

### `love.state.dohwa-venus-emphasis`
- **레이어**: 정적 (state)
- **도메인**: love
- **의미**: 도화 × Venus 강조
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Venus.domicile` / `astro.state.dignity.Venus.exaltation` / `astro.state.planet.Venus.house.5` / `astro.state.planet.Venus.house.7`
**서술 (confirm)**
> 사주 도화살과 점성 Venus의 강한 dignity 또는 자기 별자리 위치가 함께 — 매력·인기·관계 시작 본성.

### `career.state.yeokma-mercury-emphasis`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 역마 × 변동 행성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mercury.domicile` / `astro.state.dignity.Mercury.exaltation` / `astro.state.modeDominant.mutable`
**서술 (confirm)**
> 사주 역마살과 점성 Mercury 또는 가변 mode 우세가 함께 — 이동·여행·변화 적응이 자기 강점.

### `self.state.hwagae-spiritual`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 화개 × 영성
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Moon.house.12` / `astro.state.planet.Neptune.house.` / `astro.state.planet.Sun.house.12`
**서술 (confirm)**
> 사주 화개살과 점성 Neptune 강조 또는 12궁 행성 강세가 함께 — 영성·고독·예술 영역에 끌림.

**서술 (conflict / 양면)**

> 영적 끌림과 현실 책임이 동시에 — 안과 밖이 다른 시기를 살아갈 결.

### `self.state.day-stage-active`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 일주 활성 × Sun 강세
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.twelveStage.active.day`
- 점성 측: `astro.state.dignity.Sun.domicile` / `astro.state.dignity.Sun.exaltation`
**서술 (confirm)**
> 사주 일주 12운성이 활성 단계(장생·임관·왕지 등)이고 점성 Sun이 dignity가 강함 — 자기 표현이 외부 환경에 잘 받쳐지는 구조.

### `self.state.day-stage-dormant`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 일주 휴면 × Sun 약세
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.twelveStage.dormant.day`
- 점성 측: `astro.state.dignity.Sun.detriment` / `astro.state.dignity.Sun.fall` / `astro.state.planet.Sun.house.12` / `astro.state.planet.Sun.house.6`
**서술 (confirm)**
> 사주 일주 12운성이 휴면 단계(쇠·병·사·묘·절)이고 점성 Sun도 detriment/fall 또는 12·6궁 — 자기 표현이 위축되기 쉬운 결.

### `career.state.geokguk-formal-vs-mc`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 정통 격국 × MC 강세
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Jupiter.house.10` / `astro.state.planet.Saturn.house.10` / `astro.state.planet.Sun.house.10`
**서술 (confirm)**
> 사주 정격(정관격·정인격·재격 등)과 점성 MC/10궁 강조가 함께 — 사회적 정통 경로가 자기 길.

### `self.state.geokguk-extreme-vs-stellium`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 특수격 × stellium
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.stellium.house.` / `astro.state.stellium.sign.`
**서술 (confirm)**
> 사주 특수격(종격·화기격국 등)과 점성 stellium(한 사인 또는 한 하우스에 행성 집중)이 함께 — 일반 해석이 안 통하는 특수한 자기 패턴. 한 영역에 인생이 쏠리는 결.

**서술 (conflict / 양면)**

> 특수격은 한 방향, 스텔리움은 다른 영역에 집중 — 사주와 점성이 가리키는 인생 무대가 다름. 우선순위 정립 필요.

### `self.state.yongsin-flow-fit`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 용신 흐름 × 자기 상태
- **폴라리티 힌트**: 런타임 결정 (predicate가 polarity 반환)
**발화 조건**
- 사주 측: `saju.state.yongsin.primary.`
- 점성 측: `astro.state.dignity.`
**서술 (confirm)**
> 사주 용신 오행이 점성 dignity 강한 행성 영역과 일치 — 평생 운영 방향이 외부 환경과 맞는 결.

**서술 (conflict / 양면)**

> 용신이 가리키는 방향과 점성 강한 영역이 어긋남 — 균형을 잡으려면 의식적 노력이 필요한 구조.

### `self.state.fixed-stability`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 고정 안정 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementDominant.earth`
- 점성 측: `astro.state.modeDominant.fixed`
**서술 (confirm)**
> 점성 fixed mode 우세와 사주 토 강세 또는 격국 정격이 함께 — 일관·끈기·고정 영역에서 안정 발휘.

### `self.state.cardinal-initiative`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 주도·시작 본성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementDominant.fire` / `saju.state.elementDominant.wood`
- 점성 측: `astro.state.modeDominant.cardinal`
**서술 (confirm)**
> 점성 cardinal mode 우세와 사주 비겁 또는 식상 강세가 함께 — 새 시작·주도가 자기 동력.

### `self.state.retrograde-introspection`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 역행 × 내향 본성
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.state.dayMaster.strength.weak`
- 점성 측: `astro.state.retrograde.`
**서술 (confirm)**
> 점성 역행 행성이 다수 + 사주 일간 약 또는 인성 강세 — 외부 발신보다 내적 정리가 자기 결.

**서술 (conflict / 양면)**

> 역행 신호와 외향 신호가 혼재 — 시기에 따라 방향을 다르게 가져가야 하는 구조.

### `career.state.stellium-tenth-vs-officer`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 10궁 stellium × 관격
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.stellium.house.10` / `astro.state.stellium.house.6`
**서술 (confirm)**
> 점성 10궁(직업) 또는 6궁(노동)에 stellium + 사주 관성격이 함께 — 직업·역할이 인생 핵심 무대.

### `love.state.stellium-seventh-vs-spouse`
- **레이어**: 정적 (state)
- **도메인**: love
- **의미**: 7궁 stellium × 일지 활성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.relation.day.`
- 점성 측: `astro.state.stellium.house.7`
**서술 (confirm)**
> 점성 7궁(파트너십)에 stellium + 사주 일지(배우자궁) 합/삼합 활성 — 관계가 인생 메인 테마.

### `family.state.fourth-house-stellium`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 4궁 stellium × 인성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.stellium.house.4`
**서술 (confirm)**
> 점성 4궁(가정·뿌리)에 stellium + 사주 인성격 또는 월지 활성 — 가정·정서 기반이 인생 핵심.

### `self.state.fixed-star-fated`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 항성 결합 × 신살
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.state.shinsal.`
- 점성 측: `astro.state.fixedStar.`
**서술 (confirm)**
> 점성 fixed star가 natal 행성과 1° 내 합 + 사주 길성/흉성 신살 — 평생 단위로 운명적 색깔이 강한 결.

**서술 (conflict / 양면)**

> 항성과 신살의 색이 다름(길성-흉성 항성 또는 그 반대) — 같은 사람 안에 양면적 결.

### `self.state.hidden-resource`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 잠재 자원 활용
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.jijanggan.`
- 점성 측: `astro.relation.mutualReception.` / `astro.state.planet.Moon.house.12` / `astro.state.planet.Sun.house.12`
**서술 (confirm)**
> 사주 지장간(지지 안의 숨은 천간)이 다양 + 점성 12궁 행성 또는 mutual reception — 표면에 안 드러난 자원을 활용 가능한 결.

### `self.state.rooted-vitality`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 통근 깊이 × accidental 강세
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.tonggeun.day.deep` / `saju.state.tonggeun.day.moderate`
- 점성 측: `astro.state.accidental.Mars.strong` / `astro.state.accidental.Mars.very_strong` / `astro.state.accidental.Sun.strong` / `astro.state.accidental.Sun.very_strong`
**서술 (confirm)**
> 사주 일주 통근이 깊고 점성 Sun 또는 1궁 행성이 accidental dignity 강 — 자기 표현이 외부 환경에 잘 받쳐지는 구조.

### `self.state.weak-rooting`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 통근 부족 × accidental 약세
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.tonggeun.day.none` / `saju.state.tonggeun.day.weak`
- 점성 측: `astro.state.accidental.Mars.weak` / `astro.state.accidental.Sun.very_weak` / `astro.state.accidental.Sun.weak`
**서술 (confirm)**
> 사주 일주 통근이 약하거나 없고 점성도 핵심 행성 accidental dignity 약 — 외부 발휘가 환경에 잘 받쳐지지 않는 결.

### `self.state.transform-active`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 오행 합화 — 본질의 변환
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.state.transform.`
- 점성 측: `astro.relation.mutualReception.`
**서술 (confirm)**
> 사주에 합화로 다른 오행이 형성됨과 점성 mutual reception이 함께 — 본질이 외부 결합으로 변환되는 구조.

**서술 (conflict / 양면)**

> 합화 신호와 본 오행 우세가 불일치 — 자기 본질과 변환된 결이 분리감을 만들 수 있음.

### `self.state.shinsal-cancelled`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 신살 무력화 — 충에 의한 약화
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.state.shinsal.cancelled.`
- 점성 측: `astro.state.accidental.` / `astro.state.dignity.`
**서술 (confirm)**
> 사주 신살이 충으로 무력화되고 점성도 같은 행성 accidental 약함 — 신살의 길흉이 풀리거나 완화됨.

**서술 (conflict / 양면)**

> 길성 신살이 충되어 약해지는 사주 + 점성 강함, 또는 그 반대 — 양쪽 시스템 신호가 맞물리지 않음.

### `family.state.maternal-influence`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 어머니 영향
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Moon.house.4` / `astro.state.planet.Moon.sign.Cancer`
**서술 (confirm)**
> 사주에 어머니 자리(인성)가 강하게 자리잡고 점성 Moon 4궁 또는 IC 강조 — 어머니 또는 어머니 같은 보호자의 영향이 인생에 깊이 박혀 있는 결.

### `love.state.spouse-presence`
- **레이어**: 정적 (state)
- **도메인**: love
- **의미**: 배우자 자리 표면화
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Venus.house.7` / `astro.state.stellium.house.7`
**서술 (confirm)**
> 사주 일지(배우자궁)에 배우자에 해당하는 십성(정재/편재 또는 정관/편관)이 자리잡고 점성도 7궁 활성 또는 Venus 강세 — 배우자/파트너 관계가 인생 핵심 무대.

### `health.state.balanced-elements`
- **레이어**: 정적 (state)
- **도메인**: health
- **의미**: 오행 균형
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.modeDominant.cardinal` / `astro.state.modeDominant.fixed` / `astro.state.modeDominant.mutable`
**서술 (confirm)**
> 사주 오행 분포가 비교적 고르고 점성 4원소도 한쪽에 쏠리지 않음 — 체질 기반의 균형이 잡힌 결로, 건강의 회복 탄력성이 좋음.

### `health.state.fire-water-imbalance`
- **레이어**: 정적 (state)
- **도메인**: health
- **의미**: 한열 불균형
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.elementAbsent.fire` / `saju.state.elementAbsent.water` / `saju.state.elementDominant.fire` / `saju.state.elementDominant.water`
- 점성 측: `astro.state.elementCount.fire` / `astro.state.elementCount.water`
**서술 (confirm)**
> 사주 화·수 분포가 한쪽으로 치우침과 점성 fire/water 사인 분포 불균형이 함께 — 한열·면역 균형 관리에 의식적 노력이 필요한 결.

### `health.state.weak-vitality`
- **레이어**: 정적 (state)
- **도메인**: health
- **의미**: 체력 자원 약
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.dayMaster.strength.weak`
- 점성 측: `astro.state.dignity.Mars.detriment` / `astro.state.dignity.Mars.fall`
**서술 (confirm)**
> 사주 일간이 약하고 비겁도 부족하며 점성도 Mars detriment/fall 또는 1궁 약 — 체력·즉발력 자원이 얕은 결. 회복·휴식 루틴이 평생 중요.

### `health.state.digestive-emphasis`
- **레이어**: 정적 (state)
- **도메인**: health
- **의미**: 소화·대사 영역
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Mercury.house.6` / `astro.state.planet.Sun.house.6` / `astro.state.stellium.house.6`
**서술 (confirm)**
> 사주 식상과 점성 6궁 emphasis가 함께 — 소화·대사·일상 루틴 영역이 건강의 키. 잘 관리하면 자산.

**서술 (conflict / 양면)**

> 식상 강한데 6궁 신호와 어긋남 — 활동량과 회복량이 매칭 안 되는 패턴이 있을 수 있음.

### `self.state.sect-benefic-strong`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: sect 길성 강세
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.lucky.`
- 점성 측: `astro.state.sectBenefic.greater.Jupiter` / `astro.state.sectBenefic.greater.Venus`
**서술 (confirm)**
> 점성 sect 길성(낮차트=목성, 밤차트=금성)이 dignity 강하고 사주 길성 신살이 함께 — 본인 sect 색의 길성 자원이 평생 자기 결.

### `self.state.sect-malefic-strong`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: sect 흉성 강세
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.unlucky.`
- 점성 측: `astro.state.sectMalefic.greater.Mars` / `astro.state.sectMalefic.greater.Saturn`
**서술 (confirm)**
> 점성 sect 흉성(낮차트=화성, 밤차트=토성)이 강하고 사주 흉성 신살이 함께 — sect 흉성 영역의 도전이 인생 패턴으로 들어옴.

### `money.state.fortune-lot`
- **레이어**: 정적 (state)
- **도메인**: money
- **의미**: Lot of Fortune × 재성 자리
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.lotOfFortune.house.11` / `astro.state.lotOfFortune.house.2` / `astro.state.lotOfFortune.house.8`
**서술 (confirm)**
> 점성 Lot of Fortune이 2궁/8궁/11궁 등 재물 라인에 들어와 있고 사주 재성 그룹도 강세 — 평생 재물 자리가 또렷하게 그려진 결.

### `career.state.classical-bugwi-ssang`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 부귀쌍전 (정관격+재성용신)
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Jupiter.house.10` / `astro.state.planet.Jupiter.house.2` / `astro.state.planet.Sun.house.10` / `astro.state.planet.Venus.house.2`
**서술 (confirm)**
> 사주 정관격 + 재성용신의 부귀쌍전 구조가 잡혔고 점성 MC 또는 2궁/10궁 강세가 함께 — 명예와 부가 양립 가능한 평생 결.

### `career.state.classical-gwanin`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 관인상생 (정관격+인성용신)
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Jupiter.house.9` / `astro.state.planet.Mercury.house.3` / `astro.state.planet.Mercury.house.9`
**서술 (confirm)**
> 사주 관인상생(정관격+인성용신) 학자형 구조 + 점성 9궁/3궁 또는 Jupiter 강조 — 학문과 명예가 자연스럽게 연결되는 평생 결.

### `money.state.classical-siksin-saengjae`
- **레이어**: 정적 (state)
- **도메인**: money
- **의미**: 식신생재 (식신격+재성용신)
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Jupiter.house.2` / `astro.state.planet.Venus.house.2` / `astro.state.planet.Venus.house.5`
**서술 (confirm)**
> 사주 식신생재 구조 + 점성 5궁/2궁 강조 — 표현·창작이 직접 재물로 연결되는 결.

### `career.state.classical-sarin`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 살인상생 (편관격+인성용신)
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Saturn.domicile` / `astro.state.dignity.Saturn.exaltation` / `astro.state.planet.Saturn.house.10`
**서술 (confirm)**
> 사주 살인상생(편관을 인성으로 화) 권력자 구조 + 점성 Saturn dignity 또는 10궁 — 큰 압박을 지혜로 다루는 권력 패턴.

### `career.state.classical-yangin-hapsal`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 양인합살 (양인격+칠살용신)
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mars.domicile` / `astro.state.dignity.Mars.exaltation` / `astro.state.planet.Mars.house.1` / `astro.state.planet.Mars.house.10`
**서술 (confirm)**
> 사주 양인합살 구조 + 점성 Mars dignity 또는 angular Mars — 무관·정치·결단력 직업의 평생 결.

### `self.state.gongmang-day`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 일주 공망
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Moon.house.12` / `astro.state.planet.Sun.house.12` / `astro.state.stellium.house.12`
**서술 (confirm)**
> 사주 일주가 공망에 든 위치 + 점성 12궁 행성 강조 — 자아 영역에 비어있음·내적 영역의 비중. 영성·내면 작업이 자기 결과 잘 맞음.

**서술 (conflict / 양면)**

> 공망은 비움인데 점성 12궁이 비활성 — 안과 밖이 다른 메시지. 의식적으로 내면 시간 마련 필요.

### `family.state.gongmang-spouse`
- **레이어**: 정적 (state)
- **도메인**: love
- **의미**: 배우자궁 공망
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.planet.Neptune.house.7`
**서술 (confirm)**
> 일지가 공망 위치 + 점성 7궁 비활성 또는 Neptune 7궁 — 관계 영역에 "잡히지 않는" 결. 늦게 만나거나 영적·이상적 결합 패턴.

**서술 (conflict / 양면)**

> 공망의 비움과 7궁 활성이 어긋남 — 외형적 관계는 활성인데 내적 안정감은 잡히지 않는 양면.

### `self.state.successful-pattern`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 성격(成格) × bonified key planet
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.seonggyeok`
- 점성 측: `astro.state.bonified.Mercury` / `astro.state.bonified.Moon` / `astro.state.bonified.Sun`
**서술 (confirm)**
> 사주 격국이 상신과 함께 성격(成格)으로 완성됨 + 점성도 핵심 행성이 길성에 의해 bonified — 평생 자기 길이 양 시스템 모두에서 또렷하게 받쳐주는 결.

### `self.state.broken-pattern`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 파격(破格) × maltreated key planet
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.pagyeok`
- 점성 측: `astro.state.maltreated.Mercury` / `astro.state.maltreated.Moon` / `astro.state.maltreated.Sun`
**서술 (confirm)**
> 사주 격국이 상신을 잃어 파격(破格)으로 흔들림 + 점성도 핵심 행성이 흉성에 의해 maltreated — 평생 자기 길에 구조적 누락이 박혀 있어 의식적 보강이 필요한 결.

### `self.state.sangsin-strong`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 상신 강세 — 격국 보좌 흐름
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.sangsin.`
- 점성 측: `astro.state.dignity.Jupiter.domicile` / `astro.state.dignity.Venus.domicile` / `astro.state.sectBenefic.greater.Jupiter` / `astro.state.sectBenefic.greater.Venus`
**서술 (confirm)**
> 사주 격국의 상신(보좌하는 십성 그룹)이 살아있고 점성 길성(sect 길성 또는 dignified Jupiter/Venus)도 강세 — 평생 격국이 흐름을 받아 자기 길을 자연스럽게 펼치는 결.

### `self.state.planetary-joy`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: Planetary Joy × 길성 신살
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.lucky.`
- 점성 측: `astro.state.planetaryJoy.`
**서술 (confirm)**
> 점성 행성이 자기 기쁨의 자리(joy)에 있고 사주 길성 신살이 함께 — 평생 본인 결이 자연스럽게 받쳐지는 자리. 행운·보호의 자원이 박혀 있는 결.

### `career.state.spirit-lot-vocation`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: Lot of Spirit × 격국 — 직업 소명
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.lotOfSpirit.house.1` / `astro.state.lotOfSpirit.house.10` / `astro.state.lotOfSpirit.house.3` / `astro.state.lotOfSpirit.house.9`
**서술 (confirm)**
> 점성 Lot of Spirit이 직업·소명 라인(10/9/3궁 등)에 들어와 있고 사주 격국도 또렷하게 잡힘 — 평생 직업·소명이 양 시스템에서 같은 방향을 가리키는 결.

### `self.state.classical-jongwang`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 종왕격 — 비겁이 가득한 일관된 자아
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mars.domicile` / `astro.state.dignity.Mars.exaltation` / `astro.state.stellium.house.1`
**서술 (confirm)**
> 사주 종왕격(從旺格): 일간 비겁이 사주 전체를 이끌고 관성 천간 부재, 인성 1-2개 보조 + 점성 1궁 stellium 또는 Mars 강세 — 외부 흐름 거스르고 비겁·인성 길로 가야 형통하는 특수 결.

### `family.state.classical-jonggang`
- **레이어**: 정적 (state)
- **도메인**: family
- **의미**: 종강격 — 인성이 가득한 학자형 결
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Jupiter.domicile` / `astro.state.dignity.Jupiter.exaltation` / `astro.state.stellium.house.9`
**서술 (confirm)**
> 사주 종강격(從强格): 인성이 사주 전체를 받침 + 점성 9궁 stellium 또는 Jupiter 강세 — 학습·권위·정통 경로로 형통하는 특수 결.

### `career.state.classical-jongah`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 종아격 — 식상이 가득한 표현·창조형
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mercury.domicile` / `astro.state.dignity.Venus.domicile` / `astro.state.stellium.house.5`
**서술 (confirm)**
> 사주 종아격(從兒格): 식상이 사주 전체를 채움 + 점성 5궁 강조 또는 Mercury·Venus 강세 — 창작·표현·자녀 영역이 평생 핵심 무대인 특수 결.

### `money.state.classical-jongjae`
- **레이어**: 정적 (state)
- **도메인**: money
- **의미**: 종재격 — 재성이 가득한 부유형
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Jupiter.domicile` / `astro.state.dignity.Venus.domicile` / `astro.state.stellium.house.2` / `astro.state.stellium.house.8`
**서술 (confirm)**
> 사주 종재격(從財格): 재성이 사주 전체를 차지 + 점성 2궁/8궁 stellium 또는 Venus·Jupiter 강세 — 평생 재물·자산이 인생 중심인 특수 결. 재성 운에 형통.

### `career.state.classical-jongsal`
- **레이어**: 정적 (state)
- **도메인**: career
- **의미**: 종살격 — 칠살이 가득한 권력형
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.dignity.Mars.domicile` / `astro.state.dignity.Saturn.domicile` / `astro.state.stellium.house.10`
**서술 (confirm)**
> 사주 종살격(從殺格): 편관·정관이 사주 전체를 차지 + 점성 10궁 stellium 또는 Saturn·Mars 강세 — 권력·관직·강한 책임 영역의 특수 결. 관성 운에 형통.

### `self.state.classical-hwagi`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: 화기격국 — 합화로 변환된 본질
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.mutualReception.` / `astro.state.stellium.sign.`
**서술 (confirm)**
> 사주 화기격국(갑기화토·을경화금·병신화수·정임화목·무계화화 중 하나): 일간이 합화로 변환된 특수 결 + 점성 mutual reception 또는 강한 stellium — 본 일간을 떠나 합화 오행을 따라가는 특수 인생.

**서술 (conflict / 양면)**

> 합화 신호는 강한데 본 일간 강도도 살아있음 — 화기격이 완전치 않은 양면. 합화 따를지 본 일간 따를지 인생에서 분기.

### `self.state.bonif-enclosure-malefic`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: Enclosure (besieged) by malefics × 사주 흉성 신살
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.shinsal.unlucky.`
- 점성 측: `astro.state.bonif.enclosure.malefic.Mercury` / `astro.state.bonif.enclosure.malefic.Moon` / `astro.state.bonif.enclosure.malefic.Sun`
**서술 (confirm)**
> 점성 핵심 행성(태양·달 등)이 양쪽에서 흉성에 둘러싸여 enclosure(besiegement) — 사주 흉성 신살과 함께 — 평생 자아 표현이 두 종류의 압박 사이에 끼이는 구조적 결.

### `self.state.bonif-reception`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: Reception (mutual dignity mitigation) × 격국 성격
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.state.seonggyeok`
- 점성 측: `astro.state.bonif.reception.`
**서술 (confirm)**
> 점성 핵심 행성이 자기 sign의 ruler·exalt로 reception 받는 구조 + 사주 격국이 성격(成格) — 인생의 핵심 자원이 양 시스템에서 받쳐지는 안정 구조.

### `self.state.bonif-overcoming-malefic`
- **레이어**: 정적 (state)
- **도메인**: self
- **의미**: Overcoming by malefic × 사주 충/형
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.state.bonif.overcoming.malefic.Moon` / `astro.state.bonif.overcoming.malefic.Sun`
**서술 (confirm)**
> 점성 핵심 행성이 흉성에 의해 superior square로 overcome되는 sign-based 압박 + 사주 천간충 또는 일지 형 — 외부에서 들어오는 권위·책임의 구조적 압박이 양 시스템에서 동시에 박혀 있는 결.

---

## 관계 (RELATION) 레이어

### `love.relation.partner-conflict`
- **레이어**: 관계 (relation)
- **도메인**: love
- **의미**: 배우자궁 흔들림
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.hard.Mars.Venus` / `astro.relation.hard.Venus.`
**서술 (confirm)**
> 사주 일지의 충/형과 점성 Venus의 hard aspect가 함께 — 관계 안에 구조적 마찰점이 박혀 있음.

### `family.relation.root-tension`
- **레이어**: 관계 (relation)
- **도메인**: family
- **의미**: 가정·뿌리 긴장
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.hard.Moon.`
**서술 (confirm)**
> 사주 월지의 충/형과 점성 Moon의 hard aspect가 함께 — 원가족·정서 기반에 구조적 긴장이 잠복.

### `self.relation.identity-clash`
- **레이어**: 관계 (relation)
- **도메인**: self
- **의미**: 자아 충돌 구조
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.hard.Sun.`
**서술 (confirm)**
> 사주 천간충과 점성 Sun의 hard aspect가 함께 — 정체성 안에 두 힘이 부딪치는 내적 구조.

### `career.relation.authority-friction`
- **레이어**: 관계 (relation)
- **도메인**: career
- **의미**: 권위·책임 마찰
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.hard.Saturn.`
**서술 (confirm)**
> 사주 관성 위치의 형충과 점성 Saturn의 hard aspect가 함께 — 권위·시스템과의 갈등이 구조적으로 박혀 있음.

### `self.relation.harmony`
- **레이어**: 관계 (relation)
- **도메인**: self
- **의미**: 내적 통합
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.soft.Sun.`
**서술 (confirm)**
> 사주의 육합·삼합과 점성 태양의 부드러운 aspect가 함께 — 자기 일치성이 높고 내적 갈등이 적은 구조.

### `love.relation.bond-formation`
- **레이어**: 관계 (relation)
- **도메인**: love
- **의미**: 관계 결합 흐름
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.soft.Venus.`
**서술 (confirm)**
> 사주 천간합·일지 합과 점성 Venus의 부드러운 aspect 또는 Venus-Moon 합이 함께 — 관계 결합·유대 형성이 자연스러운 구조.

### `family.relation.flow`
- **레이어**: 관계 (relation)
- **도메인**: family
- **의미**: 가정 자원 흐름
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.soft.Moon.`
**서술 (confirm)**
> 사주 지지삼합과 점성 Moon의 부드러운 aspect가 함께 — 정서·가정 자원이 잘 순환하는 구조.

### `money.relation.gain-flow`
- **레이어**: 관계 (relation)
- **도메인**: money
- **의미**: 재물 자원 흐름
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.soft.Jupiter.` / `astro.relation.soft.Venus.`
**서술 (confirm)**
> 사주 천간합·지지합과 점성 Jupiter 또는 Venus의 trine/sextile이 함께 — 재물·자원의 자연스런 유입 구조.

### `self.relation.three-way-pressure`
- **레이어**: 관계 (relation)
- **도메인**: self
- **의미**: 3자 압박 구조
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.hard.`
**서술 (confirm)**
> 사주 지지형(인사신/축술미/자묘)과 점성 T-square 패턴이 함께 — 3자 갈등이 인생 구조에 박혀 있어 자아 표현에 압박.

### `self.relation.minor-friction`
- **레이어**: 관계 (relation)
- **도메인**: self
- **의미**: 미세 균열·어긋남
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.aspect.`
**서술 (confirm)**
> 사주 파/해/원진과 점성 quincunx/semi-square 패턴이 함께 — 큰 충돌은 아니나 지속적 어긋남이 잠재.

### `self.relation.mutual-support`
- **레이어**: 관계 (relation)
- **도메인**: self
- **의미**: 상호 지지 구조
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.relation.mutualReception.`
**서술 (confirm)**
> 점성 mutual reception(서로의 도미사일에 위치)과 사주 천간합·삼합이 함께 — 인생 영역들이 서로를 보강하는 구조.

---

## 시점 (TIMING) 레이어

### 스케일: 10년 (대운)

### `money.timing.decade.expansion`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: money
- **의미**: 10년 재물 확장 국면
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Jupiter.house.2` / `astro.timing.transit.Jupiter.house.8`
**서술 (confirm)**
> 대운 재성과 외행성(목성·토성)의 재물 하우스 통과가 함께 — 10년 단위로 재물 기반이 확장되는 국면.

### `career.timing.decade.responsibility`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: career
- **의미**: 책임 강화 10년
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Saturn.house.10` / `astro.timing.transit.Saturn.house.6`
**서술 (confirm)**
> 대운 관성과 토성의 직업 하우스 통과가 함께 — 책임·구조화 압박이 10년 흐름의 중심 테마.

### `family.timing.decade.learning`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: family
- **의미**: 확장·학습 10년
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Jupiter.house.4` / `astro.timing.transit.Jupiter.house.9`
**서술 (confirm)**
> 대운 인성과 목성의 9궁/4궁 통과가 함께 — 학습·이주·뿌리 재정의의 10년 흐름.

### `self.timing.decade.expression`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: career
- **의미**: 표현·창조 10년
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mercury.house.5` / `astro.timing.transit.Venus.house.5`
**서술 (confirm)**
> 대운 식상과 Mercury/Venus의 표현 하우스 통과가 함께 — 창작·발신·콘텐츠가 핵심 동력.

### `self.timing.decade.self-emphasis`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: self
- **의미**: 자아 강화 10년
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.house.1`
**서술 (confirm)**
> 대운 비겁과 Mars의 1궁 통과가 함께 — 자아·독립·주도성이 10년의 키워드.

### `career.timing.decade-flow`
- **레이어**: 시점 (timing)  ·  **스케일**: 10년 (대운)
- **도메인**: career
- **의미**: 대운 흐름 — 다음 단계 준비
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Jupiter.` / `astro.timing.transit.Saturn.`
**서술 (confirm)**
> 사주 다음 대운에 관성/재성/식상 등 활동 십성이 들어옴 + 점성 Jupiter/Saturn 외행성 transition — 다음 10년 준비기.

### 스케일: 1년 (세운/SR)

### `money.timing.year.stable-income`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: money
- **의미**: 올해 안정 수입
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Jupiter.house.` / `astro.timing.solarReturn.Venus.house.2`
**서술 (confirm)**
> 세운 정재와 Solar Return의 2궁/Jupiter 강조가 함께 — 안정적 수입 흐름이 올해 강조됨.

### `money.timing.year.variable-income`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: money
- **의미**: 올해 변동 재물
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Jupiter.house.8` / `astro.timing.transit.Jupiter.house.8`
**서술 (confirm)**
> 세운 편재와 Solar Return 8궁 강조 또는 Jupiter 8궁 통과가 함께 — 큰 변동·기회와 동시에 리스크가 강조되는 한 해.

**서술 (conflict / 양면)**

> 편재 신호와 보수 신호가 혼재 — 적극적 확장 vs 자산 보호의 양면적 결정 시기.

### `career.timing.year.stability`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: career
- **의미**: 올해 직업 안정
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Jupiter.house.10` / `astro.timing.solarReturn.Saturn.house.10`
**서술 (confirm)**
> 세운 정관과 Solar Return 10궁의 benefic 배치가 함께 — 직장·역할 안정과 평판 강화의 해.

### `self.timing.year.pressure`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 올해 자아 압박
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Pluto.` / `astro.timing.transit.Saturn.`
**서술 (confirm)**
> 세운 편관과 토성/명왕성의 hard 트랜짓이 함께 — 자아·정체성에 시험·책임 압력이 가중되는 한 해.

### `family.timing.year.learning-protection`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: family
- **의미**: 올해 보호·학습
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Jupiter.house.9` / `astro.timing.solarReturn.Moon.house.4`
**서술 (confirm)**
> 세운 정인과 Solar Return 9궁/4궁 강조가 함께 — 학습·정서적 보호·가정 회복의 해.

### `family.timing.year.unconventional-learning`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: family
- **의미**: 올해 비정형 학습
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Neptune.` / `astro.timing.transit.Uranus.`
**서술 (confirm)**
> 세운 편인과 Neptune·Uranus의 트랜짓이 함께 — 정통과 다른 방식의 학습·영적 통찰이 들어오는 해.

**서술 (conflict / 양면)**

> 학습 신호가 양쪽에서 다르게 잡힘 — 정통 학습 vs 직관적 깨달음의 양면.

### `career.timing.year.pleasant-expression`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: career
- **의미**: 올해 즐거운 표현
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Sun.house.5` / `astro.timing.solarReturn.Venus.house.5`
**서술 (confirm)**
> 세운 식신과 Solar Return 5궁/Venus 강조가 함께 — 표현·창작·즐거움이 자연스러운 해.

### `career.timing.year.challenging-expression`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: career
- **의미**: 올해 도전적 표현
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.` / `astro.timing.transit.Mercury.`
**서술 (confirm)**
> 세운 상관과 Mercury/Mars의 hard 트랜짓이 함께 — 발언·창작이 강한 한 해이나 마찰·논쟁 가능성도 큼.

**서술 (conflict / 양면)**

> 표현 욕구와 외부 수용성이 어긋남 — 발신 시점과 톤 조절이 핵심.

### `self.timing.year.assertion`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 올해 자기 주장
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.house.1`
**서술 (confirm)**
> 세운 비견과 Mars의 1궁 트랜짓이 함께 — 독립·주도·자기 영역 강화의 해.

### `self.timing.year.competition`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 올해 경쟁·충돌
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.`
**서술 (confirm)**
> 세운 겁재와 Mars의 hard 트랜짓이 함께 — 경쟁자·동료 마찰이 두드러지는 해. 협력 구조 점검 필요.

### `love.timing.year.relationship-shift`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: love
- **의미**: 올해 관계 변동
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Venus.house.5` / `astro.timing.solarReturn.Venus.house.7`
**서술 (confirm)**
> 세운 재성과 Solar Return 7궁/Venus 활성이 같이 — 관계 시작·정리·재정의의 해.

**서술 (conflict / 양면)**

> 관계 신호가 양쪽에서 다르게 잡힘 — 외형적 안정과 내면적 변화가 어긋나는 양면적 한 해.

### `self.timing.year.profection-active`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 연 활성 하우스
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.seun.`
- 점성 측: `astro.timing.profection.house.`
**서술 (confirm)**
> Annual profection으로 활성화된 하우스 영역과 사주 세운의 같은 도메인 시그널이 겹침 — 그 영역이 올해 핵심 무대.

### `self.timing.year.progression-vs-seun`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 점성 progression × 세운
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.seun.`
- 점성 측: `astro.timing.progression.`
**서술 (confirm)**
> 점성 secondary progression의 natal aspect 활성과 사주 세운 십성이 함께 — 인생의 점진적 변화 흐름이 올해 표면화.

**서술 (conflict / 양면)**

> 진행 별과 운의 방향이 어긋남 — 내적 진화와 외적 사건이 다른 속도로 가는 시기.

### `health.timing.year.stress-load`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: health
- **의미**: 올해 스트레스 부하
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.` / `astro.timing.transit.Pluto.` / `astro.timing.transit.Saturn.`
**서술 (confirm)**
> 세운 편관 또는 일간 충 + 점성 Saturn/Mars hard 트랜짓이 함께 — 신체 부담이 누적되기 쉬운 한 해. 수면·식이 우선.

### `health.timing.year.recovery-window`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: health
- **의미**: 올해 회복기
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.solarReturn.Jupiter.house.6` / `astro.timing.solarReturn.Moon.house.4` / `astro.timing.solarReturn.Moon.house.6`
**서술 (confirm)**
> 세운 인성과 Solar Return의 Jupiter/Moon benefic 위치가 함께 — 회복·치유·휴식의 흐름이 자연스러운 해.

### `self.timing.year.profection-lord`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: 연 통치자 활성
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.seun.sibsin.`
- 점성 측: `astro.timing.profectionLord.`
**서술 (confirm)**
> 점성 annual profection ruler가 어느 하우스에 있는지에 따라 그 영역이 올해 핵심. 사주 세운에서도 같은 영역의 십성이 활성화되어 있음.

### `career.timing.year.zr-peak`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: career
- **의미**: ZR Peak Period — 인생 정점기
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.zr.peak`
**서술 (confirm)**
> 점성 Zodiacal Releasing이 시작 사인에 angular한 시기(peak period)에 진입. 사주도 활동 십성(관성·재성·식상)이 운에 발화 — 인생 chapter가 정점에 가까운 시기로, 외부 활동·성취 가능성이 한껏 열림.

### `self.timing.year.zr-ruler-active`
- **레이어**: 시점 (timing)  ·  **스케일**: 1년 (세운/SR)
- **도메인**: self
- **의미**: ZR L1 ruler × 세운 동조
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.seun.sibsin.`
- 점성 측: `astro.timing.zr.l1.ruler.`
**서술 (confirm)**
> 점성 Zodiacal Releasing 현재 chapter의 통치 행성과 사주 세운 십성이 같은 영역을 가리킴 — 인생 chapter의 핵심 테마가 올해 그대로 활성. 그 영역에서의 결정이 인생 맥락과 일치.

### 스케일: 1달 (월운/LR)

### `self.timing.month.tension`
- **레이어**: 시점 (timing)  ·  **스케일**: 1달 (월운/LR)
- **도메인**: self
- **의미**: 이번 달 자아 긴장
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.lunarReturn.Mars.house.1` / `astro.timing.lunarReturn.Mars.house.10`
**서술 (confirm)**
> 월운 편관과 Lunar Return의 1궁/10궁 Mars 강조가 함께 — 한 달 단위로 압박감이 누적.

### `money.timing.month.flow`
- **레이어**: 시점 (timing)  ·  **스케일**: 1달 (월운/LR)
- **도메인**: money
- **의미**: 이번 달 재물 흐름
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.lunarReturn.Jupiter.house.2` / `astro.timing.lunarReturn.Venus.house.2`
**서술 (confirm)**
> 월운 재성과 Lunar Return의 2궁/Venus 강조가 함께 — 단기 수입·결제 사이클에 유리.

### `career.timing.month.expression`
- **레이어**: 시점 (timing)  ·  **스케일**: 1달 (월운/LR)
- **도메인**: career
- **의미**: 이번 달 발신·발표
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.lunarReturn.Mercury.`
**서술 (confirm)**
> 월운 식상과 Lunar Return Mercury 활성이 함께 — 한 달간 발신·콘텐츠·미팅에 유리.

### `self.timing.month.zr-l2-active`
- **레이어**: 시점 (timing)  ·  **스케일**: 1달 (월운/LR)
- **도메인**: self
- **의미**: ZR L2 sub-ruler × 월운 동조
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.wolun.sibsin.`
- 점성 측: `astro.timing.zr.l2.ruler.`
**서술 (confirm)**
> 점성 ZR L2 월 단위 sub-chapter ruler와 사주 월운 십성이 같은 영역 — 이번 달의 작은 chapter가 명확하게 한 방향으로 정렬되는 시기.

### `self.timing.month.zr-l2-peak`
- **레이어**: 시점 (timing)  ·  **스케일**: 1달 (월운/LR)
- **도메인**: self
- **의미**: ZR L2 peak month
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.zr.l2.peak`
**서술 (confirm)**
> 점성 ZR L2 sub-period가 L1 sign에 angular한 시기(L2 peak) + 사주 월운 활동 십성 — 이번 달이 인생 chapter 안에서 작은 정점기.

### 스케일: 1일 (일진/transit)

### `money.timing.day.friction`
- **레이어**: 시점 (timing)  ·  **스케일**: 1일 (일진/transit)
- **도메인**: money
- **의미**: 오늘 재정 마찰
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: _(predicate가 컨텍스트 조회. 예: ctx.hasSaju)_
- 점성 측: `astro.timing.transit.Mars.square.natal.Venus` / `astro.timing.transit.Saturn.opposition.natal.Venus`
**서술 (confirm)**
> 일진과 일일 트랜짓이 함께 재정 영역을 건드림 — 오늘은 큰 결제·계약을 미루는 게 안전.

### `self.timing.day.iljin-active`
- **레이어**: 시점 (timing)  ·  **스케일**: 1일 (일진/transit)
- **도메인**: self
- **의미**: 오늘 일진 활성
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.iljin.`
- 점성 측: `astro.timing.transit.`
**서술 (confirm)**
> 오늘 일진 시그널과 일일 transit이 같은 영역을 가리킴 — 컨디션·기분이 외부 흐름과 맞물리는 날.

**서술 (conflict / 양면)**

> 일진과 transit이 다른 영역을 가리킴 — 컨디션과 외부 일정이 어긋날 가능성, 페이스 조절 필요.

### 스케일: 이벤트 (활성화)

### `self.timing.event.dormant-activated`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: self
- **의미**: 잠복 약점 활성화
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.event.day.`
- 점성 측: `astro.timing.event.activate.`
**서술 (confirm)**
> 평소 잠잠하던 원국·natal의 약한 자리가 양 시스템에서 동시에 발화 — 표면화되는 시기. 회피 말고 직면 권장.

### `love.timing.event.spouse-activation`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: love
- **의미**: 배우자궁 활성화
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.event.day.`
- 점성 측: `astro.timing.event.activate.Venus`
**서술 (confirm)**
> 운이 일지(배우자궁)와 합/충 발동, 동시에 transit이 natal Venus 활성 — 관계의 큰 사건이 표면화.

**서술 (conflict / 양면)**

> 배우자궁 활성이 합과 충 양쪽으로 잡힘 — 정리와 결합 신호가 같이 들어오는 분기점.

### `career.timing.event.career-activation`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: career
- **의미**: 직업 결착 활성화
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.event.`
- 점성 측: `astro.timing.event.activate.Saturn`
**서술 (confirm)**
> 운이 원국 관성과 합/충 발동, 동시에 transit이 natal Saturn/MC 활성 — 직업·역할 변동의 결정적 시점.

**서술 (conflict / 양면)**

> 안정 신호와 변동 신호가 혼재 — 머무를지 옮길지 분기되는 시점.

### `self.timing.daeun-transition`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: self
- **의미**: 대운 전환 임박
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.daeun.transition.imminent`
- 점성 측: `astro.timing.transit.Neptune.` / `astro.timing.transit.Pluto.` / `astro.timing.transit.Saturn.` / `astro.timing.transit.Uranus.`
**서술 (confirm)**
> 사주 대운 전환기 + 점성 outer planet의 큰 angle 변화 — 인생의 큰 국면이 바뀌는 자리. 새 흐름에 맞춰 재정렬 시기.

**서술 (conflict / 양면)**

> 대운은 바뀌는데 점성 흐름은 안정적이거나 그 반대 — 내·외 변화 속도가 다른 시기.

### `health.timing.event.chronic-trigger`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: health
- **의미**: 만성 패턴 활성화
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.event.day.`
- 점성 측: `astro.timing.event.activate.` / `astro.timing.transit.Neptune.` / `astro.timing.transit.Saturn.`
**서술 (confirm)**
> 운이 일주를 발화시키고 점성도 Neptune/Saturn이 natal 약점 자리를 자극 — 평소 잠복하던 만성 패턴이 표면화될 수 있음. 미루던 검진/관리 점검 시기.

### `self.timing.event.seong-jung-yu-pae`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: self
- **의미**: 성중유패 — 성격이 운에서 흔들림
- **폴라리티 힌트**: 부정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.seongJungYuPae.strike`
- 점성 측: `astro.timing.transit.Neptune.` / `astro.timing.transit.Pluto.` / `astro.timing.transit.Saturn.`
**서술 (confirm)**
> 사주 성격(成格)이었던 사람의 상신이 운에서 극받아 약화됨 + 점성 outer planet이 natal benefic을 hard로 자극 — 본래 잘 짜인 인생 구조가 일시적으로 흔들리는 시기. 본 격국이 살아있어 회복 가능.

### `self.timing.event.gueung-rescue`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: self
- **의미**: 구응(救應) — 패격이 운에서 회복
- **폴라리티 힌트**: 긍정 (양쪽 동의 → confirm)
**발화 조건**
- 사주 측: `saju.timing.gueung.rescue`
- 점성 측: `astro.state.sectBenefic.greater.Jupiter` / `astro.state.sectBenefic.greater.Venus`
**서술 (confirm)**
> 사주 패격(破格)에 부재한 상신이 운에서 들어와 격국이 회복(救應/패중유성). 점성도 sect 길성이 활성 — 평소 비어 있던 인생 구조가 이 시기에 일시적으로 채워짐. 진로 결단·시작 적기.

### `self.timing.event.zr-loosing`
- **레이어**: 시점 (timing)  ·  **스케일**: 이벤트 (활성화)
- **도메인**: self
- **의미**: Loosing of the Bond — 큰 인생 전환
- **폴라리티 힌트**: 양면 (양쪽 동의 → conflict)
**발화 조건**
- 사주 측: `saju.timing.daeun.transition.imminent`
- 점성 측: `astro.timing.zr.loosingOfTheBond`
**서술 (confirm)**
> 점성 Zodiacal Releasing이 시작 사인 반대편(7번째)에 진입 — Hellenistic 전통의 가장 큰 인생 전환 표지. 사주 대운 전환 임박과 겹치면 진정한 chapter 변경기.

**서술 (conflict / 양면)**

> ZR loosing 신호와 사주 대운 흐름이 어긋남 — 점성은 큰 전환을 가리키는데 사주는 안정 — 외적 환경 변화에 내부 본질이 따라가지 못할 수 있음.

---

## 메타룰 (Cross-domain themes)

각 메타룰은 도메인별 집계가 끝난 뒤 `detect()` 조건을 평가하여 발화합니다. 정상 룰과 달리 **신호 → 룰 → 도메인 집계 → 메타룰** 순으로 두 단계 위에서 작동합니다.

### `theme.relational-financial-strain`

- **의미**: 관계×재물 동시 압박

**서술**

> 사랑·재물 두 영역에서 동시에 강한 부정 신호가 모임 — 분리·분할·재산 분쟁의 잠재 시기. 큰 결정은 보류 권장.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>has(d,"love",strongNegative)&&has(d,"money",strongNegative)
```

### `theme.career-health-tradeoff`

- **의미**: 성취×건강 트레이드오프

**서술**

> 직업·성취 영역의 강한 활성과 건강 영역의 위축이 겹침 — 성과의 대가로 신체·수면이 깎이는 시기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>has(d,"career",strongPositive)&&has(d,"health",strongNegative)
```

### `theme.identity-shift`

- **의미**: 자아 재정의 국면

**서술**

> 자아·관계가 동시에 강하게 흔들림 — 정체성의 외피와 거울이 같이 변하는 전환기. 새 자기 정의의 호기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>strongMixed(d.self)&&strongMixed(d.love)
```

### `theme.expansion-window`

- **의미**: 확장의 창

**서술**

> 재물·직업·자아가 모두 양호하고 강한 confirm이 다수 — 외부 활동·확장·계약에 유리한 드문 시기. 실행 우선.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>has(d,"money",strongPositive)&&has(d,"career",strongPositive)&&(d.self.tone==="positive"||d.self.tone==="neutral")
```

### `theme.family-roots-call`

- **의미**: 뿌리로의 회귀

**서술**

> 가정·자아 영역에 강한 신호가 동시 — 원가족·고향·뿌리 관련 사건/감정이 표면화되는 시기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>anyStrongConfirm(d.family)&&(anyStrongConfirm(d.self)||strongMixed(d.self))
```

### `theme.solo-ascent`

- **의미**: 독립 상승

**서술**

> 자아·직업 양호 + 관계 영역은 잠잠 — 혼자 추진하는 일·독립 프로젝트에 유리한 시기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>strongPositive(d.self)&&strongPositive(d.career)&&d.love.tone==="neutral"
```

### `theme.foundation-rebuild`

- **의미**: 기반 재구축

**서술**

> 가정·재물 영역에 강한 부정 신호 동시 — 살림·기반 재정비의 시기. 외부 확장보다 내부 정리가 효과적.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>has(d,"family",strongNegative)&&has(d,"money",strongNegative)
```

### `theme.creative-flow`

- **의미**: 창조 흐름

**서술**

> 직업·자아·사랑 영역에 부드러운 신호가 함께 — 창작·표현·관계 통합이 자연스럽게 흐르는 호기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>strongPositive(d.career)&&d.self.tone!=="negative"&&d.love.tone!=="negative"&&d.career.confirms.some(m=>m.rule.meaning.includes("\uD45C\uD604")||m.rule.meaning.includes("\uCC3D\uC870"))
```

### `theme.duty-overload`

- **의미**: 책임 과부하

**서술**

> 직업·자아 모두 강한 부정 신호 — 책임은 늘고 자원은 감소. 위임·우선순위 정리 권장.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>has(d,"career",strongNegative)&&has(d,"self",strongNegative)
```

### `theme.harvest-season`

- **의미**: 수확기

**서술**

> 재물·가정·자아 모두 강한 안정 신호 — 그동안의 노력이 결실로 돌아오는 안정기. 확산보다 누림이 적기.

**검출 로직**: 도메인별 집계 결과(`Record<Domain, DomainAggregate>`)에서 다음 조건이 참일 때 발화

```ts
d=>strongPositive(d.money)&&strongPositive(d.family)&&strongPositive(d.self)
```

---

## 엔진 동작 명세

1. **Normalizer**가 사주·점성 엔진 결과를 `Signal[]`로 환원. 키는 `<system>.<layer>.<sub>` 네임스페이스.
2. **Engine**이 모든 룰을 한 번씩 평가. timing 룰은 같은 `scale`의 시그널만 본다 (다른 스케일은 매칭 풀에서 제외).
3. 각 룰은 양쪽 시스템에서 `Hit`(fired/strength)를 받음.
4. **Polarity 결정**:
    - 양쪽 `fired` & 힌트 ≠ mixed: **confirm**
    - 양쪽 `fired` & 힌트 = mixed (또는 context의 polarity 불일치): **conflict**
    - 한쪽만 `fired`: **silent**
5. **Intensity** = `min(saju.strength, astro.strength) × layerPrior` 후 등급화 (≥0.7 strong, ≥0.4 moderate, else weak). state 레이어는 prior 0.7, relation/timing은 1.0.
6. **Aggregator**가 도메인별로 confirm/conflict/silent 분류 + tone 라벨 부여.
7. **MetaRule**이 도메인 집계를 보고 cross-domain 테마를 추가.

이 흐름은 `tests/fortune-cross-rules.test.ts`의 16개 단위 테스트로 검증됩니다.
