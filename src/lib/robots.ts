export async function isRobotsAllowed(url: URL) {
  try {
    const robotsUrl = new URL('/robots.txt', url.origin);
    const response = await fetch(robotsUrl.toString(), { redirect: 'follow' });
    if (!response.ok) return true;
    const text = await response.text();
    const lines = text.split(/\r?\n/);
    let applies = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [directive, ...rest] = line.split(':');
      if (!directive || rest.length === 0) continue;
      const value = rest.join(':').trim();
      const key = directive.trim().toLowerCase();
      if (key === 'user-agent') applies = value === '*' || value.toLowerCase() === 'backway';
      if (applies && key === 'disallow' && value && url.pathname.startsWith(value)) return false;
    }
    return true;
  } catch {
    return true;
  }
}
