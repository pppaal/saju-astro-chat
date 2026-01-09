// Type augmentation for Stripe SDK compatibility
// Addresses missing properties in Stripe types

import Stripe from 'stripe';

declare module 'stripe' {
  namespace Stripe {
    interface Invoice {
      payment_intent?: string | Stripe.PaymentIntent | null;
      subscription?: string | Stripe.Subscription | null;
    }

    interface Subscription {
      current_period_start: number;
      current_period_end: number;
    }
  }
}

// Helper types for webhook event objects
export type StripeSubscriptionEvent = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

export type StripeInvoiceEvent = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
  subscription?: string | Stripe.Subscription | null;
};
