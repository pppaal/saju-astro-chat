import Link from 'next/link'
import PremiumReportsPageClient from './PremiumReportsPageClient'

export default function PremiumReportsPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-4 text-slate-100">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          AI Report: Free / Premium
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300 md:text-base">
          출생 정보 공통 폼을 한 번 입력하면, 무료 운명 인사이트 또는 프리미엄 테마 리포트로 바로
          이어집니다. 프리미엄은 인생총운, 신년운, 연애, 커리어, 재물, 건강, 가족 테마를 제공합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/destiny-counselor"
            className="rounded-lg border border-cyan-300/40 px-3 py-1.5 text-cyan-200 hover:text-cyan-100"
          >
            운명 상담 시작
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-violet-300/40 px-3 py-1.5 text-violet-200 hover:text-violet-100"
          >
            요금제/환불 정책 확인
          </Link>
        </div>
      </section>
      <PremiumReportsPageClient />
    </>
  )
}
