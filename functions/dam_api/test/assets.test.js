process.env.STRATUS_BUCKET = 'pharmapoc-dam-138541';
const express = require('express');
const request = require('supertest');
const assetsRouter = require('../src/routes/assets');

jest.mock('../src/db', () => ({ query: jest.fn(), insertRow: jest.fn(), escapeZcql: jest.requireActual('../src/db').escapeZcql }));
const { query, insertRow } = require('../src/db');

function buildApp(fakeCatalystApp = {}) {
  const app = express();
  app.use((req, res, next) => { req.catalystApp = fakeCatalystApp; next(); });
  app.use('/assets', assetsRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('GET /assets', () => {
  test('an unrecognized or missing role is scoped to Published only (most restrictive default)', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets');
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Published'");
  });

  test('Agency Viewer is always scoped to Published regardless of a status param', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Agency Viewer', status: 'Draft' });
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Published'");
    expect(query.mock.calls[0][1]).not.toContain("STATUS = 'Draft'");
  });

  test('an internal role can filter by an explicit status', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', status: 'Draft' });
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Draft'");
  });

  test('an empty search string returns all rows instead of an empty LIKE clause', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', search: '' });
    expect(query.mock.calls[0][1]).not.toContain('LIKE');
  });

  test('a single quote in the search term is escaped', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'Admin', search: "O'Brien" });
    expect(query.mock.calls[0][1]).toContain("NAME LIKE '%O''Brien%'");
  });

  test('an unrecognized (non-allowlisted) role is also scoped to Published only, not just a missing one', async () => {
    query.mockResolvedValue([]);
    await request(buildApp()).get('/assets').query({ role: 'SomeUnrecognizedRole' });
    expect(query.mock.calls[0][1]).toContain("STATUS = 'Published'");
  });
});

describe('GET /assets/:id/suggestions', () => {
  test('returns canned suggestions for a known asset type', async () => {
    const res = await request(buildApp()).get('/assets/123/suggestions').query({ assetType: 'Video' });
    expect(res.status).toBe(200);
    expect(res.body.suggestions.function).toBe('Marketing');
  });

  test('400s when assetType is missing', async () => {
    const res = await request(buildApp()).get('/assets/123/suggestions');
    expect(res.status).toBe(400);
  });
});

describe('GET /assets/:id', () => {
  test('404s when the asset does not exist', async () => {
    query.mockResolvedValue([]);
    const res = await request(buildApp()).get('/assets/999');
    expect(res.status).toBe(404);
  });

  test('200s with the asset when found', async () => {
    query.mockResolvedValue([{ ROWID: '1', NAME: 'Test' }]);
    const res = await request(buildApp()).get('/assets/1');
    expect(res.status).toBe(200);
    expect(res.body.asset.NAME).toBe('Test');
  });
});

describe('POST /assets', () => {
  test('400s when no file is attached', async () => {
    const res = await request(buildApp()).post('/assets').field('name', 'Test');
    expect(res.status).toBe(400);
  });

  test('uploads to Stratus and inserts a Draft asset row', async () => {
    const putObjectMock = jest.fn().mockResolvedValue({});
    const fakeCatalystApp = { stratus: () => ({ bucket: () => ({ putObject: putObjectMock }) }) };
    insertRow.mockResolvedValue({ ROWID: '1', NAME: 'Test Creative', STATUS: 'Draft' });

    const res = await request(buildApp(fakeCatalystApp))
      .post('/assets')
      .field('name', 'Test Creative')
      .field('assetType', 'Image')
      .field('function', 'Marketing')
      .field('uploadedBy', 'Priya (Brand Manager)')
      .attach('file', Buffer.from('fake-image-bytes'), 'creative.png');

    expect(res.status).toBe(201);
    expect(putObjectMock).toHaveBeenCalled();
    expect(insertRow.mock.calls[0][2]).toMatchObject({ NAME: 'Test Creative', STATUS: 'Draft' });
  });
});
