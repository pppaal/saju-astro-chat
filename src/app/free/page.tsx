// src/app/free/page.tsx
//
// 무료 퍼널 허브 — 인스타/쓰레드/유튜브 바이오에 링크하는 단일 랜딩.
// 포지셔닝: "사주와 별자리를 따로가 아니라 겹쳐서" 본다는 교차검증 엔진이 핵심 차별점.
// 경쟁사(점신·포스텔러·헬로우봇)는 사주 메뉴·별자리 메뉴를 나란히 놓을 뿐, "둘이 같은
// 결론을 낸 지점"을 파는 곳은 없다 — 그 빈 자리를 히어로 카피가 정면으로 차지한다.
//
// 서버 컴포넌트 — OG/트위터 카드 + SSR 로 소셜 크롤러가 미리보기를 잡고, 검색엔진에도
// 색인된다(개인 결과가 아니라 마케팅 랜딩이라 noindex 아님). 로케일은 미들웨어가 주입하는
// x-locale 헤더로 읽는다(클라 useI18n 과 동일 SSOT).
//
// 스타일은 승인된 목업(scratchpad free_v2)을 그대로 옮긴 것. 앱 전역 스타일과 충돌하지
// 않도록 모든 클래스를 `fh-` 로 프리픽스하고, 리셋/CSS 변수를 .fh-wrap 안으로 스코핑한다.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { recordCounter } from '@/lib/metrics/index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function resolveLocale(): Promise<'ko' | 'en'> {
  const h = await headers()
  return h.get('x-locale') === 'en' ? 'en' : 'ko'
}

