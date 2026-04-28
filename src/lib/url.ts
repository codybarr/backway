const AUTH_PATH_HINTS = ['login', 'signin', 'sign-in', 'signup', 'register', 'auth', 'account'];
const SENSITIVE_QUERY_HINTS = ['token', 'secret', 'password', 'passwd', 'pwd', 'key', 'apikey', 'api_key', 'signature', 'sig', 'auth', 'credential', 'session'];
const SENSITIVE_QUERY_EXACT = new Set(['access_token', 'id_token', 'refresh_token', 'client_secret', 'code']);

export function normalizeUrl(input: string): { url: URL; normalized: string } {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  if (url.username || url.password) throw new Error('url credentials are not allowed');
  if (isBlockedHostname(url.hostname)) throw new Error('blocked hostname');

  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
  }
  const params = Array.from(url.searchParams).sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value] of params) url.searchParams.append(key, value);
  return { url, normalized: sanitizeUrlForStorage(url) };
}

export function sanitizeUrlForStorage(input: string | URL) {
  const url = new URL(input.toString());
  url.username = '';
  url.password = '';
  url.hash = '';
  for (const key of Array.from(url.searchParams.keys())) {
    if (isSensitiveQueryKey(key)) {
      url.searchParams.set(key, '[redacted]');
    }
  }
  const params = Array.from(url.searchParams).sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value] of params) url.searchParams.append(key, value);
  return url.toString();
}

export function resolveUrl(base: string, candidate: string) {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

export function shouldSkipUrl(url: URL) {
  const haystack = `${url.hostname}${url.pathname}`.toLowerCase();
  return AUTH_PATH_HINTS.some((hint) => haystack.includes(hint));
}

function isSensitiveQueryKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_QUERY_EXACT.has(normalized) || SENSITIVE_QUERY_HINTS.some((hint) => normalized.includes(hint));
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost')) return true;
  if (
    host === '[::]' ||
    host === '[::1]' ||
    host.startsWith('[fc') ||
    host.startsWith('[fd') ||
    host.startsWith('[fe80:')
  ) {
    return true;
  }

  const ipv4 = parseIpv4(host);
  if (!ipv4) return false;
  const [a, b] = ipv4;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function parseIpv4(host: string) {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) return null;
  return nums as [number, number, number, number];
}
