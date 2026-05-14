import type { Context, Next } from 'hono';

const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const REPLAY_CSP = [
  'sandbox allow-same-origin',
  "default-src 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ');

export async function securityHeaders(c: Context, next: Next) {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!c.res.headers.has('X-Frame-Options')) {
    c.header('X-Frame-Options', 'DENY');
  }
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cross-Origin-Resource-Policy', 'same-origin');

  if (!c.res.headers.has('Content-Security-Policy')) {
    c.header('Content-Security-Policy', APP_CSP);
  }
}

export function setReplaySecurityHeaders(c: Context) {
  c.header('Content-Security-Policy', REPLAY_CSP);
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
}
