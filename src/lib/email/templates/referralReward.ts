import type { ReferralRewardTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function referralRewardTemplate(data: ReferralRewardTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, creditsAwarded, referredUserName, locale } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');

  const subject = isKo
    ? `축하합니다! ${creditsAwarded} 크레딧을 받았습니다`
    : `Congratulations! You earned ${creditsAwarded} credits`;

  const content = isKo
    ? `
    <h2>추천 보상이 지급되었습니다!</h2>
    <p>${name}님, 친구 추천 감사합니다!</p>

    <div class="info-box" style="background-color: #ECFDF5; border-left: 4px solid #10B981;">
      <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
        +${creditsAwarded} 크레딧
      </p>
      <p style="margin: 8px 0 0; color: #047857;">
        ${referredUserName ? `${referredUserName}님이 가입했습니다` : '새로운 친구가 가입했습니다'}
      </p>
    </div>

    <p>지급된 크레딧은 바로 사용 가능합니다!</p>

    <h3 style="margin-top: 24px; color: #4B5563;">더 많은 보상 받기</h3>
    <p>친구를 더 초대하면 추가 크레딧을 받을 수 있어요:</p>
    <ul>
      <li>친구가 가입하면 3 크레딧</li>
      <li>초대 횟수 무제한!</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/referral" class="button">친구 더 초대하기</a>
    </div>
  `
    : `
    <h2>Referral Reward Received!</h2>
    <p>${name}, thank you for spreading the word!</p>

    <div class="info-box" style="background-color: #ECFDF5; border-left: 4px solid #10B981;">
      <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
        +${creditsAwarded} Credits
      </p>
      <p style="margin: 8px 0 0; color: #047857;">
        ${referredUserName ? `${referredUserName} joined` : 'A new friend joined'}
      </p>
    </div>

    <p>Your credits are ready to use right now!</p>

    <h3 style="margin-top: 24px; color: #4B5563;">Earn More Rewards</h3>
    <p>Invite more friends and earn additional credits:</p>
    <ul>
      <li>3 credits when a friend signs up</li>
      <li>No limit on invitations!</li>
    </ul>

    <div class="button-wrapper">
      <a href="https://destinypal.me/referral" class="button">Invite More Friends</a>
    </div>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo
        ? `${creditsAwarded} 크레딧이 지급되었습니다`
        : `${creditsAwarded} credits have been added`,
    }),
  };
}
