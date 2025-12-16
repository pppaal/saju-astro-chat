/**
 * Email Notification Service
 *
 * Supports multiple email providers:
 * - Resend (recommended, modern API)
 * - SendGrid (popular, reliable)
 * - Nodemailer (self-hosted SMTP)
 *
 * Installation:
 * npm install resend
 * OR
 * npm install @sendgrid/mail
 * OR
 * npm install nodemailer
 */

export type EmailProvider = "resend" | "sendgrid" | "nodemailer";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface NotificationEmailData {
  userName: string;
  notifications: Array<{
    type: string;
    title: string;
    message: string;
    link: string;
    createdAt: number;
  }>;
  unreadCount: number;
}

/**
 * Send email using Resend (recommended)
 * https://resend.com/docs
 */
async function sendWithResend(options: EmailOptions): Promise<boolean> {
  try {
    // @ts-ignore - resend is an optional dependency
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || "DestinyPal <noreply@destinypal.com>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("Resend error:", error);
      return false;
    }

    console.log("Email sent via Resend:", data?.id);
    return true;
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    return false;
  }
}

/**
 * Send email using SendGrid
 * https://docs.sendgrid.com/for-developers/sending-email/api-getting-started
 */
async function sendWithSendGrid(options: EmailOptions): Promise<boolean> {
  try {
    // @ts-ignore - @sendgrid/mail is an optional dependency
    const sgMailModule = await import("@sendgrid/mail");
    const sgMail = sgMailModule.default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || "noreply@destinypal.com",
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    };

    await sgMail.send(msg);
    console.log("Email sent via SendGrid");
    return true;
  } catch (error) {
    console.error("Error sending email with SendGrid:", error);
    return false;
  }
}

/**
 * Send email using Nodemailer (SMTP)
 * https://nodemailer.com/
 */
async function sendWithNodemailer(options: EmailOptions): Promise<boolean> {
  try {
    // @ts-ignore - nodemailer is an optional dependency
    const nodemailerModule = await import("nodemailer");
    const nodemailer = nodemailerModule.default;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: options.from || process.env.EMAIL_FROM || "noreply@destinypal.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    console.log("Email sent via Nodemailer:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email with Nodemailer:", error);
    return false;
  }
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = (process.env.EMAIL_PROVIDER || "none") as EmailProvider | "none";

  if (provider === "none") {
    console.warn("[email] EMAIL_PROVIDER=none, skipping send");
    return false;
  }

  switch (provider) {
    case "resend":
      return sendWithResend(options);
    case "sendgrid":
      return sendWithSendGrid(options);
    case "nodemailer":
      return sendWithNodemailer(options);
    default:
      console.error(`Unknown email provider: ${provider}`);
      return false;
  }
}

/**
 * Send notification digest email
 */
export async function sendNotificationDigest(
  email: string,
  data: NotificationEmailData
): Promise<boolean> {
  const html = generateNotificationDigestHTML(data);

  return sendEmail({
    to: email,
    subject: `You have ${data.unreadCount} new notification${data.unreadCount > 1 ? "s" : ""}`,
    html,
  });
}

/**
 * Send single notification email
 */
export async function sendNotificationEmail(
  email: string,
  notification: {
    type: string;
    title: string;
    message: string;
    link: string;
  }
): Promise<boolean> {
  const html = generateNotificationHTML(notification);

  return sendEmail({
    to: email,
    subject: notification.title,
    html,
  });
}

/**
 * Generate HTML for notification digest
 */
function generateNotificationDigestHTML(data: NotificationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

  const notificationRows = data.notifications
    .map((notif) => {
      const icon = getNotificationIcon(notif.type);
      const date = new Date(notif.createdAt).toLocaleDateString();

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 16px 0;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="font-size: 24px;">${icon}</div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827;">
                  ${notif.title}
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                  ${notif.message}
                </p>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <a href="${baseUrl}${notif.link}"
                     style="display: inline-block; padding: 6px 16px; background: #7c5cff; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    View
                  </a>
                  <span style="font-size: 12px; color: #9ca3af;">${date}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Notifications</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c5cff 0%, #6b4fd8 100%); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 800;">
            DestinyPal Notifications
          </h1>
          <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
            You have ${data.unreadCount} new notification${data.unreadCount > 1 ? "s" : ""}
          </p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
            Hi ${data.userName},
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            ${notificationRows}
          </table>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="${baseUrl}/notifications"
               style="display: inline-block; padding: 12px 32px; background: #7c5cff; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
              View All Notifications
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 24px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
            You're receiving this email because you have notifications enabled.
          </p>
          <a href="${baseUrl}/settings/notifications" style="color: #7c5cff; text-decoration: none; font-size: 14px;">
            Manage notification preferences
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for single notification
 */
function generateNotificationHTML(notification: {
  type: string;
  title: string;
  message: string;
  link: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";
  const icon = getNotificationIcon(notification.type);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">
              ${notification.title}
            </h2>
          </div>

          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            ${notification.message}
          </p>

          <div style="text-align: center;">
            <a href="${baseUrl}${notification.link}"
               style="display: inline-block; padding: 12px 32px; background: #7c5cff; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
              View Details
            </a>
          </div>
        </div>

        <div style="margin-top: 24px; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            <a href="${baseUrl}/settings/notifications" style="color: #7c5cff; text-decoration: none;">
              Manage notification preferences
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get emoji icon for notification type
 */
function getNotificationIcon(type: string): string {
  switch (type) {
    case "like":
      return "❤️";
    case "comment":
      return "💬";
    case "reply":
      return "↩️";
    case "mention":
      return "📢";
    case "system":
      return "🔔";
    default:
      return "🔔";
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to DestinyPal</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c5cff 0%, #6b4fd8 100%); padding: 48px 32px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0 0 16px 0; color: white; font-size: 36px; font-weight: 800;">
            Welcome to DestinyPal!
          </h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; line-height: 1.6;">
            We're excited to help you chart the cosmos and navigate your destiny
          </p>
        </div>

        <div style="background: white; padding: 32px; margin-top: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
            Hi ${userName},
          </p>

          <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6;">
            Thank you for joining DestinyPal! You now have access to AI-powered astrology, Saju, Tarot, and I Ching readings.
          </p>

          <div style="margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 8px;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #111827;">
              Get Started
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
              <li>Generate your personalized Destiny Map</li>
              <li>Explore your birth chart with AI insights</li>
              <li>Draw Tarot cards for guidance</li>
              <li>Check your Saju (사주) fortune</li>
              <li>Join our community and share experiences</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="${baseUrl}"
               style="display: inline-block; padding: 14px 40px; background: #7c5cff; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Start Exploring
            </a>
          </div>
        </div>

        <div style="margin-top: 24px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
            Need help? Check out our <a href="${baseUrl}/about" style="color: #7c5cff; text-decoration: none;">About page</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to DestinyPal!",
    html,
  });
}
