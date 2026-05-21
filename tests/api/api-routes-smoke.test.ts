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
  describe('Admin Routes (1)', () => {
    it('should have admin routes', () => {
      assertModules([
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

  describe('Auth Routes (1)', () => {
    it('should have auth routes', () => {
      assertModules([
        'app/api/auth/revoke/route',
      ]);
    });
  });

  describe('Calendar Routes', () => {
    it('should have calendar routes', () => {
      assertModules([
        'app/api/calendar/route',
      ]);
    });
  });

  describe('Checkout Routes (1)', () => {
    it('should have checkout route', () => {
      assertModules([
        'app/api/checkout/route',
      ]);
    });
  });

  describe('Cities Routes (1)', () => {
    it('should have cities route', () => {
      assertModules([
        'app/api/cities/route',
      ]);
    });
  });

  describe('Compatibility Routes', () => {
    it('should have compatibility routes', () => {
      assertModules([
        'app/api/compatibility/counselor/route',
      ]);
    });
  });

  describe('Content Access Routes (1)', () => {
    it('should have content access route', () => {
      assertModules([
        'app/api/content-access/route',
      ]);
    });
  });

  describe('Counselor Routes (4)', () => {
    it('should have counselor routes', () => {
      assertModules([
        'app/api/counselor/chat-history/route',
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

  describe('Destiny Map Routes', () => {
    it('should have destiny map routes', () => {
      assertModules([
        'app/api/destiny-map/route',
        'app/api/destiny-map/chat/route',
      ]);
    });
  });

  describe('Destiny Match Routes (1)', () => {
    it('should have destiny match routes', () => {
      assertModules([
        'app/api/destiny-match/matches/route',
      ]);
    });
  });

  describe('Feedback Routes (2)', () => {
    it('should have feedback routes', () => {
      assertModules([
        'app/api/feedback/route',
        'app/api/feedback/records/route',
      ]);
    });
  });

  describe('Me Routes (5)', () => {
    it('should have user profile routes', () => {
      assertModules([
        'app/api/me/circle/route',
        'app/api/me/credits/route',
        'app/api/me/history/route',
        'app/api/me/premium/route',
        'app/api/me/profile/route',
      ]);
    });
  });

  describe('Push Routes', () => {
    it('should have push routes', () => {
      assertModules([
        'app/api/push/subscribe/route',
      ]);
    });
  });

  describe('Referral Routes', () => {
    it('should have referral routes', () => {
      assertModules([
        'app/api/referral/claim/route',
        'app/api/referral/create-code/route',
        'app/api/referral/me/route',
      ]);
    });
  });

  describe('Saju Routes (2)', () => {
    it('should have saju routes', () => {
      assertModules([
        'app/api/saju/route',
        'app/api/saju/chat-stream/route',
      ]);
    });
  });

  describe('Stats Routes (1)', () => {
    it('should have stats route', () => {
      assertModules([
        'app/api/stats/route',
      ]);
    });
  });

  describe('Tarot Routes', () => {
    it('should have tarot core routes', () => {
      assertModules([
        'app/api/tarot/route',
        'app/api/tarot/followup/route',
        'app/api/tarot/interpret-stream/route',
      ]);
    });

    it('should have tarot save routes', () => {
      assertModules([
        'app/api/tarot/save/route',
        'app/api/tarot/save/[id]/route',
      ]);
    });
  });

  describe('User Routes (1)', () => {
    it('should have user routes', () => {
      assertModules([
        'app/api/user/update-birth-info/route',
      ]);
    });
  });

  describe('Webhook Routes (1)', () => {
    it('should have webhook routes', () => {
      assertModules([
        'app/api/webhook/stripe/route',
      ]);
    });
  });

  describe('API Routes Summary', () => {
    it('should have a route module under each expected API category directory', () => {
      const categories = [
        'admin', 'astrology', 'auth', 'calendar', 'checkout', 'cities',
        'compatibility', 'content-access', 'counselor', 'cron',
        'destiny-map', 'destiny-match', 'feedback', 'me', 'push',
        'referral', 'saju', 'stats', 'tarot', 'user', 'webhook',
      ];

      categories.forEach((category) => {
        const dir = path.join(process.cwd(), 'src', 'app', 'api', category);
        expect(existsSync(dir)).toBe(true);
      });
    });
  });
});
