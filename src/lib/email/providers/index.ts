import type { EmailProvider } from '../types';
import { ResendProvider } from './resendProvider';

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = process.env.EMAIL_PROVIDER || 'resend';

  switch (provider) {
    case 'resend':
      cachedProvider = new ResendProvider();
      break;
    // 추후 확장 가능
    // case 'sendgrid':
    //   cachedProvider = new SendGridProvider();
    //   break;
    // case 'nodemailer':
    //   cachedProvider = new NodemailerProvider();
    //   break;
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }

  return cachedProvider;
}

// 테스트용 provider 리셋
export function resetEmailProvider(): void {
  cachedProvider = null;
}
