import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const runtime = 'nodejs';

let stripeInstance: Stripe | null = null;
function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // apiVersion 명시 제거(현재 설치된 stripe 타입 요구 버전과 충돌 방지)
  stripeInstance = new Stripe(key);
  return stripeInstance;
}

export async function POST(_req: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    // 환경변수 체크
    const price = process.env.NEXT_PUBLIC_PRICE_MONTHLY; // price_xxx
    const base = process.env.NEXT_PUBLIC_BASE_URL;       // e.g., https://your-domain.com
    if (!price) {
      console.error('ERR: NEXT_PUBLIC_PRICE_MONTHLY missing');
      return NextResponse.json({ error: 'missing_price' }, { status: 500 });
    }
    if (!base) {
      console.error('ERR: NEXT_PUBLIC_BASE_URL missing');
      return NextResponse.json({ error: 'missing_base_url' }, { status: 500 });
    }

    const stripe = getStripe();
    if (!stripe) {
      console.error('ERR: STRIPE_SECRET_KEY missing');
      return NextResponse.json({ error: 'missing_secret' }, { status: 500 });
    }

    // Checkout 세션 생성 (월 구독)
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
      customer_email: session.user.email ?? undefined,
      metadata: {
        productId: 'monthly-premium',
        userId: (session.user as any)?.id || '',
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: 'no_checkout_url' }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (e: any) {
    console.error('Stripe error:', e?.raw?.message || e?.message || e);
    return NextResponse.json(
      { error: 'stripe_error', message: e?.raw?.message || e?.message || 'unknown' },
      { status: 400 }
    );
  }
}