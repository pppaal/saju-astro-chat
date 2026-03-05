import Link from 'next/link'

export default function DestinyMapPage() {
  return (
    <section className="mx-auto min-h-[70vh] max-w-5xl px-4 py-16 text-slate-100">
      <div className="rounded-3xl border border-cyan-300/30 bg-slate-900/60 p-7 backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-wide text-cyan-200">DESTINY MAP</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
          사주 + 점성 통합 운명 지도
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
          Destiny Map은 사주와 점성 데이터를 교차 해석해 성향, 타이밍, 의사결정 포인트를 정리하는
          핵심 서비스입니다. 공통 프로필 입력 후 무료 인사이트 또는 프리미엄 리포트로 이어서 확인할
          수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/destiny-counselor"
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:brightness-110"
          >
            운명 상담 시작
          </Link>
          <Link
            href="/premium-reports"
            className="rounded-xl border border-violet-300/40 px-4 py-2 text-sm font-semibold text-violet-200 hover:text-violet-100"
          >
            Free / Premium 리포트 보기
          </Link>
        </div>
      </div>
    </section>
  )
}
