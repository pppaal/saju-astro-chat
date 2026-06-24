'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LangKey } from '../chat-i18n'
import type { DestinySources } from '../chat-types'
import styles from './DataSourceToggles.module.css'

interface DataSourceTogglesProps {
  sources: DestinySources
  onChange: (next: DestinySources) => void
  lang: LangKey
  disabled?: boolean
  /** 주변 배경 톤. 'light'(상담사 흰 배경) / 'dark'(메인 코스믹 배경). 기본 light. */
  theme?: 'light' | 'dark'
  /** 체크박스 옆 "사주·점성이란?" 안내 버튼을 띄울지. 메인에서만 켠다. 기본 false. */
  showInfo?: boolean
  /** 체크박스 위에 "이 상담에 넣을 자료" 보이는 라벨을 띄울지. 처음 보는
   *  사용자에게 용도를 바로 알려준다. 기본 false(기존 UI 영향 없음). */
  showGroupLabel?: boolean
  /** 안내 팝업 문구 결. 'self'(개인 사주·점성, 운명상담사) / 'synastry'(두 사람
   *  궁합, 궁합상담사). 같은 체크박스라도 설명이 달라야 해서 분기. 기본 'self'. */
  variant?: 'self' | 'synastry'
}

// 체크박스 글자 자체를 설명형으로 — 별도 안내 라벨 줄 없이 칩만 봐도 "이 걸로
// 본다"는 용도가 읽히게. (group 은 aria-label 및 showGroupLabel 옵션용으로 유지.)
const LABELS: Record<LangKey, { saju: string; astro: string; group: string }> = {
  ko: {
    saju: '사주로 보기',
    astro: '점성으로 보기',
    group: '이 상담에 쓸 자료를 골라요 (둘 다 추천)',
  },
  en: {
    saju: 'Read with Saju',
    astro: 'Read with Astrology',
    group: 'Choose the data for this reading (both recommended)',
  },
}

// "사주·점성이란?" 팝업 카드 본문 — 사주가 뭔지, 점성이 뭔지, 둘을 함께 보면
// 무엇이 좋은지 자세히. 각 섹션은 소개 문단(body) + 핵심 항목(points)으로
// 구성해 쭉 읽기와 훑어보기를 모두 지원한다. ko/en 같이 둬서 드리프트 방지.
type InfoSection = {
  title: string
  tagline: string
  body: string
  pointsTitle: string
  points: string[]
}
const INFO: Record<
  LangKey,
  {
    trigger: string
    title: string
    intro: string
    close: string
    saju: InfoSection
    astro: InfoSection
    both: InfoSection
    tip: string
  }
