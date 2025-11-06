//src/lib/Saju/timezone.ts//

export function getSupportedTimezones(): string[] {
  const anyIntl = Intl as any;
  if (typeof anyIntl?.supportedValuesOf === 'function') {
    try {
      const list = anyIntl.supportedValuesOf('timeZone') as string[];
      if (Array.isArray(list) && list.length > 0) {
        return list.slice().sort((a, b) => a.localeCompare(b));
      }
    } catch {
      // fall through
    }
  }

  const fallback = [
    'UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
    'Africa/Cairo','Africa/Johannesburg',
    'Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Jakarta','Asia/Shanghai','Asia/Hong_Kong','Asia/Tokyo','Asia/Seoul','Asia/Singapore',
    'Australia/Sydney','Pacific/Auckland',
    'America/St_Johns','America/Halifax','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu','America/Sao_Paulo','America/Mexico_City'
  ];

  // 런타임에서 실제 지원되는 것만 남기기
  const valid = fallback.filter(tz => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  });

  return valid.slice().sort((a, b) => a.localeCompare(b));
}

export function getUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (typeof tz === 'string' && tz) ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getOffsetMinutes(instantUTC: Date, timeZone: string): number {
  // timeZone 유효성 확인: 잘못되면 UTC로 처리
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    return 0;
  }

  let dtf: Intl.DateTimeFormat;
  try {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return 0;
  }

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = dtf.formatToParts(instantUTC);
  } catch {
    return 0;
  }

  const map = Object.fromEntries(parts.map(p => [p.type, p.value])) as Record<string,string>;
  const y = Number(map.year);
  const mo = Number(map.month);
  const d = Number(map.day);
  const h = Number(map.hour);
  const mi = Number(map.minute);
  const s = Number(map.second);

  if (![y, mo, d, h, mi, s].every(n => Number.isFinite(n))) {
    return 0;
  }

  const isoLocal = `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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