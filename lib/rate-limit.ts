import 'server-only';
import { getServerClient } from '@/lib/supabase-server';

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

// Fallback used only if the database limiter can't be reached.
const memory = new Map<string, { count: number; reset: number }>();

function memoryHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    if (memory.size > 5000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

/**
 * Counts a hit for `key` and returns true when it is over `limit` within the
 * window. Stored in Postgres (hit_rate_limit) so every server instance shares it.
 */
export async function rateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await getServerClient().rpc('hit_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('rate limiter unavailable, using in-memory fallback:', error.message);
    return memoryHit(key, limit, windowSeconds * 1000);
  }
  return data === true;
}
