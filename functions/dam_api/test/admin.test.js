const express = require('express');
const request = require('supertest');
const adminRouter = require('../src/routes/admin');

jest.mock('../src/db', () => ({
  query: jest.fn(),
  insertRow: jest.fn(),
  insertRows: jest.fn(),
}));
const { query, insertRow, insertRows } = require('../src/db');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.catalystApp = { stratus: () => ({ bucket: () => ({ putObject: jest.fn().mockResolvedValue({}) }) }) }; next(); });
  app.use('/admin', adminRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('GET /admin/analytics', () => {
  test('returns aggregate counts from UsageLog and Assets', async () => {
    query
      .mockResolvedValueOnce([{ ROWID: '1' }, { ROWID: '2' }]) // Assets total
      .mockResolvedValueOnce([{ ACTION: 'View' }, { ACTION: 'Download' }]); // UsageLog
    const res = await request(buildApp()).get('/admin/analytics');
    expect(res.status).toBe(200);
    expect(res.body.totalAssets).toBe(2);
    expect(res.body.usageEvents).toBe(2);
  });
});

describe('GET /admin/audit', () => {
  test('returns the full ApprovalWorkflow feed', async () => {
    query.mockResolvedValue([{ ROWID: '1', ACTION: 'Submitted' }]);
    const res = await request(buildApp()).get('/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body.audit).toHaveLength(1);
  });
});

describe('GET /admin/tags', () => {
  test('returns controlled vocabulary tags', async () => {
    query.mockResolvedValue([{ ROWID: '1', TAG_NAME: 'Launch' }]);
    const res = await request(buildApp()).get('/admin/tags');
    expect(res.status).toBe(200);
    expect(res.body.tags[0].TAG_NAME).toBe('Launch');
  });
});

describe('POST /admin/seed', () => {
  test('seeds Personas, Tags and sample Assets', async () => {
    query.mockResolvedValue([]); // nothing pre-existing for Personas/Tags/Assets lookups
    insertRows.mockResolvedValue([]);
    insertRow.mockResolvedValue({ ROWID: '1' });
    const res = await request(buildApp()).post('/admin/seed');
    expect(res.status).toBe(200);
    expect(insertRows).toHaveBeenCalledWith(expect.anything(), 'Personas', expect.any(Array));
    expect(insertRows).toHaveBeenCalledWith(expect.anything(), 'Tags', expect.any(Array));
    expect(insertRow).toHaveBeenCalledWith(expect.anything(), 'Assets', expect.objectContaining({ STATUS: expect.any(String) }));
  });

  test('also seeds UsageLog rows referencing seeded assets', async () => {
    query.mockResolvedValue([]); // nothing pre-existing for Personas/Tags/Assets lookups
    insertRows.mockResolvedValue([]);
    insertRow.mockResolvedValue({ ROWID: '1' });
    const res = await request(buildApp()).post('/admin/seed');
    expect(res.status).toBe(200);
    expect(insertRow).toHaveBeenCalledWith(expect.anything(), 'UsageLog', expect.objectContaining({
      ASSET_ID: expect.any(String),
      ACTION: expect.any(String),
    }));
    expect(res.body.usageLogsSeeded).toBeGreaterThanOrEqual(3);
  });

  test('running /admin/seed twice does not duplicate rows on the second run', async () => {
    const app = buildApp();

    // First call: nothing exists yet in Personas/Tags/Assets.
    query
      .mockResolvedValueOnce([]) // existing Personas
      .mockResolvedValueOnce([]) // existing Tags
      .mockResolvedValueOnce([]); // existing Assets
    insertRows.mockResolvedValue([]);
    insertRow.mockResolvedValue({ ROWID: '1' });

    const firstRes = await request(app).post('/admin/seed');
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.personasSeeded).toBe(4);
    expect(firstRes.body.tagsSeeded).toBe(10);
    expect(firstRes.body.assetsSeeded).toBe(14);
    expect(firstRes.body.usageLogsSeeded).toBeGreaterThan(0);
    expect(insertRows).toHaveBeenCalledTimes(2); // Personas + Tags
    expect(insertRow.mock.calls.filter(([, table]) => table === 'Assets')).toHaveLength(14);

    jest.clearAllMocks();

    // Second call: everything from the seed lists already exists, per the first
    // call's inserted data being reflected back by the (mocked) live queries.
    query
      .mockResolvedValueOnce([
        { NAME: 'Priya Sharma' }, { NAME: 'Dr. Anil Rao' }, { NAME: 'Sun Pharma Admin' }, { NAME: 'Field Agency Partner' },
      ]) // existing Personas
      .mockResolvedValueOnce([
        { TAG_NAME: 'Launch' }, { TAG_NAME: 'Field' }, { TAG_NAME: 'Digital' }, { TAG_NAME: 'Cardiovascular' },
        { TAG_NAME: 'Oncology' }, { TAG_NAME: 'Diabetes Care' }, { TAG_NAME: 'CNS / Neurology' },
        { TAG_NAME: 'Respiratory' }, { TAG_NAME: 'MLR Approved' }, { TAG_NAME: 'Congress' },
      ]) // existing Tags
      .mockResolvedValueOnce([
        { NAME: 'Cardiozan Launch Detail Aid' },
        { NAME: 'Cardiozan Campaign Social Post' },
        { NAME: 'Onco-Relief Medical Brochure' },
        { NAME: 'Field Team Onboarding Deck' },
        { NAME: 'Sun Pharma Corporate Overview Video' },
        { NAME: 'DiabetCare Packaging Artwork' },
        { NAME: 'Cardiozan Field Rep Training Module' },
        { NAME: 'DiabetCare Patient Education Brochure' },
        { NAME: 'Onco-Relief Congress Booth Banner' },
        { NAME: 'NeuroCalm Launch Video' },
        { NAME: 'RespiCare Detail Aid' },
        { NAME: 'Q1 Field Force Social Campaign' },
        { NAME: 'RespiCare Patient Companion Guide' },
        { NAME: 'Corporate ESG Impact Report' },
      ]); // existing Assets

    const secondRes = await request(app).post('/admin/seed');
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.personasSeeded).toBe(0);
    expect(secondRes.body.tagsSeeded).toBe(0);
    expect(secondRes.body.assetsSeeded).toBe(0);
    expect(secondRes.body.usageLogsSeeded).toBe(0);
    expect(insertRows).not.toHaveBeenCalled();
    expect(insertRow).not.toHaveBeenCalled();
  });
});
