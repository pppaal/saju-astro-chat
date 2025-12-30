import type { SubscriptionTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function subscriptionCancelledTemplate(data: SubscriptionTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, planName, locale } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');
  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const subject = isKo
    ? `DestinyPal 구독이 취소되었습니다`
    : `Your DestinyPal Subscription Has Been Cancelled`;

  const content = isKo
    ? `
    <h2>구독이 취소되었습니다</h2>
    <p>${name}님, ${planDisplayName} 플랜 구독이 취소되었습니다.</p>

    <div class="info-box">
      <p><strong>취소된 플랜:</strong> ${planDisplayName}</p>
      <p><strong>취소일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>

    <p>무료 플랜으로 전환되어 기본 기능은 계속 이용하실 수 있습니다.</p>

    <h3 style="margin-top: 24px; color: #4B5563;">무료 플랜에서 이용 가능한 기능</h3>
    <ul>
      <li>기본 운명 지도 분석 (월 7회)</li>
      <li>일일 운세 확인</li>
      <li>기본 타로 리딩</li>
    </ul>

    <p style="margin-top: 24px;">
      언제든 다시 구독하시면 모든 프리미엄 기능을 이용하실 수 있습니다.
    </p>

    <div class="button-wrapper">
      <a href="https://destinypal.me/pricing" class="button">플랜 다시 보기</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      서비스 개선을 위해 피드백을 남겨주시면 감사하겠습니다.
    </p>
  `
    : `
    <h2>Your Subscription Has Been Cancelled</h2>
    <p>${name}, your ${planDisplayName} plan subscription has been cancelled.</p>

    <div class="info-box">
      <p><strong>Cancelled Plan:</strong> ${planDisplayName}</p>
      <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
    </div>

    <p>You've been switched to the free plan and can continue using basic features.</p>

    <h3 style="margin-top: 24px; color: #4B5563;">Available on Free Plan</h3>
    <ul>
      <li>Basic Destiny Map Analysis (7 per month)</li>
      <li>Daily Fortune Check</li>
      <li>Basic Tarot Reading</li>
    </ul>

    <p style="margin-top: 24px;">
      You can resubscribe anytime to access all premium features.
    </p>

    <div class="button-wrapper">
      <a href="https://destinypal.me/pricing" class="button">View Plans</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      We'd appreciate your feedback to help us improve.
    </p>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo ? '구독이 취소되었습니다' : 'Your subscription has been cancelled',
    }),
  };
}
