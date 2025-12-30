import type { WelcomeTemplateData } from '../types';
import { wrapInBaseTemplate } from './base';

export function welcomeTemplate(data: WelcomeTemplateData): {
  subject: string;
  html: string;
} {
  const { userName, locale, referralCode } = data;
  const isKo = locale === 'ko';
  const name = userName || (isKo ? '회원' : 'Member');

  const subject = isKo
    ? `${name}님, DestinyPal에 오신 것을 환영합니다!`
    : `Welcome to DestinyPal, ${name}!`;

  const content = isKo
    ? `
    <h2>${name}님, 환영합니다!</h2>
    <p>DestinyPal에 가입해 주셔서 감사합니다.</p>
    <p>이제 동양과 서양의 지혜를 AI가 통합 분석한 개인화된 운명 해석을 받아보실 수 있습니다.</p>

    <h3 style="margin-top: 24px; color: #4B5563;">시작하기</h3>
    <ul>
      <li><strong>운명 지도</strong> - 사주와 점성술을 통합한 종합 분석</li>
      <li><strong>운세 캘린더</strong> - 매일의 운세를 한눈에 확인</li>
      <li><strong>타로 리딩</strong> - AI가 해석하는 심층 타로 카드</li>
      <li><strong>꿈 해몽</strong> - 당신의 꿈이 전하는 메시지</li>
    </ul>

    ${
      referralCode
        ? `
    <div class="info-box">
      <p><strong>나의 추천 코드:</strong> ${referralCode}</p>
      <p style="font-size: 14px; color: #6B7280;">친구를 초대하면 크레딧을 받을 수 있어요!</p>
    </div>
    `
        : ''
    }

    <div class="button-wrapper">
      <a href="https://destinypal.me/destiny-map" class="button">운명 지도 시작하기</a>
    </div>
  `
    : `
    <h2>Welcome, ${name}!</h2>
    <p>Thank you for joining DestinyPal.</p>
    <p>You now have access to personalized destiny readings powered by AI, combining Eastern and Western wisdom.</p>

    <h3 style="margin-top: 24px; color: #4B5563;">Getting Started</h3>
    <ul>
      <li><strong>Destiny Map</strong> - Comprehensive analysis combining Saju and Astrology</li>
      <li><strong>Fortune Calendar</strong> - Check your daily fortune at a glance</li>
      <li><strong>Tarot Reading</strong> - Deep AI-interpreted tarot cards</li>
      <li><strong>Dream Interpretation</strong> - Messages from your dreams</li>
    </ul>

    ${
      referralCode
        ? `
    <div class="info-box">
      <p><strong>Your Referral Code:</strong> ${referralCode}</p>
      <p style="font-size: 14px; color: #6B7280;">Invite friends and earn credits!</p>
    </div>
    `
        : ''
    }

    <div class="button-wrapper">
      <a href="https://destinypal.me/destiny-map" class="button">Start Your Destiny Map</a>
    </div>
  `;

  return {
    subject,
    html: wrapInBaseTemplate({
      locale,
      content,
      preheader: isKo ? '운명의 여정을 시작하세요' : 'Begin your destiny journey',
    }),
  };
}
