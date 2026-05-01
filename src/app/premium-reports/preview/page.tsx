'use client'

/**
 * Premium Report Preview — 결제 전 사용자가 받게 될 리포트 형식 미리보기.
 * 비주얼 컴포넌트(도넛/배지/cross map) + 샘플 narration.
 */

import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import FiveElementsDonut from '@/components/reports/FiveElementsDonut'
import ConfidenceScoreBadge from '@/components/reports/ConfidenceScoreBadge'
import SajuAstroCrossMap from '@/components/reports/SajuAstroCrossMap'

const SAMPLE_FIVE_ELEMENTS = { wood: 3, fire: 0, earth: 2, metal: 2, water: 1 }

const SAMPLE_CROSS_SIGNALS = [
  {
    axis: '성격',
    saju: '신금 일간 + 정관격',
    astro: 'ASC 천칭자리 + 토성 4H',
    meaning: '책임·신뢰의 결이 본명·외부 인상 양쪽에서 같은 방향으로 정렬된 차트',
    strength: 'strong' as const,
    direction: 'flow' as const,
  },
  {
    axis: '관계',
    saju: '관성 2개 + 천을귀인',
    astro: 'Juno 7H + Venus on natal MC',
    meaning: '결혼·동반자 결이 사주·점성 양쪽에서 활성화된 시점',
    strength: 'strong' as const,
    direction: 'flow' as const,
  },
  {
    axis: '재물',
    saju: '정재 1개 + 식상 두텁',
    astro: '목성 10하우스 트랜짓',
    meaning: '커리어·자원이 한 방향으로 흘러나가는 자리',
    strength: 'medium' as const,
    direction: 'flow' as const,
  },
  {
    axis: '시기',
    saju: '대운 戊寅 + 세운 금',
    astro: 'Saturn return',
    meaning: '큰 단위 정리·재구축이 사주·점성 양쪽에서 동시에 들어옴',
    strength: 'strong' as const,
    direction: 'caution' as const,
  },
  {
    axis: '용신',
    saju: '용신 금',
    astro: '세운 금 정렬',
    meaning: '본명에 가장 보탬이 되는 element가 외부 환경에서 들어오는 자리',
    strength: 'strong' as const,
    direction: 'flow' as const,
  },
  {
    axis: '진로',
    saju: '식신 표현 결',
    astro: 'Venus 11H 트랜짓',
    meaning: '창의·표현 영역이 양쪽에서 같이 활성화된 자리',
    strength: 'medium' as const,
    direction: 'flow' as const,
  },
]

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a0a1a_0%,#141424_100%)] px-4 py-12 text-slate-100">
      <div className="fixed left-4 top-4 z-30">
        <BackButton />
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero */}
        <header className="space-y-3 pt-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/70">
            Premium Report Preview
          </p>
          <h1 className="bg-[linear-gradient(135deg,#fff_0%,#7c5cff_100%)] bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
            사주 × 점성 통합 리포트
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-300/85">
            8,000~10,000자 long-form, 6 테마 × 8 섹션, 사주·점성 50:50 cross.
            아래는 결제하면 받게 될 리포트 시각 요소 미리보기예요.
          </p>
        </header>

        {/* Sample 1: 5행 도넛 + Confidence */}
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:grid-cols-2">
          <div className="flex flex-col items-center gap-3 border-b border-white/[0.07] pb-6 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              5행 분포 시각화
            </h2>
            <FiveElementsDonut fiveElements={SAMPLE_FIVE_ELEMENTS} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              사주·점성 합의 강도
            </h2>
            <ConfidenceScoreBadge
              scorePercent={87}
              band="high"
              description="두 시스템이 같은 방향을 강하게 가리키는 합의 신호. 결정에 가속이 잘 붙는 시점."
              size="lg"
            />
            <ConfidenceScoreBadge
              scorePercent={62}
              band="medium"
              description="같은 방향이지만 강도는 중간. 두 시각을 같이 보고 가는 편이 안전."
              size="sm"
            />
          </div>
        </section>

        {/* Sample 2: Cross Map */}
        <section>
          <SajuAstroCrossMap signals={SAMPLE_CROSS_SIGNALS} />
        </section>

        {/* Sample 3: Narration */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(7,11,19,0.88))] p-6 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">
            Narrative Sample
          </p>
          <h2 className="mt-1.5 text-[1.35rem] font-semibold text-white">
            연애 DNA — 핵심 흐름
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-[1.85] text-slate-200/95">
            <p style={{ wordBreak: 'keep-all' }}>
              네 연애 스타일을 보면, 사주로는{' '}
              <strong className="font-semibold text-white">정관이 강해서</strong> 진지하고 안정적인 관계를
              원해. 점성술로도{' '}
              <strong className="font-semibold text-white">금성이 황소자리</strong>라 천천히 깊어지는 연애를
              선호하지. 이렇게 둘 다 안정 지향이라고 하니{' '}
              <mark className="rounded-md bg-amber-300/20 px-1.5 py-0.5 text-amber-100 ring-1 ring-amber-300/30">
                번개 같은 사랑보다는 오래 알고 사귀는 게 네 스타일
              </mark>
              이야.
            </p>
            <p style={{ wordBreak: 'keep-all' }}>
              끌리는 타입은 사주에서{' '}
              <strong className="font-semibold text-white">금 기운이 부족해서</strong> 결단력 있는 사람한테
              끌리는데, 점성술로도{' '}
              <strong className="font-semibold text-white">하강궁이 사수자리</strong>라 자유롭고 모험적인
              사람을 만나게 돼. 둘 다 정반대 에너지를 말하니{' '}
              <mark className="rounded-md bg-amber-300/20 px-1.5 py-0.5 text-amber-100 ring-1 ring-amber-300/30">
                나랑 다른 사람한테 끌리는 게 맞아
              </mark>
              .
            </p>
            <blockquote className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.04] px-5 py-4 text-[14.5px] leading-[1.8] text-amber-50/95">
              &quot;재접근 가능성을 보면, 사주로는 관성은 남아 있는데 충이 걸려서 마음은 남아도 속도가
              흔들리고, 점성술로도 금성-토성 긴장이 있으면 좋아도 쉽게 확답을 못 해. 둘 다 감정은 있지만
              재접근은 천천히 풀린다고 말하니 밀어붙이기보다 조건 정리가 먼저야.&quot;
            </blockquote>
          </div>
          <p className="mt-5 text-[11px] text-slate-400">
            — 실제 리포트는 본인 사주·점성 데이터로 8개 섹션 × 8,000~10,000자로 작성됩니다.
          </p>
        </section>

        {/* Differentiation badges */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { num: '12+', label: '사주×점성 cross 신호' },
            { num: '50+', label: '60갑자 페어 정통 풀이' },
            { num: '4', label: 'Tier 깊이 KB (격국·신살·소행성·용신·12운성)' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center backdrop-blur-md"
            >
              <p className="text-2xl font-bold text-white">{stat.num}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-300">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,92,255,0.18),rgba(124,92,255,0.04))] p-8 text-center backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white">실제 내 사주로 풀어보기</h2>
          <p className="max-w-md text-sm text-slate-300/85">
            본인 생년월일·시간만 있으면 위 모든 분석을 사주·점성 cross로 8천자 이상 풀어드려요.
          </p>
          <Link
            href="/premium-reports"
            className="rounded-xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            리포트 시작하기 →
          </Link>
        </section>
      </div>
    </div>
  )
}
