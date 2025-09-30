// src/lib/Saju/timezone.ts

export function getSupportedTimezones(): string[] {
  const anyIntl = Intl as any;
  if (typeof anyIntl?.supportedValuesOf === 'function') {
    try {
      return (anyIntl.supportedValuesOf('timeZone') as string[]).slice().sort((a, b) => a.localeCompare(b));
    } catch {}
  }
  return [
    'UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
    'Africa/Cairo','Africa/Johannesburg',
    'Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Jakarta','Asia/Shanghai','Asia/Hong_Kong','Asia/Tokyo','Asia/Seoul','Asia/Singapore',
    'Australia/Sydney','Pacific/Auckland',
    'America/St_Johns','America/Halifax','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu','America/Sao_Paulo','America/Mexico_City'
  ];
}

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getOffsetMinutes(instantUTC: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = dtf.formatToParts(instantUTC);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value])) as Record<string,string>;
  const isoLocal = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
  const localAsUTC = new Date(isoLocal + 'Z');
  const diffMs = localAsUTC.getTime() - instantUTC.getTime();
  return Math.round(diffMs / 60000);
}

export function formatOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(offsetMin) / 60);
  const m = Math.abs(offsetMin) % 60;
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}