> = {
  ko: {
    trigger: '사주·점성이란?',
    title: '사주와 점성, 무엇이 다를까요?',
    intro:
      '두 가지는 사람을 읽는 서로 다른 "언어"예요. 무엇이 다르고, 왜 함께 보면 좋은지 짧게 정리했어요.',
    close: '닫기',
    saju: {
      title: '사주 (四柱·동양 명리)',
      tagline: '타고난 기질과 운의 큰 흐름',
      body: '태어난 연·월·일·시 네 기둥(四柱)에 담긴 음양오행의 균형으로, 타고난 성향과 강점·약점, 그리고 인생 시기마다 바뀌는 운의 큰 흐름을 읽습니다. "나는 어떤 사람이고, 언제 흐름이 바뀌는가"라는 질문에 특히 강합니다.',
      pointsTitle: '이런 걸 봐요',
      points: [
        '타고난 성격·기질과 잘 맞는 일·관계의 방향',
        '재물·직업·건강 등 분야별 타고난 강점과 주의점',
        '10년 단위 대운(大運)과 그해의 세운(歲運) — 큰 시기의 흐름',
        '언제 변화·도전·휴식을 택하면 좋은지 타이밍',
      ],
    },
    astro: {
      title: '점성술 (서양 점성)',
      tagline: '마음의 결과 지금의 시기',
      body: '태어난 순간 하늘에 떠 있던 해·달·행성의 위치와 각도로, 마음의 결과 욕구·관계의 역학, 그리고 지금 당신을 지나가는 시기(트랜짓)를 읽습니다. 내면의 동기와 감정의 흐름을 섬세하게 비추는 데 강합니다.',
      pointsTitle: '이런 걸 봐요',
      points: [
        '태양·달·상승점으로 보는 핵심 성향과 내면의 동기',
        '연애·관계에서 끌리는 방식과 부딪히는 지점',
        '지금 들어오는 행성의 흐름(트랜짓) — 현재의 시기감',
        '성장의 과제와 기회가 어느 영역에서 열리는지',
      ],
    },
    both: {
      title: '둘을 함께 보면',
      tagline: '동·서양의 교차 검증',
      body: '사주는 "큰 틀과 시기의 흐름"에, 점성은 "마음의 결과 지금의 분위기"에 강해요. 둘을 함께 보면 동양과 서양 두 관점이 서로를 보완하고 교차 검증합니다.',
      pointsTitle: '그래서 좋은 점',
      points: [
        '두 관점이 같은 결론을 가리키면 신뢰도가 올라가요',
        '한쪽이 놓친 부분을 다른 쪽이 메워 사각지대가 줄어요',
        '"왜 그런가(사주)"와 "지금 어떤 느낌인가(점성)"가 함께 보여요',
        '타이밍과 마음, 두 축을 같이 봐서 조언이 더 구체적이에요',
      ],
    },
    tip: '체크박스로 이번 상담에 어떤 관점을 쓸지 직접 고를 수 있어요. 가장 입체적인 해석을 위해 둘 다 켜두는 걸 추천해요.',
  },
  en: {
    trigger: 'What’s this?',
    title: 'Saju vs. Astrology — what’s the difference?',
    intro:
      'They’re two different “languages” for reading a person. Here’s how they differ, and why reading both is better.',
    close: 'Close',
    saju: {
      title: 'Saju (Eastern four pillars)',
      tagline: 'Innate nature & the big tides of fortune',
      body: 'From the four pillars (四柱) of your birth — year, month, day, and hour — and the balance of yin-yang and the five elements within them, Saju reads your innate temperament, strengths and weak spots, and the larger tides of fortune that shift across your life. It’s especially strong at “who am I, and when does the tide turn?”',
      pointsTitle: 'What it looks at',
      points: [
        'Your inborn character and the kinds of work and relationships that fit it',
        'Innate strengths and cautions across wealth, career, and health',
        'Ten-year luck cycles (daewoon) and the year’s luck (sewoon) — the big timing',
        'When to choose change, challenge, or rest',
      ],
    },
    astro: {
      title: 'Astrology (Western)',
      tagline: 'The texture of the heart & the season you’re in',
      body: 'From the positions and angles of the Sun, Moon, and planets at the moment you were born, astrology reads the texture of your heart, your desires and relational dynamics, and the season now passing through you (transits). It’s sensitive to inner motivation and the flow of feeling.',
      pointsTitle: 'What it looks at',
      points: [
        'Core tendencies and inner drives via Sun, Moon, and Ascendant',
        'How you’re drawn to others — and where you tend to clash',
        'The planetary cycles flowing in now (transits) — your present season',
        'Where your growth challenges and openings appear',
      ],
    },
    both: {
      title: 'Why read both together',
      tagline: 'East and West, cross-checked',
      body: 'Saju is strong on the “big frame and timing,” astrology on the “texture of the heart and the present mood.” Reading both lets the Eastern and Western views complement and cross-check each other.',
      pointsTitle: 'The payoff',
      points: [
        'When both point to the same conclusion, confidence goes up',
        'What one misses, the other fills in — fewer blind spots',
        'You see both “why it is” (Saju) and “how it feels now” (astrology)',
        'Timing and heart, read together, make the advice more concrete',
      ],
    },
    tip: 'Use the checkboxes to choose which lens this reading uses. For the fullest reading, we recommend keeping both on.',
  },
}

// 궁합(시너스트리) 버전 안내 — 개인 사주/점성이 아니라 *두 사람 사이* 의
// 끌림·마찰을 읽는다는 점이 달라, INFO 와 별도로 둔다(체크박스는 같아도 설명이
// 달라야 사용자가 헷갈리지 않는다). ko/en 같이 둬서 드리프트 방지.
const INFO_SYNASTRY: Record<
  LangKey,
  {
    trigger: string
    title: string
    intro: string
    close: string
    saju: InfoSection
    astro: InfoSection
    both: InfoSection
    tip: string
  }
