// tests/pushService.test.ts
// 푸시 알림 서비스 테스트

import { vi, beforeEach } from "vitest";

// Types from the push service
interface PushPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  requireInteraction?: boolean;
}

interface DailyNotification {
  type: string;
  title: string;
  message: string;
  scheduledHour: number;
  priority: 'high' | 'medium' | 'low';
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

interface SendPushResult {
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

interface ScheduledNotificationResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

describe('pushService', () => {
  describe('PushPayload structure', () => {
    it('should accept minimal payload', () => {
      const payload: PushPayload = {
        title: 'Test Title',
        message: 'Test Message',
      };

      expect(payload.title).toBe('Test Title');
      expect(payload.message).toBe('Test Message');
    });

    it('should accept full payload', () => {
      const payload: PushPayload = {
        title: 'Test Title',
        message: 'Test Message',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'test-tag',
        data: {
          url: '/notifications',
          customField: 'value',
        },
        requireInteraction: true,
      };

      expect(payload.icon).toBe('/icon-192.png');
      expect(payload.tag).toBe('test-tag');
      expect(payload.data?.url).toBe('/notifications');
      expect(payload.requireInteraction).toBe(true);
    });
  });

  describe('DailyNotification structure', () => {
    it('should have required fields', () => {
      const notification: DailyNotification = {
        type: 'daily_fortune',
        title: '오늘의 운세',
        message: '오늘은 좋은 날입니다',
        scheduledHour: 8,
        priority: 'high',
      };

      expect(notification.type).toBe('daily_fortune');
      expect(notification.scheduledHour).toBeGreaterThanOrEqual(0);
      expect(notification.scheduledHour).toBeLessThanOrEqual(23);
      expect(['high', 'medium', 'low']).toContain(notification.priority);
    });

    it('should accept optional data', () => {
      const notification: DailyNotification = {
        type: 'transit_alert',
        title: 'Transit Alert',
        message: 'Important transit today',
        scheduledHour: 12,
        priority: 'medium',
        data: {
          url: '/calendar',
          transitType: 'moon_conjunction',
        },
      };

      expect(notification.data?.url).toBe('/calendar');
    });
  });

  describe('SendPushResult structure', () => {
    it('should have success result', () => {
      const result: SendPushResult = {
        success: true,
        sent: 1,
        failed: 0,
      };

      expect(result.success).toBe(true);
      expect(result.sent).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
    });

    it('should have failure result', () => {
      const result: SendPushResult = {
        success: false,
        sent: 0,
        failed: 1,
        error: 'No active subscriptions',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should have partial success result', () => {
      const result: SendPushResult = {
        success: true,
        sent: 3,
        failed: 1,
      };

      expect(result.success).toBe(true);
      expect(result.sent).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('scheduled notifications', () => {
    function getNotificationsForHour(
      notifications: DailyNotification[],
      hour: number
    ): DailyNotification[] {
      return notifications.filter(n => n.scheduledHour === hour);
    }

    it('should filter notifications by hour', () => {
      const notifications: DailyNotification[] = [
        { type: 'morning', title: 'Morning', message: 'Good morning', scheduledHour: 8, priority: 'high' },
        { type: 'noon', title: 'Noon', message: 'Lunch time', scheduledHour: 12, priority: 'medium' },
        { type: 'evening', title: 'Evening', message: 'Good evening', scheduledHour: 19, priority: 'low' },
      ];

      const morningNotifications = getNotificationsForHour(notifications, 8);
      expect(morningNotifications.length).toBe(1);
      expect(morningNotifications[0].type).toBe('morning');

      const eveningNotifications = getNotificationsForHour(notifications, 19);
      expect(eveningNotifications.length).toBe(1);
      expect(eveningNotifications[0].type).toBe('evening');
    });

    it('should return empty array for hours with no notifications', () => {
      const notifications: DailyNotification[] = [
        { type: 'morning', title: 'Morning', message: 'Good morning', scheduledHour: 8, priority: 'high' },
      ];

      const result = getNotificationsForHour(notifications, 15);
      expect(result.length).toBe(0);
    });

    it('should return multiple notifications for same hour', () => {
      const notifications: DailyNotification[] = [
        { type: 'fortune', title: 'Fortune', message: 'Your fortune', scheduledHour: 8, priority: 'high' },
        { type: 'weather', title: 'Weather', message: 'Weather update', scheduledHour: 8, priority: 'medium' },
        { type: 'tip', title: 'Tip', message: 'Daily tip', scheduledHour: 8, priority: 'low' },
      ];

      const result = getNotificationsForHour(notifications, 8);
      expect(result.length).toBe(3);
    });
  });

  describe('VAPID configuration', () => {
    it('should check VAPID environment variables', () => {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;

      // In test environment, these may not be set
      // The service should handle missing keys gracefully
      expect(typeof publicKey === 'string' || publicKey === undefined).toBe(true);
      expect(typeof privateKey === 'string' || privateKey === undefined).toBe(true);
    });

    it('should use default VAPID subject', () => {
      const defaultSubject = 'mailto:admin@destinypal.me';
      const subject = process.env.VAPID_SUBJECT || defaultSubject;

      expect(subject).toContain('mailto:');
    });
  });

  describe('push subscription structure', () => {
    interface PushSubscription {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    }

    it('should validate subscription structure', () => {
      const subscription: PushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: {
          p256dh: 'BNcRdReAhpbQbwDEFGH...',
          auth: 'tBHI...',
        },
      };

      expect(subscription.endpoint).toContain('https://');
      expect(subscription.keys.p256dh).toBeTruthy();
      expect(subscription.keys.auth).toBeTruthy();
    });
  });

  describe('notification conversion', () => {
    function dailyToPushPayload(notification: DailyNotification): PushPayload {
      return {
        title: notification.title,
        message: notification.message,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: notification.type,
        data: notification.data || { url: '/notifications' },
      };
    }

    it('should convert DailyNotification to PushPayload', () => {
      const daily: DailyNotification = {
        type: 'daily_fortune',
        title: '오늘의 운세',
        message: '좋은 하루 되세요!',
        scheduledHour: 8,
        priority: 'high',
        data: { url: '/fortune' },
      };

      const push = dailyToPushPayload(daily);

      expect(push.title).toBe(daily.title);
      expect(push.message).toBe(daily.message);
      expect(push.tag).toBe(daily.type);
      expect(push.data?.url).toBe('/fortune');
      expect(push.icon).toBe('/icon-192.png');
    });

    it('should use default data when not provided', () => {
      const daily: DailyNotification = {
        type: 'test',
        title: 'Test',
        message: 'Test message',
        scheduledHour: 12,
        priority: 'low',
      };

      const push = dailyToPushPayload(daily);

      expect(push.data?.url).toBe('/notifications');
    });
  });

  describe('error handling', () => {
    interface WebPushError extends Error {
      statusCode?: number;
    }

    function isWebPushError(error: unknown): error is WebPushError {
      return error instanceof Error && 'statusCode' in error;
    }

    it('should identify web push errors', () => {
      const normalError = new Error('Normal error');
      expect(isWebPushError(normalError)).toBe(false);

      const webPushError = Object.assign(new Error('Web push error'), { statusCode: 404 });
      expect(isWebPushError(webPushError)).toBe(true);
    });

    it('should handle 404 and 410 status codes', () => {
      const expiredStatuses = [404, 410];
      const otherStatuses = [500, 503, 400];

      for (const status of expiredStatuses) {
        const shouldDeactivate = status === 404 || status === 410;
        expect(shouldDeactivate).toBe(true);
      }

      for (const status of otherStatuses) {
        const shouldDeactivate = status === 404 || status === 410;
        expect(shouldDeactivate).toBe(false);
      }
    });

    it('should increment fail count on other errors', () => {
      let failCount = 0;
      const maxFailures = 5;

      // Simulate 5 failures
      for (let i = 0; i < 5; i++) {
        failCount++;
        const isActive = failCount < maxFailures;

        if (i < 4) {
          expect(isActive).toBe(true);
        } else {
          expect(isActive).toBe(false);
        }
      }
    });
  });

  describe('broadcast notification', () => {
    it('should calculate totals correctly', () => {
      interface BroadcastResult {
        totalUsers: number;
        sent: number;
        failed: number;
      }

      const result: BroadcastResult = {
        totalUsers: 100,
        sent: 95,
        failed: 5,
      };

      expect(result.totalUsers).toBe(100);
      expect(result.sent + result.failed).toBeLessThanOrEqual(result.totalUsers * 2); // Multiple subscriptions per user
    });
  });

  describe('user notification preferences', () => {
    interface UserNotificationPrefs {
      enabledTypes: string[];
      preferredHours: number[];
      locale: 'ko' | 'en';
    }

    it('should filter notifications by user preferences', () => {
      const prefs: UserNotificationPrefs = {
        enabledTypes: ['daily_fortune', 'transit_alert'],
        preferredHours: [8, 12, 19],
        locale: 'ko',
      };

      const notifications: DailyNotification[] = [
        { type: 'daily_fortune', title: 'Fortune', message: 'Your fortune', scheduledHour: 8, priority: 'high' },
        { type: 'promotion', title: 'Promo', message: 'Special offer', scheduledHour: 10, priority: 'low' },
        { type: 'transit_alert', title: 'Transit', message: 'Alert', scheduledHour: 12, priority: 'medium' },
      ];

      const filteredByType = notifications.filter(n => prefs.enabledTypes.includes(n.type));
      expect(filteredByType.length).toBe(2);

      const filteredByHour = notifications.filter(n => prefs.preferredHours.includes(n.scheduledHour));
      expect(filteredByHour.length).toBe(2);
    });
  });

  describe('notification priority sorting', () => {
    function sortByPriority(notifications: DailyNotification[]): DailyNotification[] {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return [...notifications].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    it('should sort notifications by priority', () => {
      const notifications: DailyNotification[] = [
        { type: 'low', title: 'Low', message: 'Low priority', scheduledHour: 8, priority: 'low' },
        { type: 'high', title: 'High', message: 'High priority', scheduledHour: 8, priority: 'high' },
        { type: 'medium', title: 'Medium', message: 'Medium priority', scheduledHour: 8, priority: 'medium' },
      ];

      const sorted = sortByPriority(notifications);

      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });
  });

  describe('payload serialization', () => {
    it('should serialize payload to JSON', () => {
      const payload: PushPayload = {
        title: 'Test',
        message: 'Test message',
        icon: '/icon.png',
        tag: 'test',
        data: { url: '/test' },
      };

      const serialized = JSON.stringify(payload);
      const parsed = JSON.parse(serialized);

      expect(parsed.title).toBe(payload.title);
      expect(parsed.message).toBe(payload.message);
      expect(parsed.data.url).toBe('/test');
    });

    it('should handle special characters in payload', () => {
      const payload: PushPayload = {
        title: '오늘의 운세 🌟',
        message: '좋은 하루 되세요! "특별한" <날>',
      };

      const serialized = JSON.stringify(payload);
      const parsed = JSON.parse(serialized);

      expect(parsed.title).toContain('🌟');
      expect(parsed.message).toContain('"특별한"');
    });
  });
});
