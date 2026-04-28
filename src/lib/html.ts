import { resolveUrl } from './url';

const ASSET_ATTRS = ['src', 'srcset', 'href', 'poster', 'component-url', 'renderer-url'] as const;

export type AssetReference = {
  attr: (typeof ASSET_ATTRS)[number] | string;
  original: string;
  resolved: string;
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function addReference(found: AssetReference[], seen: Set<string>, baseUrl: string, attr: string, candidate: string) {
  const original = candidate.trim();
  const value = decodeHtmlAttribute(original);
  if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('#')) return;
  const resolved = resolveUrl(baseUrl, value);
  if (!resolved || !/^https?:\/\//i.test(resolved)) return;
  const key = `${original}:${resolved}`;
  if (seen.has(key)) return;
  seen.add(key);
  found.push({ attr, original, resolved });
}

export function extractAssetReferences(html: string, baseUrl: string) {
  const found: AssetReference[] = [];
  const seen = new Set<string>();

  for (const attr of ASSET_ATTRS) {
    const regex = new RegExp(`\\b${attr}=["']([^"']+)["']`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
      const value = match[1]?.trim();
      if (!value) continue;

      if (attr === 'srcset') {
        for (const part of value.split(',')) {
          addReference(found, seen, baseUrl, attr, part.trim().split(/\s+/)[0] ?? '');
        }
      } else {
        addReference(found, seen, baseUrl, attr, value);
      }
    }
  }

  // Astro and other bundlers often keep runtime module URLs in arbitrary
  // attributes or inline JSON. Capture quoted root-relative/static asset URLs
  // even when they are not in classic src/href attributes.
  const quotedUrl = /["']((?:https?:\/\/[^"']+|\/[^"']+)\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)(?:\?[^"']*)?)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = quotedUrl.exec(html))) {
    addReference(found, seen, baseUrl, 'inline-url', match[1] ?? '');
  }

  return found;
}

export function extractAssetUrls(html: string, baseUrl: string) {
  return unique(extractAssetReferences(html, baseUrl).map((reference) => reference.resolved));
}

export function rewriteHtmlWithAssets(
  html: string,
  references: AssetReference[],
  replacements: Map<string, string>,
  baseUrl: string,
) {
  let output = html;

  const replacedOriginals = new Set<string>();
  for (const reference of references) {
    const replacementUrl = replacements.get(reference.resolved) ?? reference.resolved;

    const escapedResolved = reference.resolved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(escapedResolved, 'g'), replacementUrl);

    if (!replacedOriginals.has(reference.original)) {
      replacedOriginals.add(reference.original);
      const escapedOriginal = reference.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (reference.original.startsWith('/')) {
        output = output.replace(new RegExp(`([\"'=,(\\s])${escapedOriginal}`, 'g'), `$1${replacementUrl}`);
      } else {
        output = output.replace(new RegExp(escapedOriginal, 'g'), replacementUrl);
      }
    }
  }

  return absolutizeRemainingRootRelativeUrls(output, baseUrl);
}

export function shouldFallbackToScreenshot(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return 'empty_html';
  const bodyContent = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  if (bodyContent.length < 400) return 'thin_html';
  const rootHints = /(id|class)=["'][^"']*(app|root|__next|__nuxt|svelte)[^"']*["']/i;
  if (rootHints.test(trimmed) && bodyContent.length < 2000) return 'likely_js_heavy';
  return null;
}

export function extractCssAssetReferences(css: string, baseUrl: string) {
  const found: AssetReference[] = [];
  const seen = new Set<string>();
  const urlRegex = /url\(\s*(['"]?)(?!data:|blob:|#)([^)'"\s]+)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(css))) addReference(found, seen, baseUrl, 'css-url', match[2] ?? '');

  const importRegex = /@import\s+(?:url\()?\s*(['"])(?!data:|blob:|#)([^'"]+)\1\s*\)?/gi;
  while ((match = importRegex.exec(css))) addReference(found, seen, baseUrl, 'css-import', match[2] ?? '');
  return found;
}

export function rewriteCssWithAssets(css: string, references: AssetReference[], replacements: Map<string, string>) {
  let output = css;
  for (const reference of references) {
    const replacementUrl = replacements.get(reference.resolved) ?? reference.resolved;
    const escapedOriginal = reference.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(escapedOriginal, 'g'), replacementUrl);
    const escapedResolved = reference.resolved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(escapedResolved, 'g'), replacementUrl);
  }
  return output;
}

function absolutizeRemainingRootRelativeUrls(html: string, baseUrl: string) {
  return html.replace(/(["'=,(])\/(?!\/|asset\/|snapshot\/)([^"'\s)>]+)/g, (match, prefix: string, path: string) => {
    const resolved = resolveUrl(baseUrl, `/${path}`);
    return resolved ? `${prefix}${resolved}` : match;
  });
}