> = {
  ko: {
    trigger: '사주·점성 궁합이란?',
    title: '사주 궁합 vs 점성 궁합',
    intro:
      '두 사람을 맞대어 보는 서로 다른 두 "언어"예요. 이번 풀이에 어떤 관점을 쓸지 체크박스로 고를 수 있어요.',
    close: '닫기',
    saju: {
      title: '사주 궁합 (동양 명리)',
      tagline: '두 기운의 끌림과 부딪힘, 그리고 시기',
      body: '두 사람의 사주(연·월·일·시)를 맞대어, 천간합·지지충 같은 끌림과 마찰, 일간끼리의 관계, 신살 교차, 그리고 지금 대운·세운의 흐름으로 "왜 끌리고 어디서 부딪히는지"와 관계의 시기를 읽습니다.',
      pointsTitle: '이런 걸 봐요',
      points: [
        '천간합·지지충으로 보는 끌림과 마찰 지점',
        '일간 관계로 보는 두 사람의 역할·결',
        '신살 교차(도화·천을귀인 등)로 보는 인연의 색',
        '대운·세운 교차로 보는 관계의 흐름과 시기',
      ],
    },
    astro: {
      title: '점성 궁합 (서양 시너스트리)',
      tagline: '마음의 결과 관계의 화학작용',
      body: '두 사람의 출생 차트를 겹쳐, 행성 사이의 각(aspect), 상대의 하우스로 들어오는 행성(하우스 오버레이), 그리고 둘이 함께 만드는 컴포지트 차트로 정서·애정·욕망의 결을 읽습니다.',
      pointsTitle: '이런 걸 봐요',
      points: [
        '행성 간 각으로 보는 끌림과 긴장',
        '하우스 오버레이로 보는 결혼·깊은 결합 신호',
        '금성·화성으로 보는 애정과 욕망의 템포',
        '컴포지트로 보는 "관계 자체"의 분위기',
      ],
    },
    both: {
      title: '둘을 함께 보면',
      tagline: '동·서양의 교차 검증',
      body: '사주 궁합은 "큰 틀과 시기"에, 점성 궁합은 "마음의 결과 화학작용"에 강해요. 둘을 함께 보면 두 관점이 서로를 보완하고 교차 검증해 더 입체적으로 봅니다.',
      pointsTitle: '그래서 좋은 점',
      points: [
        '두 관점이 같은 결론을 가리키면 신뢰도가 올라가요',
        '한쪽이 놓친 부분을 다른 쪽이 메워 사각지대가 줄어요',
        '"왜 그런가(사주)"와 "지금 어떤 느낌인가(점성)"가 함께 보여요',
        '타이밍과 마음, 두 축을 같이 봐서 조언이 더 구체적이에요',
      ],
    },
    tip: '체크박스로 이번 궁합 풀이에 어떤 관점을 쓸지 고를 수 있어요. 가장 입체적인 해석을 위해 둘 다 켜두는 걸 추천해요.',
  },
  en: {
    trigger: 'What’s this?',
    title: 'Saju compatibility vs. astrology synastry',
    intro:
      'Two different “languages” for reading a couple. Use the checkboxes to choose which lens this reading uses.',
    close: 'Close',
    saju: {
      title: 'Saju compatibility (Eastern)',
      tagline: 'Pull, friction, and timing between two energies',
      body: 'Placing both people’s four pillars (year, month, day, hour) side by side, Saju reads the pull and friction (stem combine, branch clash), the relationship between day masters, crossing sinsal, and — through the current daeun/sewoon — “why you’re drawn and where you clash,” plus the timing of the relationship.',
      pointsTitle: 'What it looks at',
      points: [
        'Pull and friction via stem-combine / branch-clash',
        'Each person’s role and grain via the day-master relationship',
        'The color of the bond via crossing sinsal (Dohwa, Cheoneul, etc.)',
        'The relationship’s flow and timing via daeun/sewoon crossings',
      ],
    },
    astro: {
      title: 'Astrology synastry (Western)',
      tagline: 'The texture of the heart & the chemistry',
      body: 'Overlaying both birth charts, astrology reads the grain of feeling, affection, and desire through aspects between planets, planets falling into each other’s houses (house overlays), and the composite chart the two of you create together.',
      pointsTitle: 'What it looks at',
      points: [
        'Attraction and tension via planetary aspects',
        'Marriage / deep-bonding signals via house overlays',
        'The tempo of affection and desire via Venus & Mars',
        'The mood of “the relationship itself” via the composite',
      ],
    },
    both: {
      title: 'Why read both together',
      tagline: 'East and West, cross-checked',
      body: 'Saju compatibility is strong on “the big frame and timing,” astrology synastry on “the texture of the heart and the chemistry.” Reading both lets the two views complement and cross-check each other for a fuller picture.',
      pointsTitle: 'The payoff',
      points: [
        'When both point to the same conclusion, confidence goes up',
        'What one misses, the other fills in — fewer blind spots',
        'You see both “why it is” (Saju) and “how it feels now” (astrology)',
        'Timing and heart, read together, make the advice more concrete',
      ],
    },
    tip: 'Use the checkboxes to choose which lens this reading uses. For the fullest reading, we recommend keeping both on.',
  },
}

