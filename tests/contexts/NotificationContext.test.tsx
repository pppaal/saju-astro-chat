/**
 * Tests for NotificationContext
 * src/contexts/NotificationContext.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  NotificationProvider,
  useNotifications,
  requestNotificationPermission,
  type Notification,
} from '@/contexts/NotificationContext';
import React from 'react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { email: 'test@example.com' } },
    status: 'authenticated',
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Toast
vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn(() => ({
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Wrapper component for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('NotificationProvider', () => {
    it('should provide context to children', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should load notifications from localStorage', () => {
      const storedNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: 'Welcome',
          message: 'Welcome to the app',
          read: false,
          createdAt: Date.now(),
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedNotifications));

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('notifications');
    });

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => {
        renderHook(() => useNotifications(), { wrapper });
      }).not.toThrow();
    });
  });

  describe('useNotifications', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNotifications());
      }).toThrow('useNotifications must be used within NotificationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('addNotification', () => {
    it('should add a notification', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.notifications.length).toBe(1);
      expect(result.current.notifications[0].title).toBe('Test');
      expect(result.current.notifications[0].read).toBe(false);
    });

    it('should generate unique id for notification', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test 1',
          message: 'Message 1',
        });
        result.current.addNotification({
          type: 'system',
          title: 'Test 2',
          message: 'Message 2',
        });
      });

      const ids = result.current.notifications.map(n => n.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('should increment unread count', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.unreadCount).toBe(0);

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test',
          message: 'Message',
        });
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('should limit notifications to 50', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        for (let i = 0; i < 55; i++) {
          result.current.addNotification({
            type: 'system',
            title: `Test ${i}`,
            message: `Message ${i}`,
          });
        }
      });

      expect(result.current.notifications.length).toBeLessThanOrEqual(50);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test',
          message: 'Message',
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markAsRead(notificationId);
      });

      expect(result.current.notifications[0].read).toBe(true);
    });

    it('should decrement unread count', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test',
          message: 'Message',
        });
      });

      expect(result.current.unreadCount).toBe(1);

      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('should not affect other notifications', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test 1',
          message: 'Message 1',
        });
        result.current.addNotification({
          type: 'system',
          title: 'Test 2',
          message: 'Message 2',
        });
      });

      const firstId = result.current.notifications.find(n => n.title === 'Test 1')?.id;

      act(() => {
        result.current.markAsRead(firstId!);
      });

      const unreadNotification = result.current.notifications.find(n => n.title === 'Test 2');
      expect(unreadNotification?.read).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test 1',
          message: 'Message 1',
        });
        result.current.addNotification({
          type: 'like',
          title: 'Test 2',
          message: 'Message 2',
        });
      });

      expect(result.current.unreadCount).toBe(2);

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
      result.current.notifications.forEach(n => {
        expect(n.read).toBe(true);
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification by id', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test',
          message: 'Message',
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.deleteNotification(notificationId);
      });

      expect(result.current.notifications.length).toBe(0);
    });

    it('should not affect other notifications', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test 1',
          message: 'Message 1',
        });
        result.current.addNotification({
          type: 'system',
          title: 'Test 2',
          message: 'Message 2',
        });
      });

      const firstNotification = result.current.notifications.find(n => n.title === 'Test 1');

      act(() => {
        result.current.deleteNotification(firstNotification!.id);
      });

      expect(result.current.notifications.length).toBe(1);
      expect(result.current.notifications[0].title).toBe('Test 2');
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: 'Test 1',
          message: 'Message 1',
        });
        result.current.addNotification({
          type: 'like',
          title: 'Test 2',
          message: 'Message 2',
        });
      });

      expect(result.current.notifications.length).toBe(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications.length).toBe(0);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('notification types', () => {
    it('should support all notification types', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      const types = ['like', 'comment', 'reply', 'mention', 'system'] as const;

      act(() => {
        types.forEach(type => {
          result.current.addNotification({
            type,
            title: `${type} notification`,
            message: `This is a ${type} notification`,
          });
        });
      });

      expect(result.current.notifications.length).toBe(5);
    });
  });
});

describe('requestNotificationPermission', () => {
  const originalNotification = global.Notification;

  afterEach(() => {
    // Restore original Notification
    if (originalNotification) {
      global.Notification = originalNotification;
    }
  });

  it('should return false if Notification is not supported', async () => {
    // @ts-expect-error - Testing unsupported scenario
    delete global.Notification;

    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('should return true if permission is already granted', async () => {
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('should return false if permission is denied', async () => {
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('should request permission if not determined', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');

    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });

    const result = await requestNotificationPermission();

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return false if permission request is denied', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('denied');

    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });

    const result = await requestNotificationPermission();

    expect(result).toBe(false);
  });
});
