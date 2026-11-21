import type { Request } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_QUESTIONS_PER_HOUR = 5;
const MAX_ABUSE_ATTEMPTS_PER_HOUR = 20;

const ipQuestionRateLimits = new Map<string, RateLimitEntry>();
const ipAbuseLimits = new Map<string, RateLimitEntry>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip || '127.0.0.1';
}

export function isHoneypotTriggered(website: string | null | undefined): boolean {
  return Boolean(website && website.trim().length > 0);
}

export function isQuestionRateLimited(ip: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - ONE_HOUR_MS;

  const questionEntry = ipQuestionRateLimits.get(ip);
  if (questionEntry) {
    questionEntry.timestamps = questionEntry.timestamps.filter((t) => t > oneHourAgo);
    if (questionEntry.timestamps.length >= MAX_QUESTIONS_PER_HOUR) {
      return true;
    }
  }

  const abuseEntry = ipAbuseLimits.get(ip);
  if (abuseEntry) {
    abuseEntry.timestamps = abuseEntry.timestamps.filter((t) => t > oneHourAgo);
    if (abuseEntry.timestamps.length >= MAX_ABUSE_ATTEMPTS_PER_HOUR) {
      return true;
    }
  }

  return false;
}

export function recordQuestionRateLimitHit(ip: string): void {
  const now = Date.now();
  const oneHourAgo = now - ONE_HOUR_MS;
  const entry = ipQuestionRateLimits.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo);
  entry.timestamps.push(now);
  ipQuestionRateLimits.set(ip, entry);
}

export function recordAbuseRateLimitHit(ip: string): void {
  const now = Date.now();
  const oneHourAgo = now - ONE_HOUR_MS;
  const entry = ipAbuseLimits.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo);
  entry.timestamps.push(now);
  ipAbuseLimits.set(ip, entry);
}
