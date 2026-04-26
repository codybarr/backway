const AUTH_PATH_HINTS = ['login', 'signin', 'sign-in', 'signup', 'register', 'auth', 'account'];

export function normalizeUrl(input: string): { url: URL; normalized: string } {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  url.hash = '';
  url.protocol = url.protocol === 'http:' || url.protocol === 'https:' ? url.protocol : 'https:';
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
  return { url, normalized: url.toString() };
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
