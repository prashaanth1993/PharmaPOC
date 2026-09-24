'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const assetsRouter = require('./src/routes/assets');
const workflowRouter = require('./src/routes/workflow');
const adminRouter = require('./src/routes/admin');
const usageRouter = require('./src/routes/usage');

const app = express();
app.use(express.json());

// Catalyst's Advanced I/O invocation URL always includes a literal "/execute"
// segment (e.g. /server/dam_api/execute/health). Neither `catalyst serve`
// locally nor, per Catalyst's own docs, the deployed gateway strips this
// segment before invoking the function handler -- it is forwarded verbatim
// as part of req.url. Normalize it away here so routes can be defined from
// the app root (as documented for Express-template Advanced I/O functions)
// while remaining a no-op if the segment is already absent (e.g. supertest
// hitting the router directly in unit tests).
app.use((req, res, next) => {
  const match = req.url.match(/^\/execute(\/[^?]*)?(\?.*)?$/);
  if (match) {
    req.url = (match[1] || '/') + (match[2] || '');
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

app.use((req, res, next) => {
  req.catalystApp = catalyst.initialize(req, { scope: 'admin' });
  next();
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/assets', assetsRouter);
app.use('/assets', workflowRouter);
app.use('/admin', adminRouter);
app.use('/usage-log', usageRouter);

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
