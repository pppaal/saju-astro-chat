import { NextRequest, NextResponse } from 'next/server';
import tzLookup from 'tz-lookup';

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json();

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'invalid lat/lon' }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'lat/lon out of range' }, { status: 400 });
    }

    const timeZone = tzLookup(latitude, longitude); // e.g., "Asia/Seoul"
    return NextResponse.json({ timeZone });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}