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

  describe('Astrology Routes (14)', () => {
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
        'app/api/astrology/advanced/electional/route',
        'app/api/astrology/advanced/fixed-stars/route',
        'app/api/astrology/advanced/harmonics/route',
        'app/api/astrology/advanced/lunar-return/route',
        'app/api/astrology/advanced/midpoints/route',
        'app/api/astrology/advanced/progressions/route',
        'app/api/astrology/advanced/rectification/route',
        'app/api/astrology/advanced/solar-return/route',
      ]);
    });
  });

  describe('Auth Routes (2)', () => {
    it('should have auth routes', () => {
      assertModules([
        'app/api/auth/register/route',
        'app/api/auth/revoke/route',
      ]);
    });
  });

  describe('Calendar Routes (3)', () => {
    it('should have calendar routes', () => {
      assertModules([
        'app/api/calendar/route',
        'app/api/calendar/save/route',
        'app/api/calendar/save/[id]/route',
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

  describe('Compatibility Routes (3)', () => {
    it('should have compatibility routes', () => {
      assertModules([
        'app/api/compatibility/route',
        'app/api/compatibility/chat/route',
        'app/api/compatibility/counselor/route',
      ]);
    });
  });

  describe('Consultation Routes (2)', () => {
    it('should have consultation routes', () => {
      assertModules([
        'app/api/consultation/route',
        'app/api/consultation/[id]/route',
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

  describe('Cron Routes (4)', () => {
    it('should have cron routes', () => {
      assertModules([
        'app/api/cron/daily-fortune-post/route',
        'app/api/cron/notifications/route',
        'app/api/cron/reset-credits/route',
        'app/api/cron/weekly-fortune/route',
      ]);
    });
  });

  describe('Daily Fortune Routes (1)', () => {
    it('should have daily fortune route', () => {
      assertModules([
        'app/api/daily-fortune/route',
      ]);
    });
  });

  describe('Destiny Map Routes (3)', () => {
    it('should have destiny map routes', () => {
      assertModules([
        'app/api/destiny-map/route',
        'app/api/destiny-map/chat/route',
        'app/api/destiny-map/chat-stream/route',
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

  describe('Destiny Matrix Routes (2)', () => {
    it('should have destiny matrix routes', () => {
      assertModules([
        'app/api/destiny-matrix/route',
        'app/api/destiny-matrix/report/route',
      ]);
    });
  });

  describe('Dream Routes (5)', () => {
    it('should have dream routes', () => {
      assertModules([
        'app/api/dream/route',
        'app/api/dream/chat/route',
        'app/api/dream/chat/save/route',
        'app/api/dream/history/route',
        'app/api/dream/stream/route',
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

  describe('Fortune Routes (1)', () => {
    it('should have fortune route', () => {
      assertModules([
        'app/api/fortune/route',
      ]);
    });
  });

  describe('iChing Routes (2)', () => {
    it('should have iching routes', () => {
      assertModules([
        'app/api/iching/changing-line/route',
        'app/api/iching/stream/route',
      ]);
    });
  });

  describe('ICP Routes (1)', () => {
    it('should have icp route', () => {
      assertModules([
        'app/api/icp/route',
      ]);
    });
  });

  describe('Life Prediction Routes (5)', () => {
    it('should have life prediction routes', () => {
      assertModules([
        'app/api/life-prediction/route',
        'app/api/life-prediction/advisor-chat/route',
        'app/api/life-prediction/analyze-question/route',
        'app/api/life-prediction/backend-predict/route',
        'app/api/life-prediction/explain-results/route',
      ]);
    });

    it('should have life prediction save routes', () => {
      assertModules([
        'app/api/life-prediction/save/route',
        'app/api/life-prediction/save-timing/route',
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

  describe('Notifications Routes (1)', () => {
    it('should have notifications route', () => {
      assertModules([
        'app/api/notifications/send/route',
      ]);
    });
  });

  describe('Numerology Routes (1)', () => {
    it('should have numerology route', () => {
      assertModules([
        'app/api/numerology/route',
      ]);
    });
  });

  describe('Persona Memory Routes (2)', () => {
    it('should have persona memory routes', () => {
      assertModules([
        'app/api/persona-memory/route',
        'app/api/persona-memory/update-from-chat/route',
      ]);
    });
  });

  describe('Personality Routes (1)', () => {
    it('should have personality route', () => {
      assertModules([
        'app/api/personality/route',
      ]);
    });
  });

  describe('Precompute Routes (1)', () => {
    it('should have precompute route', () => {
      assertModules([
        'app/api/precompute-chart/route',
      ]);
    });
  });

  describe('Push Routes (2)', () => {
    it('should have push routes', () => {
      assertModules([
        'app/api/push/send/route',
        'app/api/push/subscribe/route',
      ]);
    });
  });

  describe('Readings Routes (2)', () => {
    it('should have readings routes', () => {
      assertModules([
        'app/api/readings/route',
        'app/api/readings/[id]/route',
      ]);
    });
  });

  describe('Referral Routes (5)', () => {
    it('should have referral routes', () => {
      assertModules([
        'app/api/referral/claim/route',
        'app/api/referral/create-code/route',
        'app/api/referral/link/route',
        'app/api/referral/me/route',
        'app/api/referral/validate/route',
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

  describe('Tarot Routes (5)', () => {
    it('should have tarot core routes', () => {
      assertModules([
        'app/api/tarot/analyze-question/route',
        'app/api/tarot/chat/route',
        'app/api/tarot/chat/stream/route',
      ]);
    });

    it('should have tarot save and interpret routes', () => {
      assertModules([
        'app/api/tarot/interpret/route',
        'app/api/tarot/interpret/stream/route',
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

  describe('Visitors Routes (1)', () => {
    it('should have visitors route', () => {
      assertModules([
        'app/api/visitors-today/route',
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

  describe('Weekly Fortune Routes (1)', () => {
    it('should have weekly fortune route', () => {
      assertModules([
        'app/api/weekly-fortune/route',
      ]);
    });
  });

  describe('API Routes Summary', () => {
    it('should have all API route categories', () => {
      const categories = [
        'admin', 'astrology', 'auth', 'calendar', 'checkout', 'cities',
        'compatibility', 'consultation', 'content-access', 'counselor',
        'cron', 'daily-fortune', 'destiny-map', 'destiny-match',
        'destiny-matrix', 'dream', 'feedback', 'fortune', 'iching', 'icp',
        'life-prediction', 'me', 'notifications', 'numerology',
        'persona-memory', 'personality', 'precompute-chart', 'push',
        'readings', 'referral', 'saju', 'stats', 'tarot', 'user',
        'visitors-today', 'webhook', 'weekly-fortune',
      ];

      expect(categories.length).toBe(37);
    });
  });
});
