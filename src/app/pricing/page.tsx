'use client';
import { useState } from 'react';

export default function PricingPage() {
  const [email, setEmail] = useState('');

  async function checkout(productId: 'monthly-premium' | 'annual-premium' | 'full-report-unlock') {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || '결제 생성 실패');
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>destinypal Pricing</h1>

      <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Email(선택)</label>
      <input
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', marginBottom: 20 }}
      />

      <div style={{ display: 'grid', gap: 12 }}>
        <button
          onClick={() => checkout('monthly-premium')}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}
        >
          Premium HK$39/월
        </button>

        <button
          onClick={() => checkout('annual-premium')}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}
        >
          Premium HK$299/년
        </button>

        <button
          onClick={() => checkout('full-report-unlock')}
          style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}
        >
          전체 리포트 1회 HK$49
        </button>
      </div>
    </div>
  );
}