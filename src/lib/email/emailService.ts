import { prisma } from '@/lib/db/prisma';
import { getEmailProvider } from './providers';
import type {
  EmailType,
  Locale,
  WelcomeTemplateData,
  PaymentReceiptTemplateData,
  SubscriptionTemplateData,
  ReferralRewardTemplateData,
} from './types';
import {
  welcomeTemplate,
  paymentReceiptTemplate,
  subscriptionConfirmTemplate,
  subscriptionCancelledTemplate,
  paymentFailedTemplate,
  referralRewardTemplate,
} from './templates';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type TemplateData =
  | WelcomeTemplateData
  | PaymentReceiptTemplateData
  | SubscriptionTemplateData
  | ReferralRewardTemplateData;

function getTemplate(
  type: EmailType,
  data: TemplateData
): { subject: string; html: string } | null {
  switch (type) {
    case 'welcome':
      return welcomeTemplate(data as WelcomeTemplateData);
    case 'payment_receipt':
      return paymentReceiptTemplate(data as PaymentReceiptTemplateData);
    case 'subscription_confirm':
      return subscriptionConfirmTemplate(data as SubscriptionTemplateData);
    case 'subscription_cancelled':
      return subscriptionCancelledTemplate(data as SubscriptionTemplateData);
    case 'payment_failed':
      return paymentFailedTemplate(data as SubscriptionTemplateData);
    case 'referral_reward':
      return referralRewardTemplate(data as ReferralRewardTemplateData);
    default:
      return null;
  }
}

export async function sendEmail(
  type: EmailType,
  to: string,
  data: TemplateData,
  userId?: string
): Promise<SendEmailResult> {
  // Check if email is configured
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.warn('[sendEmail] No email provider configured, skipping email');
    return { success: false, error: 'Email provider not configured' };
  }

  const template = getTemplate(type, data);
  if (!template) {
    return { success: false, error: `Unknown email type: ${type}` };
  }

  let result: SendEmailResult;
  let providerName = 'unknown';

  try {
    const provider = getEmailProvider();
    providerName = provider.name;

    result = await provider.send({
      to,
      subject: template.subject,
      html: template.html,
      tags: [type],
    });
  } catch (error) {
    console.error('[sendEmail] Provider error:', error);
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Log email to database (fire and forget)
  try {
    await prisma.emailLog.create({
      data: {
        userId,
        email: to,
        type,
        subject: template.subject,
        status: result.success ? 'sent' : 'failed',
        errorMsg: result.error,
        provider: providerName,
        messageId: result.messageId,
      },
    });
  } catch (logError) {
    console.error('[sendEmail] Failed to log email:', logError);
  }

  return result;
}

// Convenience functions

export async function sendWelcomeEmail(
  userId: string,
  email: string,
  name: string,
  locale: Locale = 'ko',
  referralCode?: string
): Promise<SendEmailResult> {
  return sendEmail(
    'welcome',
    email,
    { userName: name || undefined, locale, referralCode },
    userId
  );
}

export async function sendPaymentReceiptEmail(
  userId: string,
  email: string,
  data: {
    userName?: string;
    amount: number;
    currency: string;
    productName: string;
    transactionId?: string;
    locale?: Locale;
  }
): Promise<SendEmailResult> {
  return sendEmail(
    'payment_receipt',
    email,
    {
      userName: data.userName,
      amount: data.amount,
      currency: data.currency,
      productName: data.productName,
      transactionId: data.transactionId,
      locale: data.locale || 'ko',
    },
    userId
  );
}

export async function sendSubscriptionConfirmEmail(
  userId: string,
  email: string,
  data: {
    userName?: string;
    planName: string;
    billingCycle?: string;
    nextBillingDate?: string;
    locale?: Locale;
  }
): Promise<SendEmailResult> {
  return sendEmail(
    'subscription_confirm',
    email,
    {
      userName: data.userName,
      planName: data.planName,
      billingCycle: data.billingCycle,
      nextBillingDate: data.nextBillingDate,
      locale: data.locale || 'ko',
    },
    userId
  );
}

export async function sendSubscriptionCancelledEmail(
  userId: string,
  email: string,
  data: {
    userName?: string;
    planName: string;
    locale?: Locale;
  }
): Promise<SendEmailResult> {
  return sendEmail(
    'subscription_cancelled',
    email,
    {
      userName: data.userName,
      planName: data.planName,
      locale: data.locale || 'ko',
    },
    userId
  );
}

export async function sendPaymentFailedEmail(
  userId: string,
  email: string,
  data: {
    userName?: string;
    planName: string;
    locale?: Locale;
  }
): Promise<SendEmailResult> {
  return sendEmail(
    'payment_failed',
    email,
    {
      userName: data.userName,
      planName: data.planName,
      locale: data.locale || 'ko',
    },
    userId
  );
}

export async function sendReferralRewardEmail(
  userId: string,
  email: string,
  data: {
    userName?: string;
    creditsAwarded: number;
    referredUserName?: string;
    locale?: Locale;
  }
): Promise<SendEmailResult> {
  return sendEmail(
    'referral_reward',
    email,
    {
      userName: data.userName,
      creditsAwarded: data.creditsAwarded,
      referredUserName: data.referredUserName,
      locale: data.locale || 'ko',
    },
    userId
  );
}
