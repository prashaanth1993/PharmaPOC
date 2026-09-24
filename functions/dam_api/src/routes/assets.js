'use strict';
const express = require('express');
const Busboy = require('busboy');
const { query, insertRow, escapeZcql } = require('../db');
const { suggestClassification } = require('../taxonomy');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { role, search, function: func, market, status } = req.query;
    const conditions = [];
    if (role === 'Agency Viewer' || !role) {
      conditions.push("STATUS = 'Published'");
    } else if (status) {
      conditions.push(`STATUS = '${escapeZcql(status)}'`);
    }
    if (search && search.trim()) conditions.push(`NAME LIKE '%${escapeZcql(search.trim())}%'`);
    if (func) conditions.push(`FUNCTION = '${escapeZcql(func)}'`);
    if (market) conditions.push(`MARKET = '${escapeZcql(market)}'`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(req.catalystApp, `SELECT * FROM Assets ${where} ORDER BY ROWID DESC LIMIT 0, 100`, 'Assets');
    res.status(200).json({ assets: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/suggestions', (req, res) => {
  const { assetType } = req.query;
  if (!assetType) return res.status(400).json({ error: 'assetType query param is required' });
  res.status(200).json({ suggestions: suggestClassification(assetType) });
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await query(req.catalystApp, `SELECT * FROM Assets WHERE ROWID = '${escapeZcql(req.params.id)}'`, 'Assets');
    if (!rows.length) return res.status(404).json({ error: 'Asset not found' });
    res.status(200).json({ asset: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    let fileInfo = null;
    const chunks = [];
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      fileInfo = { name: info.filename, mimetype: info.mimeType };
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => { fileInfo.data = Buffer.concat(chunks); });
    });
    bb.on('close', () => resolve({ fields, file: fileInfo }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

router.post('/', async (req, res) => {
  try {
    const { fields, file } = await parseMultipart(req);
    if (!file) return res.status(400).json({ error: 'file is required' });
    const bucket = req.catalystApp.stratus().bucket(process.env.STRATUS_BUCKET);
    const key = `assets/${Date.now()}-${file.name}`;
    await bucket.putObject(key, file.data, { contentType: file.mimetype, overwrite: true });
    const fileUrl = `https://${process.env.STRATUS_BUCKET}-development.zohostratus.in/${key}`;
    const asset = await insertRow(req.catalystApp, 'Assets', {
      NAME: fields.name,
      DESCRIPTION: fields.description || '',
      ASSET_TYPE: fields.assetType,
      FUNCTION: fields.function,
      PROCESS: fields.process || '',
      BRAND: fields.brand || '',
      MARKET: fields.market || '',
      LANGUAGE: fields.language || 'English',
      USAGE_RIGHTS: fields.usageRights || 'Internal',
      STATUS: 'Draft',
      CURRENT_VERSION: '1',
      FILE_URL: fileUrl,
      THUMBNAIL_URL: fileUrl,
      UPLOADED_BY: fields.uploadedBy,
    });
    res.status(201).json({ asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
