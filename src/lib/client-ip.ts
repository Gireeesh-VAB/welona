import type { NextRequest } from 'next/server';

/**
 * Best-effort extraction of the client's IP from a Next.js request.
 *
 * Tries the standard proxy headers first (CDN / reverse proxy), then falls
 * back to a sentinel string. Returns `null` if absolutely nothing is found —
 * routes should treat IP as advisory metadata, never as identity.
 */
export function readClientIp(req: NextRequest): string | null {
  // X-Forwarded-For may carry a comma-separated chain: client, proxy1, proxy2…
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  return null;
}
