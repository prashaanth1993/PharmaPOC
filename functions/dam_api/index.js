'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
app.use(express.json());

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

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
