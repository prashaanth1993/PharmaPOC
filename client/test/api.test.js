// client/test/api.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { listAssets, submitAsset } from '../src/api';

beforeEach(() => { global.fetch = vi.fn(); });

describe('listAssets', () => {
  test('builds the query string from filters and returns parsed assets', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ assets: [{ ROWID: '1' }] }) });
    const assets = await listAssets({ role: 'Admin', search: 'launch' });
    expect(global.fetch.mock.calls[0][0]).toContain('role=Admin');
    expect(global.fetch.mock.calls[0][0]).toContain('search=launch');
    expect(assets).toEqual([{ ROWID: '1' }]);
  });
});

describe('submitAsset', () => {
  test('POSTs actor info and returns the new status', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'UnderReview' }) });
    const result = await submitAsset('1', { actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(global.fetch.mock.calls[0][0]).toContain('/assets/1/submit');
    expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    expect(result.status).toBe('UnderReview');
  });

  test('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'boom' }) });
    await expect(submitAsset('1', {})).rejects.toThrow('boom');
  });
});
