import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Called once a day by Vercel Cron (vercel.json). Supabase pauses free
// projects after 7 days without requests; one small read keeps it awake.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await publicClient.from('site_settings').select('id').limit(1);
  if (error) {
    console.error('keep-alive failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
