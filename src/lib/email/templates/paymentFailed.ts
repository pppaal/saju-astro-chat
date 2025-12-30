import type { SubscriptionTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function paymentFailedTemplate(data: SubscriptionTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, planName, locale } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');
  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const subject = isKo
    ? `[중요] DestinyPal 결제 실패 알림`
    : `[Important] DestinyPal Payment Failed`;

  const content = isKo
    ? `
    <h2>결제가 실패했습니다</h2>
    <p>${name}님, ${planDisplayName} 플랜 갱신 결제가 처리되지 않았습니다.</p>

    <div class="info-box" style="background-color: #FEF2F2; border-left: 4px solid #EF4444;">
      <p><strong>플랜:</strong> ${planDisplayName}</p>
      <p><strong>상태:</strong> 결제 실패</p>
      <p><strong>날짜:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>

    <h3 style="margin-top: 24px; color: #4B5563;">조치가 필요합니다</h3>
    <p>구독을 유지하려면 결제 수단을 업데이트해 주세요:</p>
    <ul>
      <li>카드 유효기간이 만료되었을 수 있습니다</li>
      <li>카드 한도가 초과되었을 수 있습니다</li>
      <li>은행에서 결제를 차단했을 수 있습니다</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/profile" class="button">결제 수단 업데이트</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      문제가 해결되지 않으면 며칠 내에 자동으로 재시도됩니다.
      계속 실패할 경우 구독이 취소될 수 있습니다.
    </p>
  `
    : `
    <h2>Payment Failed</h2>
    <p>${name}, your ${planDisplayName} plan renewal payment could not be processed.</p>

    <div class="info-box" style="background-color: #FEF2F2; border-left: 4px solid #EF4444;">
      <p><strong>Plan:</strong> ${planDisplayName}</p>
      <p><strong>Status:</strong> Payment Failed</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
    </div>

    <h3 style="margin-top: 24px; color: #4B5563;">Action Required</h3>
    <p>To keep your subscription active, please update your payment method:</p>
    <ul>
      <li>Your card may have expired</li>
      <li>Your card limit may have been exceeded</li>
      <li>Your bank may have blocked the payment</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/profile" class="button">Update Payment Method</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      If not resolved, we'll automatically retry in a few days.
      Your subscription may be cancelled if payments continue to fail.
    </p>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo
        ? '결제 수단을 업데이트해 주세요'
        : 'Please update your payment method',
    }),
  };
}
