import type { Context } from 'hono';
import { getConfig } from './config';
import type { Env } from '../types';

const bucket = new Map<string, number[]>();

export function isRateLimited(c: Context<{ Bindings: Env }>) {
  const config = getConfig(c.env);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const now = Date.now();
  const requests = (bucket.get(ip) ?? []).filter((ts) => now - ts < config.rateLimitWindowMs);

  if (requests.length >= config.rateLimitMaxRequests) {
    bucket.set(ip, requests);
    return true;
  }

  requests.push(now);
  bucket.set(ip, requests);
  return false;
}
