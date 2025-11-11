// src/app/api/checkout/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    // 환경변수 체크
    const price = process.env.NEXT_PUBLIC_PRICE_MONTHLY;
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    if (!price) {
      console.error('ERR: NEXT_PUBLIC_PRICE_MONTHLY missing');
      return NextResponse.json({ error: 'missing_price' }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('ERR: STRIPE_SECRET_KEY missing');
      return NextResponse.json({ error: 'missing_secret' }, { status: 400 });
    }
    if (!base) {
      console.error('ERR: NEXT_PUBLIC_BASE_URL missing');
      return NextResponse.json({ error: 'missing_base_url' }, { status: 400 });
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

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (e: any) {
    console.error('Stripe error:', e?.raw?.message || e?.message || e);
    return NextResponse.json(
      { error: 'stripe_error', message: e?.raw?.message || e?.message },
      { status: 400 }
    );
  }
}