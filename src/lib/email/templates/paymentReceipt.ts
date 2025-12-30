import type { PaymentReceiptTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function paymentReceiptTemplate(data: PaymentReceiptTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, amount, currency, productName, transactionId, locale } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');

  // Format amount (Stripe amounts are in cents/smallest unit)
  const formattedAmount = new Intl.NumberFormat(isKo ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const today = new Date().toLocaleDateString(isKo ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = isKo
    ? `DestinyPal 결제 완료 - ${formattedAmount}`
    : `DestinyPal Payment Receipt - ${formattedAmount}`;

  const content = isKo
    ? `
    <h2>결제가 완료되었습니다</h2>
    <p>${name}님, 결제해 주셔서 감사합니다.</p>

    <div class="info-box">
      <p><strong>상품:</strong> ${productName}</p>
      <p><strong>결제 금액:</strong> ${formattedAmount}</p>
      <p><strong>결제일:</strong> ${today}</p>
      ${transactionId ? `<p><strong>거래 번호:</strong> ${transactionId}</p>` : ''}
    </div>

    <p>크레딧이 즉시 계정에 추가되었습니다. 지금 바로 프리미엄 기능을 이용해보세요!</p>

    <div class="button-wrapper">
      <a href="https://destinypal.me/profile" class="button">내 계정 확인</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      결제 관련 문의사항이 있으시면 언제든 연락해 주세요.
    </p>
  `
    : `
    <h2>Payment Confirmed</h2>
    <p>Thank you for your purchase, ${name}.</p>

    <div class="info-box">
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>Amount:</strong> ${formattedAmount}</p>
      <p><strong>Date:</strong> ${today}</p>
      ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
    </div>

    <p>Your credits have been added to your account immediately. Start using premium features now!</p>

    <div class="button-wrapper">
      <a href="https://destinypal.me/profile" class="button">View My Account</a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      If you have any questions about this payment, please contact us.
    </p>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo ? '결제가 성공적으로 처리되었습니다' : 'Your payment was successful',
    }),
  };
}
