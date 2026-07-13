/**
 * CHR-185 — the identity API layer (client + endpoints). Pure logic: `fetch` is
 * mocked, so these run without a device or native modules.
 *
 * @format
 */

import { apiFetch } from '../src/api/client';
import * as identity from '../src/api/identity';

function mockFetch(status: number, body: unknown) {
  (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === null ? '' : JSON.stringify(body)),
    }),
  );
}

function lastCall(): [string, { method?: string; headers: Record<string, string>; body?: string }] {
  return (globalThis.fetch as jest.Mock).mock.calls[0];
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('apiFetch', () => {
  it('returns parsed JSON and sends the bearer token', async () => {
    mockFetch(200, { data: { id: 1 } });
    const res = await apiFetch<{ data: { id: number } }>('/x', { token: 'tok' });
    expect(res.data.id).toBe(1);
    expect(lastCall()[1].headers.Authorization).toBe('Bearer tok');
  });

  it('throws with the API message on an error status', async () => {
    mockFetch(422, { message: 'Boom' });
    await expect(apiFetch('/x')).rejects.toThrow('Boom');
  });

  it('surfaces the first validation error', async () => {
    mockFetch(422, { errors: { email: ['Déjà pris'] } });
    await expect(apiFetch('/x')).rejects.toThrow('Déjà pris');
  });

  it('wraps a network failure as ApiError status 0', async () => {
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn(() => Promise.reject(new Error('down')));
    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 0 });
  });
});

describe('identity api', () => {
  it('logs in and unwraps token + identity', async () => {
    mockFetch(200, { token: 't', identity: { id: 1, name: 'A', email: 'a@b.c' } });
    const res = await identity.login('a@b.c', 'pw');
    expect(res.token).toBe('t');
    const [url, opts] = lastCall();
    expect(url).toContain('/api/identity/login');
    expect(JSON.parse(opts.body as string)).toMatchObject({ email: 'a@b.c', password: 'pw' });
  });

  it('discovers churches with the query and unwraps data', async () => {
    mockFetch(200, { data: [{ id: '1', name: 'Grace', slug: 'grace', domain: null, following: false }] });
    const churches = await identity.discoverChurches('tok', 'gr');
    expect(churches).toHaveLength(1);
    expect(lastCall()[0]).toContain('/api/identity/discover?q=gr');
  });

  it('follows a church via POST to the membership endpoint', async () => {
    mockFetch(200, { data: {} });
    await identity.followChurch('tok', 'abc');
    const [url, opts] = lastCall();
    expect(url).toContain('/api/identity/memberships/abc/follow');
    expect(opts.method).toBe('POST');
  });

  it('unfollows a church via DELETE', async () => {
    mockFetch(200, { message: 'ok' });
    await identity.unfollowChurch('tok', 'abc');
    const [url, opts] = lastCall();
    expect(url).toContain('/api/identity/memberships/abc');
    expect(opts.method).toBe('DELETE');
  });
});
