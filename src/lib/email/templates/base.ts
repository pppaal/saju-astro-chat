import type { Locale } from '../types';

export interface BaseTemplateProps {
  locale: Locale;
  content: string;
  preheader?: string;
}

export function wrapInBaseTemplate({
  locale,
  content,
  preheader,
}: BaseTemplateProps): string {
  const isKo = locale === 'ko';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DestinyPal</title>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</span>` : ''}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f5f5f5;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      text-align: center;
      padding: 32px 24px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: rgba(255, 255, 255, 0.9);
      margin: 8px 0 0;
      font-size: 14px;
    }
    .content {
      padding: 32px 24px;
      line-height: 1.7;
      color: #374151;
    }
    .content h2 {
      color: #1F2937;
      margin: 0 0 16px;
      font-size: 22px;
    }
    .content p {
      margin: 0 0 16px;
    }
    .content ul {
      padding-left: 20px;
      margin: 16px 0;
    }
    .content li {
      margin: 8px 0;
    }
    .button-wrapper {
      text-align: center;
      padding: 24px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .info-box {
      background-color: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info-box p {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      padding: 24px;
      background-color: #F9FAFB;
      border-top: 1px solid #E5E7EB;
    }
    .footer p {
      margin: 4px 0;
      color: #6B7280;
      font-size: 12px;
    }
    .footer a {
      color: #8B5CF6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo">DestinyPal</h1>
        <p class="tagline">${isKo ? '당신의 운명을 안내합니다' : 'Your Destiny Guide'}</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>${isKo ? '이 이메일은 DestinyPal에서 발송되었습니다.' : 'This email was sent by DestinyPal.'}</p>
        <p><a href="https://destinypal.me">destinypal.me</a></p>
        <p style="margin-top: 12px; color: #9CA3AF;">
          ${isKo ? '더 이상 이메일을 받고 싶지 않으시면 계정 설정에서 알림을 해제하세요.' : 'To unsubscribe, update your notification settings in your account.'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