/**
 * 운명상담사 입력창 위에 끼는 데이터 소스 체크박스 — 이번 답변에 사주/점성 중
 * 무엇을 넣을지 고른다. 둘 다 끄면 빈 컨텍스트라 의미가 없으므로, 마지막 하나는
 * 끄지 못하게 막는다(서버도 둘 다 false 면 둘 다로 폴백하지만 UI 에서 먼저 차단).
 *
 * showInfo 가 켜지면 체크박스 옆에 작은 "사주·점성이란?" 버튼이 붙고, 누르면
 * 로그인 모달처럼 가운데에 설명 카드가 떠오른다. variant 로 개인(self)/궁합
 * (synastry) 설명을 분기한다. showGroupLabel 은 체크박스 위에 용도 라벨을 띄운다.
 */
export const DataSourceToggles = React.memo(function DataSourceToggles({
  sources,
  onChange,
  lang,
  disabled = false,
  theme = 'light',
  showInfo = false,
  showGroupLabel = false,
  variant = 'self',
}: DataSourceTogglesProps) {
  const L = LABELS[lang] ?? LABELS.en
  // 안내 팝업 문구는 variant 로 분기 — 개인(운명) vs 궁합(시너스트리).
  const infoSet = variant === 'synastry' ? INFO_SYNASTRY : INFO
  const copy = infoSet[lang] ?? infoSet.en
  const [infoOpen, setInfoOpen] = useState(false)
  const toggle = (key: keyof DestinySources) => {
    const next = { ...sources, [key]: !sources[key] }
    // 최소 하나는 항상 켜둔다 — 마지막 체크를 끄려 하면 무시.
    if (!next.saju && !next.astro) return
    onChange(next)
  }
  return (
    <div
      className={styles.toggles}
      data-theme={theme}
      data-haslabel={showGroupLabel || undefined}
      role="group"
      aria-label={L.group}
    >
      {showGroupLabel ? <span className={styles.groupLabel}>{L.group}</span> : null}
      <label className={styles.toggle} data-active={sources.saju || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.saju}
          disabled={disabled}
          onChange={() => toggle('saju')}
        />
        <span>{L.saju}</span>
      </label>
      <label className={styles.toggle} data-active={sources.astro || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.astro}
          disabled={disabled}
          onChange={() => toggle('astro')}
        />
        <span>{L.astro}</span>
      </label>
      {showInfo ? (
        <>
          <button
            type="button"
            className={styles.infoButton}
            onClick={() => setInfoOpen(true)}
            aria-haspopup="dialog"
          >
            <span className={styles.infoIcon} aria-hidden="true">
              i
            </span>
            <span className={styles.infoLabel}>{copy.trigger}</span>
          </button>
          <DataSourceInfoModal copy={copy} open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
      ) : null}
    </div>
  )
})

/**
 * "사주·점성이란?" 설명 카드. 로그인 모달과 같은 패턴(createPortal + 블러
 * 백드롭 + 가운데 흰 카드)으로 띄워 "튀어나오는" 느낌을 준다. ESC/백드롭/X 닫기.
 */
function DataSourceInfoModal({
  copy,
  open,
  onClose,
}: {
  copy: (typeof INFO)[LangKey]
  open: boolean
  onClose: () => void
}) {
  const I = copy
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 떠 있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // ESC 로 닫기.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={I.title}
      onClick={onClose}
      className={styles.infoBackdrop}
    >
      <div onClick={(e) => e.stopPropagation()} className={styles.infoCard}>
        <button type="button" onClick={onClose} aria-label={I.close} className={styles.infoClose}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h2 className={styles.infoTitle}>{I.title}</h2>
        <p className={styles.infoIntro}>{I.intro}</p>

        <InfoSectionCard tone="saju" emoji="🔮" section={I.saju} />
        <InfoSectionCard tone="astro" emoji="✨" section={I.astro} />
        <InfoSectionCard tone="both" emoji="🤝" section={I.both} />

        <p className={styles.infoTip}>{I.tip}</p>
      </div>
    </div>,
    document.body
  )
}

// 팝업 카드 안의 한 섹션(사주/점성/둘다) — 제목+한 줄 요약, 소개 문단,
// 그리고 "이런 걸 봐요" 핵심 항목 리스트.
function InfoSectionCard({
  tone,
  emoji,
  section,
}: {
  tone: 'saju' | 'astro' | 'both'
  emoji: string
  section: InfoSection
}) {
  return (
    <div className={styles.infoSection} data-tone={tone}>
      <p className={styles.infoSectionTitle}>
        <span aria-hidden="true">{emoji}</span> {section.title}
      </p>
      <p className={styles.infoSectionTagline}>{section.tagline}</p>
      <p className={styles.infoSectionBody}>{section.body}</p>
      <p className={styles.infoPointsTitle}>{section.pointsTitle}</p>
      <ul className={styles.infoPoints}>
        {section.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}