export async function generateMetadata(): Promise<Metadata> {
  const isKo = (await resolveLocale()) === 'ko'
  const title = isKo
    ? '사주도 별자리도 너를 같은 사람이라 말해 — 무료 교차검증 | DestinyPal'
    : 'Saju and the stars describe the same person — free cross-check | DestinyPal'
  const description = isKo
    ? '동양 사주와 서양 별자리를 따로가 아니라 겹쳐서. 두 체계가 같은 결론을 낸 지점만 골라 보여드려요. 생년월일 하나면 30초, 가입 없이 무료.'
    : 'Korean astrology and Western astrology, read together — we surface only where both reach the same conclusion. Just your birth date, 30 seconds, free.'
  return {
    title,
    description,
    alternates: { canonical: '/free' },
    openGraph: {
      type: 'website',
      url: '/free',
      title,
      description,
      images: [{ url: '/og-card-v2.png', width: 1200, height: 630, alt: 'DestinyPal' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-card-v2.png'] },
  }
}

// 무료 도구 카드 — 목업 최종 순서. 첫 카드는 첫 방문의 무게중심(인생총운·평생흐름),
// 둘째는 데일리 재방문 훅(타로). href 는 전부 "로그인 없이 즉시 가치"가 나오는 진입점.
type FreeTool = {
  href: string
  tint: string
  bg: string
  bd: string
  svg: string
  title: { ko: string; en: string }
  desc: { ko: string; en: string }
  xtag?: { ko: string; en: string }
}

const FREE_TOOLS: readonly FreeTool[] = [
  {
    href: '/destiny',
    tint: '#e0a13a',
    bg: 'rgba(224,161,58,.1)',
    bd: 'rgba(224,161,58,.26)',
    svg: '<path d="M3 17c3-1 4-9 7-9s3 6 5 6 3-7 6-8"/><circle cx="17" cy="6" r="1.4" fill="currentColor" stroke="none"/>',
    title: { ko: '내 인생, 언제 피어날까', en: 'When does my life bloom' },
    desc: {
      ko: '태어나서 지금까지, 오를 때와 눌릴 때를 한 곡선으로. 내 인생유형까지.',
      en: 'Every rise and dip from birth to now, in one curve. Plus your life type.',
    },
    xtag: { ko: '◐ 사주 × 별자리', en: '◐ Korean × Western' },
  },
  {
    href: '/tarot/daily',
    tint: '#8a6fb0',
    bg: 'rgba(138,111,176,.1)',
    bd: 'rgba(138,111,176,.26)',
    svg: '<rect x="5" y="3" width="11" height="15" rx="2" transform="rotate(-8 10 10)"/><rect x="9" y="5" width="11" height="15" rx="2" transform="rotate(7 14 12)"/>',
    title: { ko: '오늘 나에게 오는 카드', en: "Today's card for you" },
    desc: {
      ko: '타로 한 장으로 오늘의 흐름과 해볼 행동 하나. 매일 새로.',
      en: "One tarot card — today's flow and one thing to try. New every day.",
    },
  },
  {
    href: '/compatibility/free',
    tint: '#d6799a',
    bg: 'rgba(214,121,154,.1)',
    bd: 'rgba(214,121,154,.26)',
    svg: '<path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7-2.5C19 10.5 12 20 12 20Z"/>',
    title: { ko: '우리 둘, 얼마나 맞을까', en: 'How well do we match' },
    desc: {
      ko: '두 사람의 사주·별자리를 맞대 보는 관계 케미. 친구든 연인이든 바로.',
      en: 'Two charts side by side — your relationship chemistry. Friend or partner, right away.',
    },
  },
  {
    href: '/integrated-report',
    tint: '#c98b3a',
    bg: 'rgba(201,139,58,.1)',
    bd: 'rgba(201,139,58,.26)',
    svg: '<path d="M7 3h7l4 4v14H7z"/><path d="M13 3v5h5M10 12h5M10 16h5"/>',
    title: { ko: '나는 어떤 사람일까', en: 'Who am I, really' },
    desc: {
      ko: '사주 네 기둥과 출생 별자리를 겹쳐 한 장으로. 성격·강점·약점까지.',
      en: 'Your four pillars and birth chart, layered into one read. Personality, strengths, blind spots.',
    },
    xtag: { ko: '◐ 사주 × 별자리', en: '◐ Korean × Western' },
  },
  {
    href: '/calendar',
    tint: '#5aa6d8',
    bg: 'rgba(90,166,216,.1)',
    bd: 'rgba(90,166,216,.26)',
    svg: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 9h16M8 3v4M16 3v4"/>',
    title: { ko: '이번 달, 좋은 날은 언제', en: 'Which days are good this month' },
    desc: {
      ko: '사주 운흐름과 별의 타이밍이 겹치는 날을 캘린더로.',
      en: "Where your Saju flow and the stars' timing overlap — on a calendar.",
    },
  },
  {
    href: '/fortune',
    emoji: '🐲',
    tint: '#e0653b',
    title: { ko: '띠별 오늘의 운세', en: 'Zodiac Daily Fortune' },
    desc: {
      ko: '오늘 일진과 내 띠의 합·충을 엔진이 계산한 오늘의 흐름. 매일 아침 새로 나와요.',
      en: 'Today’s flow for your zodiac sign, computed from the day-pillar. Fresh every morning.',
    },
    badge: { ko: '완전 무료 · 로그인 X', en: 'Free · no sign-up' },
  },
  {
    href: '/tarot/cards',
    emoji: '🃏',
    tint: '#8b5cf6',
    title: { ko: '타로 카드 의미 사전', en: 'Tarot Card Meanings' },
    desc: {
      ko: '78장 카드의 정방향·역방향 의미와 조언을 카드별로. 궁금했던 그 카드를 찾아보세요.',
      en: 'Upright & reversed meanings and advice for all 78 cards. Look up the card on your mind.',
    },
    badge: { ko: '완전 무료 · 로그인 X', en: 'Free · no sign-up' },
  },
]

const CSS = `
.fh-wrap{
  --card:#ffffff; --ink:#20242e; --muted:#6b7180; --gold:#b58a3e;
  --east:#c98b3a; --west:#5f6dc4; --xline:#8a6fb0; --line:rgba(35,40,55,0.09);
  --sans:"Pretendard","Apple SD Gothic Neo","Noto Sans KR",-apple-system,system-ui,sans-serif;
  max-width:440px;margin:0 auto;padding:30px 20px 46px;
  font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;
}
.fh-wrap *{box-sizing:border-box}
.fh-wrap h1,.fh-wrap h2,.fh-wrap p{margin:0}
.fh-main{
  min-height:100vh;
  background:
    radial-gradient(70% 34% at 30% 0%, rgba(201,139,58,0.10), transparent 60%),
    radial-gradient(70% 34% at 78% 4%, rgba(95,109,196,0.10), transparent 60%),
    linear-gradient(180deg,#faf8f3,#f6f3ec 60%,#f2eee6);
}
.fh-venn{width:96px;height:60px;margin:6px auto 0;position:relative}
.fh-venn .c{position:absolute;top:6px;width:52px;height:52px;border-radius:50%;mix-blend-mode:multiply}
.fh-venn .east{left:6px;background:radial-gradient(circle at 40% 40%,rgba(201,139,58,.42),rgba(201,139,58,.16));border:1.5px solid rgba(201,139,58,.55)}
.fh-venn .west{right:6px;background:radial-gradient(circle at 60% 40%,rgba(95,109,196,.42),rgba(95,109,196,.16));border:1.5px solid rgba(95,109,196,.55)}
.fh-venn .spark{position:absolute;left:50%;top:32px;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:#fff;box-shadow:0 0 14px 5px rgba(180,140,220,.85),0 0 4px 1px #fff}
.fh-venn .lab{position:absolute;bottom:-2px;font-size:10px;font-weight:800;letter-spacing:.02em}
.fh-venn .le{left:2px;color:var(--east)} .fh-venn .lw{right:2px;color:var(--west)}

.fh-hero{text-align:center;margin-top:16px}
.fh-eyebrow{display:inline-block;font-size:11.5px;letter-spacing:.04em;font-weight:800;color:#7a5fa0;background:rgba(138,111,176,.10);border:1px solid rgba(138,111,176,.24);border-radius:100px;padding:5px 13px}
.fh-hook{font-size:26px;font-weight:800;line-height:1.44;margin-top:16px;word-break:keep-all;letter-spacing:-.02em}
.fh-hook .e{color:var(--east)} .fh-hook .w{color:var(--west)} .fh-hook .x{color:var(--xline)}
.fh-concerns{margin-top:13px;font-size:14.5px;line-height:1.62;color:#41475a;word-break:keep-all;font-weight:600}
.fh-concerns b{color:var(--xline);font-weight:800}
.fh-sub{margin-top:9px;font-size:13px;line-height:1.6;color:var(--muted);word-break:keep-all}

.fh-cta{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:22px}
.fh-btn{width:100%;height:56px;border:none;border-radius:16px;cursor:pointer;text-decoration:none;
  background:linear-gradient(100deg,var(--east),#a778b0 52%,var(--west));color:#fff;
  font-family:var(--sans);font-size:16.5px;font-weight:800;letter-spacing:-.01em;
  display:flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 14px 32px -12px rgba(120,90,160,.6)}
.fh-reassure{font-size:12px;color:var(--muted);font-weight:600}
.fh-reassure b{color:#41475a;font-weight:800}

.fh-proofline{margin-top:20px;text-align:center;font-size:13px;line-height:1.6;color:#5a5f70;word-break:keep-all;background:rgba(255,255,255,.6);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.fh-proofline .qq{font-weight:800;color:var(--ink)}
.fh-proofline b{color:var(--xline);font-weight:800}
.fh-badge2{display:inline-flex;align-items:center;gap:5px;margin-top:11px;font-size:11px;font-weight:800;color:#7a5fa0;background:rgba(138,111,176,.09);border:1px solid rgba(138,111,176,.2);border-radius:100px;padding:3px 10px}

.fh-divider{display:flex;align-items:center;gap:12px;margin:32px 2px 15px;color:var(--muted);font-size:12px;font-weight:700}
.fh-divider::before,.fh-divider::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,transparent,var(--line),transparent)}

.fh-cards{display:flex;flex-direction:column;gap:11px}
.fh-card{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:15px 16px;min-height:76px;box-shadow:0 10px 26px -20px rgba(60,50,30,.5);position:relative}
.fh-ic{width:46px;height:46px;flex:none;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--tint-bg);border:1px solid var(--tint-bd)}
.fh-ic svg{width:24px;height:24px;color:var(--tint);stroke:var(--tint);fill:none;stroke-width:1.7}
.fh-ct{flex:1;min-width:0}
.fh-ct .t{display:block;font-size:15.5px;font-weight:800;letter-spacing:-.01em}
.fh-ct .d{display:block;font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.46;word-break:keep-all}
.fh-xtag{display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:10.5px;font-weight:800;color:#7a5fa0;background:rgba(138,111,176,.09);border:1px solid rgba(138,111,176,.2);border-radius:100px;padding:2px 8px}
.fh-chev{color:#c7c1b4;font-size:22px;flex:none}

.fh-share{margin-top:22px;text-align:center;background:linear-gradient(180deg,rgba(138,111,176,.07),#fff);border:1px solid rgba(138,111,176,.2);border-radius:18px;padding:18px}
.fh-share .q{font-size:16.5px;font-weight:800;color:var(--ink);word-break:keep-all}
.fh-share .s{font-size:12.5px;color:var(--muted);margin-top:6px;word-break:keep-all}

.fh-foot{margin-top:22px;text-align:center;font-size:12px;color:var(--muted);line-height:1.7;word-break:keep-all}
.fh-mainlink{margin-top:16px;text-align:center}
.fh-mainlink a{display:inline-block;padding:13px 28px;border-radius:999px;background:var(--gold);color:#fff;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 12px 30px -16px rgba(120,90,30,.6)}
`

export default async function FreeFunnelHub() {
  const isKo = (await resolveLocale()) === 'ko'

  // 퍼널 측정 — 허브 도달(소셜 유입의 1차 지표). /r 페이지 패턴과 동일.
  recordCounter('funnel.free_hub.viewed', 1)

  return (
    <main className="fh-main">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fh-wrap">
        {/* 브랜드는 글로벌 헤더가 이미 노출하므로 여기선 생략(중복 방지). */}

        {/* 벤다이어그램 — 사주 ∩ 별자리 교차점의 스파크 */}
        <div className="fh-venn" aria-hidden>
          <span className="c east" />
          <span className="c west" />
          <span className="spark" />
          <span className="lab le">{isKo ? '사주' : 'Saju'}</span>
          <span className="lab lw">{isKo ? '별자리' : 'Stars'}</span>
        </div>

        {/* 히어로 */}
        <section className="fh-hero">
          <span className="fh-eyebrow">
            {isKo
              ? '동양 사주 × 서양 별자리 — 따로 말고 겹쳐서'
              : 'Korean astrology × Western astrology — read together, not apart'}
          </span>

          {isKo ? (
            <h1 className="fh-hook">
              <span className="e">사주</span>도 <span className="w">별자리</span>도,
              <br />
              이상하게 <span className="x">너를 같은 사람</span>이라 말해.
            </h1>
          ) : (
            <h1 className="fh-hook">
              <span className="e">Saju</span> and the <span className="w">stars</span>,
              <br />
              strangely, describe <span className="x">the same person</span> — you.
            </h1>
          )}

          <p className="fh-concerns">
            {isKo ? (
              <>
                연애, 일, 관계, 타이밍 — <b>두 개가 같은 곳을 가리킬 때</b> 그게 진짜 나예요.
              </>
            ) : (
              <>
                Love, work, people, timing — <b>when both point to the same place,</b> that&apos;s
                the real you.
              </>
            )}
          </p>
          <p className="fh-sub">
            {isKo
              ? '생년월일 하나면 30초. 소름 돋는 그 지점을 찾아드려요.'
              : "Just your birth date, 30 seconds. We'll find the spot that gives you chills."}
          </p>

          {/* CTA — 메인(전체 결과 플로우)으로 연결하는 1차 진입로 */}
          <div className="fh-cta">
            <Link href="/" className="fh-btn">
              {isKo ? '내 결과 보기 →' : 'See my result →'}
            </Link>
            <span className="fh-reassure">
              {isKo ? (
                <>
                  <b>결과는 무료</b> · 가입 없이 · 30초
                </>
              ) : (
                <>
                  <b>Free result</b> · no sign-up · 30 sec
                </>
              )}
            </span>
          </div>

          {/* 교차검증 엔진 설명 — 후기가 아니라 엔진이 실제로 하는 일(사실 진술) */}
          <div className="fh-proofline">
            <span className="qq">
              {isKo ? '두 체계가 따로 계산해요.' : 'The two systems calculate separately.'}
            </span>
            <br />
            {isKo ? (
              <>
                사주와 별자리가 <b>같은 결론</b>을 낸 지점만 골라 보여드려요.
              </>
            ) : (
              <>
                We surface only where Korean and Western astrology <b>reach the same conclusion</b>.
              </>
            )}
            <br />
            <span className="fh-badge2">
              {isKo
                ? '◑ 사주·별자리 교차검증 엔진'
                : '◑ Korean × Western astrology cross-check engine'}
            </span>
          </div>
        </section>

        <div className="fh-divider">{isKo ? '뭐부터 볼까' : 'Where to start'}</div>

        {/* 무료 도구 카드 */}
        <div className="fh-cards">
          {FREE_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="fh-card"
              style={
                {
                  ['--tint' as string]: tool.tint,
                  ['--tint-bg' as string]: tool.bg,
                  ['--tint-bd' as string]: tool.bd,
                } as React.CSSProperties
              }
            >
              <span className="fh-ic" aria-hidden>
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: tool.svg }} />
              </span>
              <span className="fh-ct">
                <span className="t">{isKo ? tool.title.ko : tool.title.en}</span>
                <span className="d">{isKo ? tool.desc.ko : tool.desc.en}</span>
                {tool.xtag && <span className="fh-xtag">{isKo ? tool.xtag.ko : tool.xtag.en}</span>}
              </span>
              <span className="fh-chev" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>

        {/* 공유 유도 — 바이럴 루프의 핵심 */}
        <div className="fh-share">
          <p className="q">
            {isKo
              ? '두 체계가 같은 말을 할 때, 제일 선명해요.'
              : "It's clearest when both systems say the same thing."}
          </p>
          <p className="s">
            {isKo
              ? '결과 캡처해서 친구한테 — 너희 둘은 어디서 겹칠까?'
              : 'Screenshot it for a friend — where do you two overlap?'}
          </p>
        </div>

        <p className="fh-foot">
          {isKo
            ? '생일 하나면 결과는 바로 나와요 · 더 깊은 해석은 메인에서 이어져요'
            : 'One birth date and your result is instant · deeper reading continues in the app'}
        </p>

        {/* 메인 웹페이지로 들어가는 또렷한 경로 */}
        <div className="fh-mainlink">
          <Link href="/">{isKo ? '메인으로 가기 →' : 'Go to the main site →'}</Link>
        </div>
      </div>
    </main>
  )
}
