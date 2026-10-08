import 'server-only';

// Best-effort, per-instance limiter (resets when the server restarts or
// scales out). Enough to slow down guessing order numbers or coupon codes.
const hits = new Map<string, { count: number; reset: number }>();

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
