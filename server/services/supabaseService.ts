export class DatabaseStorageError extends Error {
  public readonly statusCode: number;
  public readonly reasonCode: string;

  constructor(message: string, statusCode = 500, reasonCode = 'database_error') {
    super(message);
    this.name = 'DatabaseStorageError';
    this.statusCode = statusCode;
    this.reasonCode = reasonCode;
  }
}

function getSupabaseEnv() {
  return {
    url: (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    anonKey: (process.env.SUPABASE_ANON_KEY || '').trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  };
}

export function isSupabaseUrlValid(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function hasSupabaseQuestionsConfig(): boolean {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  return isSupabaseUrlValid(url) && Boolean(serviceRoleKey || anonKey);
}

export function hasSupabaseAdminKey(): boolean {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return isSupabaseUrlValid(url) && Boolean(serviceRoleKey);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseContentRangeTotal(headerValue: string | null, fallbackCount: number): number {
  if (!headerValue) return fallbackCount;
  const slashIdx = headerValue.lastIndexOf('/');
  if (slashIdx === -1) return fallbackCount;
  const totalPart = headerValue.slice(slashIdx + 1).trim();
  const parsed = parseInt(totalPart, 10);
  return Number.isFinite(parsed) ? parsed : fallbackCount;
}

export async function supabaseQuestionsFetch(
  queryPath: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    keyMode: 'public' | 'service';
    body?: unknown;
    prefer?: string;
  }
): Promise<globalThis.Response> {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();

  if (!isSupabaseUrlValid(url)) {
    throw new DatabaseStorageError('Supabase URL is not configured.', 503, 'not_configured');
  }

  const apiKey =
    options.keyMode === 'service'
      ? serviceRoleKey
      : serviceRoleKey || anonKey;

  if (!apiKey) {
    throw new DatabaseStorageError(
      options.keyMode === 'service'
        ? 'Supabase service role key is required for owner moderation.'
        : 'Supabase API key is not configured.',
      503,
      'missing_api_key'
    );
  }

  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.prefer) {
    headers['Prefer'] = options.prefer;
  }

  let res: globalThis.Response;
  try {
    res = await fetch(`${url}/rest/v1/questions${queryPath}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[Supabase Network Error]', err);
    throw new DatabaseStorageError(
      'Could not connect to the questions database. Please try again shortly.',
      503,
      'network_error'
    );
  }

  if (!res.ok) {
    const rawText = await res.text().catch(() => '');
    let parsedErr: { code?: string; message?: string } = {};
    try {
      parsedErr = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsedErr = {};
    }
    const pgCode = String(parsedErr.code || '');
    const pgMsg = String(parsedErr.message || rawText).toLowerCase();

    let reasonCode = 'supabase_http_error';
    let userMsg = 'Unable to process your question in the database right now. Please try again later.';

    if (
      pgCode === 'PGRST205' ||
      pgCode === '42P01' ||
      pgMsg.includes('does not exist') ||
      pgMsg.includes('could not find the table')
    ) {
      reasonCode = 'table_missing';
      userMsg = 'Questions database table is not initialized yet. Please run supabase-schema.sql in Supabase.';
    } else if (res.status === 401 || pgMsg.includes('invalid api key') || pgMsg.includes('jwt')) {
      reasonCode = 'auth_or_key_error';
      userMsg = 'Database authentication failed. Please verify SUPABASE_URL and Supabase API keys.';
    } else if (
      res.status === 403 ||
      pgCode === '42501' ||
      pgMsg.includes('row-level security') ||
      pgMsg.includes('permission denied')
    ) {
      reasonCode = 'rls_denied';
      userMsg = 'Database permission check prevented this action.';
    } else if (pgCode === '42703' || pgCode === 'PGRST204') {
      reasonCode = 'schema_mismatch';
      userMsg = 'Questions database schema is out of date.';
    }

    if (reasonCode !== 'table_missing') {
      console.error('[Supabase HTTP Error]', {
        status: res.status,
        code: pgCode,
        reasonCode,
        detail: rawText.slice(0, 300),
      });
    }
    throw new DatabaseStorageError(userMsg, res.status >= 500 ? 503 : 500, reasonCode);
  }

  return res;
}

const TABLE_MISSING_CACHE_MS = 30_000;
let tableMissingUntil = 0;
let loggedTableMissingFallback = false;

export function markSupabaseTableMissing(): void {
  tableMissingUntil = Date.now() + TABLE_MISSING_CACHE_MS;
  if (!loggedTableMissingFallback) {
    loggedTableMissingFallback = true;
    console.warn(
      '[Questions Storage] Supabase public.questions table is not initialized yet; using local .data-questions.json store until supabase-schema.sql is applied.'
    );
  }
}

export async function isSupabaseQuestionsTableReady(): Promise<boolean> {
  if (!hasSupabaseQuestionsConfig()) {
    return false;
  }
  if (Date.now() < tableMissingUntil) {
    return false;
  }
  try {
    await supabaseQuestionsFetch('?select=id&limit=1', {
      method: 'GET',
      keyMode: 'public',
    });
    tableMissingUntil = 0;
    loggedTableMissingFallback = false;
    return true;
  } catch (err) {
    if (err instanceof DatabaseStorageError && err.reasonCode === 'table_missing') {
      markSupabaseTableMissing();
      return false;
    }
    // Preserve strict error surfacing for actual auth/network/RLS failures
    return true;
  }
}

export async function checkSupabaseQuestionsHealth(): Promise<string> {
  if (!hasSupabaseQuestionsConfig()) {
    return 'not_configured';
  }
  try {
    await supabaseQuestionsFetch('?select=id&limit=1', {
      method: 'GET',
      keyMode: 'public',
    });
    tableMissingUntil = 0;
    return 'ready';
  } catch (err) {
    if (err instanceof DatabaseStorageError) {
      if (err.reasonCode === 'table_missing') {
        markSupabaseTableMissing();
      }
      return err.reasonCode;
    }
    return 'database_error';
  }
}
