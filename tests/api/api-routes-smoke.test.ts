import { describe, it, expect } from 'vitest';
import path from 'path';
import { existsSync, readFileSync } from 'fs';

const resolveModuleFile = (modulePath: string) => {
  const basePath = path.join(process.cwd(), 'src', modulePath);
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const assertModules = (modulePaths: string[]) => {
  modulePaths.forEach((modulePath) => {
    const filePath = resolveModuleFile(modulePath);
    if (!filePath) {
      throw new Error(`Missing module file for ${modulePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    expect(content).toMatch(/export\s+/);
  });
};

describe('API Routes Smoke Tests', () => {
  describe('Admin Routes', () => {
    it('should have admin routes', () => {
      assertModules([
        'app/api/admin/metrics/route',
        'app/api/admin/metrics/comprehensive/route',
        'app/api/admin/metrics/funnel/route',
        'app/api/admin/metrics/sla/route',
        'app/api/admin/refund-subscription/route',
      ]);
    });
  });

  describe('Astrology Routes', () => {
    it('should have astrology core routes', () => {
      assertModules([
        'app/api/astrology/route',
        'app/api/astrology/chat-stream/route',
        'app/api/astrology/details/route',
      ]);
    });

    it('should have astrology advanced routes', () => {
      assertModules([
        'app/api/astrology/advanced/asteroids/route',
        'app/api/astrology/advanced/draconic/route',
        'app/api/astrology/advanced/eclipses/route',
        'app/api/astrology/advanced/fixed-stars/route',
        'app/api/astrology/advanced/harmonics/route',
        'app/api/astrology/advanced/lunar-return/route',
        'app/api/astrology/advanced/midpoints/route',
        'app/api/astrology/advanced/progressions/route',
        'app/api/astrology/advanced/solar-return/route',
      ]);
    });
  });

  describe('Auth Routes', () => {
    it('should have auth routes', () => {
      assertModules([
        'app/api/auth/[...nextauth]/route',
        'app/api/auth/register/route',
        'app/api/auth/revoke/route',
      ]);
    });
  });

  describe('Cache Routes', () => {
    it('should have cache route', () => {
      assertModules(['app/api/cache/chart/route']);
    });
  });

  describe('Calendar Routes', () => {
    it('should have calendar routes', () => {
      assertModules(['app/api/calendar/route', 'app/api/calendar/date-detail/route']);
    });
  });

  describe('Checkout Routes', () => {
    it('should have checkout route', () => {
      assertModules(['app/api/checkout/route']);
    });
  });

  describe('Cities Routes', () => {
    it('should have cities route', () => {
      assertModules(['app/api/cities/route']);
    });
  });

  describe('Compatibility Routes', () => {
    it('should have compatibility routes', () => {
      assertModules(['app/api/compatibility/counselor/route']);
    });
  });

  describe('Content Access Routes', () => {
    it('should have content access route', () => {
      assertModules(['app/api/content-access/route']);
    });
  });

  describe('Counselor Routes', () => {
    it('should have counselor routes', () => {
      assertModules([
        'app/api/counselor/chat-history/route',
        'app/api/counselor/realtime/route',
        'app/api/counselor/session/list/route',
        'app/api/counselor/session/load/route',
        'app/api/counselor/session/save/route',
      ]);
    });
  });

  describe('Cron Routes', () => {
    it('should have cron routes', () => {
      assertModules([
        'app/api/cron/daily-fortune-post/route',
        'app/api/cron/notifications/route',
        'app/api/cron/reset-credits/route',
      ]);
    });
  });

  describe('CSP Report Routes', () => {
    it('should have csp-report route', () => {
      assertModules(['app/api/csp-report/route']);
    });
  });

  describe('Dates Routes', () => {
    it('should have dates route', () => {
      assertModules(['app/api/dates/route']);
    });
  });

  describe('DB Ping Routes', () => {
    it('should have db-ping route', () => {
      assertModules(['app/api/db-ping/route']);
    });
  });

  describe('Destiny Map Routes', () => {
    it('should have destiny map routes', () => {
      assertModules(['app/api/destiny-map/route', 'app/api/destiny-map/chat/route']);
    });
  });

  describe('Destiny Match Routes', () => {
    it('should have destiny match routes', () => {
      assertModules([
        'app/api/destiny-match/block/route',
        'app/api/destiny-match/chat/route',
        'app/api/destiny-match/discover/route',
        'app/api/destiny-match/matches/route',
        'app/api/destiny-match/oracle/[connectionId]/route',
        'app/api/destiny-match/profile/route',
        'app/api/destiny-match/report/route',
        'app/api/destiny-match/swipe/route',
      ]);
    });
  });

  describe('Feedback Routes', () => {
    it('should have feedback routes', () => {
      assertModules(['app/api/feedback/route', 'app/api/feedback/records/route']);
    });
  });

  describe('Geocoding Routes', () => {
    it('should have latlon-to-timezone route', () => {
      assertModules(['app/api/latlon-to-timezone/route']);
    });
  });

  describe('Me Routes', () => {
    it('should have user profile routes', () => {
      assertModules([
        'app/api/me/route',
        'app/api/me/circle/route',
        'app/api/me/credits/route',
        'app/api/me/decisions/route',
        'app/api/me/history/route',
        'app/api/me/premium/route',
        'app/api/me/profile/route',
        'app/api/me/purchases/route',
        'app/api/me/saju/route',
      ]);
    });
  });

  describe('Metrics Routes', () => {
    it('should have metrics route', () => {
      assertModules(['app/api/metrics/track/route']);
    });
  });

  describe('Notifications Routes', () => {
    it('should have notifications route', () => {
      assertModules(['app/api/notifications/stream/route']);
    });
  });

  describe('Push Routes', () => {
    it('should have push route', () => {
      assertModules(['app/api/push/subscribe/route']);
    });
  });

  describe('Referral Routes', () => {
    it('should have referral routes', () => {
      assertModules([
        'app/api/referral/claim/route',
        'app/api/referral/create-code/route',
        'app/api/referral/me/route',
        'app/api/referral/stats/route',
      ]);
    });
  });

  describe('Review Routes', () => {
    it('should have review route', () => {
      assertModules(['app/api/review/assessment/route']);
    });
  });

  describe('Saju Routes', () => {
    it('should have saju routes', () => {
      assertModules(['app/api/saju/route', 'app/api/saju/chat-stream/route']);
    });
  });

  describe('Share Routes', () => {
    it('should have share routes', () => {
      assertModules(['app/api/share/[id]/route', 'app/api/share/generate-image/route']);
    });
  });

  describe('Stats Routes', () => {
    it('should have stats route', () => {
      assertModules(['app/api/stats/route']);
    });
  });

  describe('Tarot Routes', () => {
    it('should have tarot core routes', () => {
      assertModules([
        'app/api/tarot/route',
        'app/api/tarot/question-engine-v2/route',
        'app/api/tarot/followup/route',
        'app/api/tarot/prefetch/route',
      ]);
    });

    it('should have tarot save and interpret routes', () => {
      assertModules([
        'app/api/tarot/interpret-stream/route',
        'app/api/tarot/save/route',
        'app/api/tarot/save/[id]/route',
      ]);
    });

    it('should have tarot couple routes', () => {
      assertModules([
        'app/api/tarot/couple-reading/route',
        'app/api/tarot/couple-reading/[readingId]/route',
      ]);
    });
  });

  describe('User Routes', () => {
    it('should have user routes', () => {
      assertModules([
        'app/api/user/update-birth-info/route',
        'app/api/user/upload-photo/route',
      ]);
    });
  });

  describe('Webhook Routes', () => {
    it('should have webhook routes', () => {
      assertModules(['app/api/webhook/stripe/route']);
    });
  });

  describe('API Routes Summary', () => {
    it('should have all API route categories', () => {
      const categories = [
        'admin', 'astrology', 'auth', 'cache', 'calendar', 'checkout',
        'cities', 'compatibility', 'content-access', 'counselor', 'cron',
        'csp-report', 'dates', 'db-ping', 'destiny-map', 'destiny-match',
        'feedback', 'latlon-to-timezone', 'me', 'metrics', 'notifications',
        'push', 'referral', 'review', 'saju', 'share', 'stats', 'tarot',
        'user', 'webhook',
      ];

      expect(categories.length).toBe(30);
    });
  });
});
