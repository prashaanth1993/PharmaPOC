// functions/dam_api/test/workflow.test.js
const express = require('express');
const request = require('supertest');
const workflowRouter = require('../src/routes/workflow');

jest.mock('../src/db', () => ({
  query: jest.fn(),
  insertRow: jest.fn(),
  updateRow: jest.fn(),
  escapeZcql: jest.requireActual('../src/db').escapeZcql,
}));
const { query, insertRow, updateRow } = require('../src/db');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.catalystApp = {}; next(); });
  app.use('/assets', workflowRouter);
  return app;
}

afterEach(() => jest.clearAllMocks());

describe('POST /assets/:id/submit', () => {
  test('moves a Draft asset to UnderReview and logs the action', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Draft' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/submit').send({ actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'UnderReview' });
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Submitted' });
  });

  test('rejects submitting an asset that is not Draft', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Published' }]);
    const res = await request(buildApp()).post('/assets/1/submit').send({ actorPersona: 'Priya', actorRole: 'Brand Manager' });
    expect(res.status).toBe(400);
  });
});

describe('POST /assets/:id/approve', () => {
  test('rejects approving an asset that is not UnderReview', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'Draft' }]);
    const res = await request(buildApp()).post('/assets/1/approve').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer' });
    expect(res.status).toBe(400);
  });

  test('moves an UnderReview asset to Published and sets EFFECTIVE_DATE', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'UnderReview' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/approve').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'Published' });
    expect(updateRow.mock.calls[0][2].EFFECTIVE_DATE).toBeDefined();
  });
});

describe('POST /assets/:id/reject', () => {
  test('moves an UnderReview asset back to Draft with a comment', async () => {
    query.mockResolvedValue([{ ROWID: '1', STATUS: 'UnderReview' }]);
    updateRow.mockResolvedValue({});
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/reject').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer', comments: 'Fix the claim wording' });
    expect(res.status).toBe(200);
    expect(updateRow.mock.calls[0][2]).toMatchObject({ ROWID: '1', STATUS: 'Draft' });
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Rejected', COMMENTS: 'Fix the claim wording' });
  });
});

describe('POST /assets/:id/delegate', () => {
  test('logs a Delegated action without changing STATUS', async () => {
    insertRow.mockResolvedValue({});
    const res = await request(buildApp()).post('/assets/1/delegate').send({ actorPersona: 'Dr. Rao', actorRole: 'Reviewer', comments: 'Please review, out of office' });
    expect(res.status).toBe(200);
    expect(insertRow.mock.calls[0][2]).toMatchObject({ ACTION: 'Delegated' });
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe('POST /assets/:id/annotate', () => {
  test('400s when comment is missing', async () => {
    const res = await request(buildApp()).post('/assets/1/annotate').send({ xPercent: 10, yPercent: 20, authorPersona: 'Dr. Rao' });
    expect(res.status).toBe(400);
  });

  test('inserts an annotation row', async () => {
    insertRow.mockResolvedValue({ ROWID: '9' });
    const res = await request(buildApp()).post('/assets/1/annotate').send({ xPercent: 10, yPercent: 20, comment: 'Fix logo placement', authorPersona: 'Dr. Rao' });
    expect(res.status).toBe(201);
    expect(insertRow.mock.calls[0][2]).toMatchObject({ X_PERCENT: 10, Y_PERCENT: 20, COMMENT: 'Fix logo placement' });
  });
});
