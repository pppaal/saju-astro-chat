import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import type { EmailProvider, SendEmailOptions, SendEmailResult } from '../types';

export class ResendProvider implements EmailProvider {
  name = 'resend';
  private client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.client = new Resend(apiKey);
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const result = await this.client.emails.send({
        from: process.env.EMAIL_FROM || 'DestinyPal <noreply@destinypal.me>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        tags: options.tags?.map((t) => ({ name: t, value: 'true' })),
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      logger.error('[ResendProvider] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
