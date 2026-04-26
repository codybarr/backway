const ALLOWED_ASSET_TYPES = [
  'text/css',
  'image/',
  'font/',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/font-woff',
  'application/font-woff2',
];

export function isAllowedAssetContentType(contentType: string | null) {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return ALLOWED_ASSET_TYPES.some((allowed) => normalized.startsWith(allowed));
}

export function getContentType(response: Response) {
  return response.headers.get('content-type')?.split(';')[0]?.trim() ?? null;
}
