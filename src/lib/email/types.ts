export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailType =
  | 'welcome'
  | 'payment_receipt'
  | 'subscription_confirm'
  | 'subscription_renewal'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'referral_reward';

export type Locale = 'ko' | 'en';

export interface BaseTemplateData {
  userName?: string;
  locale: Locale;
}

export interface WelcomeTemplateData extends BaseTemplateData {
  referralCode?: string;
}

export interface PaymentReceiptTemplateData extends BaseTemplateData {
  amount: number;
  currency: string;
  productName: string;
  transactionId?: string;
}

export interface SubscriptionTemplateData extends BaseTemplateData {
  planName: string;
  billingCycle?: string;
  nextBillingDate?: string;
}

export interface ReferralRewardTemplateData extends BaseTemplateData {
  creditsAwarded: number;
  referredUserName?: string;
}
