import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = 'http://localhost:4010';
const services = [
  { id: 'destiny-map', path: '/demo/destiny-map' },
  { id: 'destiny-matrix', path: '/demo/destiny-matrix' },
  { id: 'tarot', path: '/demo/tarot' },
  { id: 'calendar', path: '/demo/calendar' },
  { id: 'compatibility', path: '/demo/compatibility' },
  { id: 'report', path: '/demo/report' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1900 } });
await context.addCookies([{ name: 'dp_demo', value: '1', domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }]);
const page = await context.newPage();

const results = [];

try {
  for (const service of services) {
    const row = {
      service: service.id,
      ok: false,
      runMs: null,
      jsonChars: 0,
      topKeys: [],
      error: null,
      contentHeight: null,
      hasRunButton: false,
    };

    try {
      await page.goto(`${baseUrl}${service.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const runButton = page.getByRole('button', { name: /Run Demo|Running\.\.\./i }).first();
      await runButton.waitFor({ state: 'visible', timeout: 30000 });
      row.hasRunButton = true;

      const t0 = Date.now();
      await runButton.click();

      // Wait until request cycle finishes (button back to Run Demo)
      await page.getByRole('button', { name: /^Run Demo$/i }).first().waitFor({ state: 'visible', timeout: 120000 });
      row.runMs = Date.now() - t0;

      const resultHeading = page.getByRole('heading', { name: /Demo Result/i }).first();
      const hasResult = await resultHeading.isVisible().catch(() => false);

      if (hasResult) {
        row.ok = true;
        const pre = page.locator('pre').first();
        const text = (await pre.textContent()) || '';
        row.jsonChars = text.length;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            row.topKeys = Object.keys(parsed).slice(0, 20);
          }
        } catch {
          row.error = 'result JSON parse failed';
        }
      } else {
        // Fallback: capture visible body text excerpt for diagnostics
        const bodyText = ((await page.locator('main').first().textContent()) || '').trim();
        row.error = bodyText.slice(0, 220);
      }

      row.contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.screenshot({ path: `artifacts/ux-audit/${service.id}.png`, fullPage: true });
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
      try {
        await page.screenshot({ path: `artifacts/ux-audit/${service.id}-error.png`, fullPage: true });
      } catch {}
    }

    results.push(row);
  }
} finally {
  await browser.close();
}

await fs.writeFile('artifacts/ux-audit/demo-ux-audit.json', JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');
process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
