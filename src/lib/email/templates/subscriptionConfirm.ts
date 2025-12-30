import type { SubscriptionTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function subscriptionConfirmTemplate(data: SubscriptionTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, planName, billingCycle, nextBillingDate, locale } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');

  const cycleText = isKo
    ? billingCycle === 'annual'
      ? '연간'
      : '월간'
    : billingCycle === 'annual'
      ? 'Annual'
      : 'Monthly';

  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const subject = isKo
    ? `DestinyPal ${planDisplayName} 플랜 구독 시작`
    : `DestinyPal ${planDisplayName} Plan Subscription Started`;

  const content = isKo
    ? `
    <h2>구독이 시작되었습니다!</h2>
    <p>${name}님, ${planDisplayName} 플랜 구독을 환영합니다.</p>

    <div class="info-box">
      <p><strong>플랜:</strong> ${planDisplayName}</p>
      <p><strong>결제 주기:</strong> ${cycleText}</p>
      <p><strong>시작일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
      ${nextBillingDate ? `<p><strong>다음 결제일:</strong> ${nextBillingDate}</p>` : ''}
    </div>

    <h3 style="margin-top: 24px; color: #4B5563;">이제 사용 가능한 기능</h3>
    <ul>
      <li>무제한 운명 지도 분석</li>
      <li>상담사 AI와 깊이 있는 대화</li>
      <li>프리미엄 타로 스프레드</li>
      <li>상담 기록 무제한 저장</li>
      <li>광고 없는 깔끔한 환경</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/destiny-map/counselor" class="button">상담사와 대화하기</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      구독은 언제든지 계정 설정에서 관리하실 수 있습니다.
    </p>
  `
    : `
    <h2>Your Subscription Has Started!</h2>
    <p>Welcome to the ${planDisplayName} plan, ${name}.</p>

    <div class="info-box">
      <p><strong>Plan:</strong> ${planDisplayName}</p>
      <p><strong>Billing:</strong> ${cycleText}</p>
      <p><strong>Start Date:</strong> ${new Date().toLocaleDateString('en-US')}</p>
      ${nextBillingDate ? `<p><strong>Next Billing Date:</strong> ${nextBillingDate}</p>` : ''}
    </div>

    <h3 style="margin-top: 24px; color: #4B5563;">Features Now Available</h3>
    <ul>
      <li>Unlimited Destiny Map Analysis</li>
      <li>Deep Counselor AI Conversations</li>
      <li>Premium Tarot Spreads</li>
      <li>Unlimited Consultation History</li>
      <li>Ad-free Experience</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/destiny-map/counselor" class="button">Chat with Counselor</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      You can manage your subscription anytime in your account settings.
    </p>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo
        ? '프리미엄 기능을 사용할 수 있습니다'
        : 'Premium features are now available',
    }),
  };
}
