import { API_ORIGIN } from '../config';

/** An API error carrying the HTTP status (0 = network failure) + a message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Override the base origin — e.g. a church's own host for its public API (CHR-186). */
  origin?: string;
};

/** First message out of a Laravel `{errors: {field: [msg]}}` validation bag. */
function firstValidationError(errors: unknown): string | null {
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') {
      return first[0];
    }
  }
  return null;
}

/**
 * Minimal JSON fetch against the central API (CHR-185). Adds the bearer token,
 * surfaces Laravel validation/error messages, and normalises network failures.
 */
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${options.origin ?? API_ORIGIN}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Connexion impossible au serveur.');
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data.message === 'string' && data.message) ||
      firstValidationError(data?.errors) ||
      `Erreur ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}
