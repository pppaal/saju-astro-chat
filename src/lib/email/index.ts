export {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
  sendSubscriptionConfirmEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
  sendReferralRewardEmail,
} from './emailService';

export type {
  EmailType,
  Locale,
  EmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from './types';
