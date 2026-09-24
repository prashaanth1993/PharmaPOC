'use strict';
const express = require('express');
const { query, insertRow, insertRows } = require('../db');

const router = express.Router();

router.get('/analytics', async (req, res) => {
  try {
    const assets = await query(req.catalystApp, 'SELECT ROWID FROM Assets', 'Assets');
    const usage = await query(req.catalystApp, 'SELECT ACTION FROM UsageLog', 'UsageLog');
    res.status(200).json({ totalAssets: assets.length, usageEvents: usage.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/audit', async (req, res) => {
  try {
    const audit = await query(req.catalystApp, 'SELECT * FROM ApprovalWorkflow ORDER BY ROWID DESC LIMIT 0, 100', 'ApprovalWorkflow');
    res.status(200).json({ audit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/tags', async (req, res) => {
  try {
    const tags = await query(req.catalystApp, 'SELECT * FROM Tags', 'Tags');
    res.status(200).json({ tags });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tags', async (req, res) => {
  try {
    const tag = await insertRow(req.catalystApp, 'Tags', { TAG_NAME: req.body.tagName, TAG_CATEGORY: req.body.tagCategory || '' });
    res.status(201).json({ tag });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/personas', async (req, res) => {
  try {
    const personas = await query(req.catalystApp, 'SELECT * FROM Personas', 'Personas');
    res.status(200).json({ personas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function placeholderSvg(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-size="28" fill="#fff" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
}

const SAMPLE_ASSETS = [
  { name: 'Cardiozan Launch Detail Aid', assetType: 'Detail Aid', func: 'Sales/Field Enablement', process: 'Field Enablement', brand: 'Cardiozan', market: 'Nigeria', status: 'Published', color: '#7c3aed' },
  { name: 'Cardiozan Campaign Social Post', assetType: 'Social Post', func: 'Marketing', process: 'Campaign', brand: 'Cardiozan', market: 'Philippines', status: 'Published', color: '#2563eb' },
  { name: 'Onco-Relief Medical Brochure', assetType: 'Brochure', func: 'Medical Affairs', process: 'Medical Education', brand: 'Onco-Relief', market: 'Kenya', status: 'UnderReview', color: '#ea580c' },
  { name: 'Field Team Onboarding Deck', assetType: 'Presentation', func: 'Training & Learning', process: 'Onboarding', brand: 'Corporate', market: 'Vietnam', status: 'Draft', color: '#0d9488' },
  { name: 'Sun Pharma Corporate Overview Video', assetType: 'Video', func: 'Corporate Communications', process: 'Campaign', brand: 'Corporate', market: 'Global', status: 'Published', color: '#dc2626' },
  { name: 'DiabetCare Packaging Artwork', assetType: 'Image', func: 'Marketing', process: 'Product Launch', brand: 'DiabetCare', market: 'Indonesia', status: 'Draft', color: '#16a34a' },
];

router.post('/seed', async (req, res) => {
  try {
    await insertRows(req.catalystApp, 'Personas', [
      { NAME: 'Priya Sharma', ROLE: 'Brand Manager', MARKET: 'Nigeria' },
      { NAME: 'Dr. Anil Rao', ROLE: 'Reviewer', MARKET: 'Global' },
      { NAME: 'Sun Pharma Admin', ROLE: 'Admin', MARKET: 'Global' },
      { NAME: 'Field Agency Partner', ROLE: 'Agency Viewer', MARKET: 'Philippines' },
    ]);
    await insertRows(req.catalystApp, 'Tags', [
      { TAG_NAME: 'Launch', TAG_CATEGORY: 'Campaign' },
      { TAG_NAME: 'Field', TAG_CATEGORY: 'Content Type' },
      { TAG_NAME: 'Digital', TAG_CATEGORY: 'Content Type' },
      { TAG_NAME: 'Cardiovascular', TAG_CATEGORY: 'Therapeutic Area' },
    ]);
    const bucket = req.catalystApp.stratus().bucket(process.env.STRATUS_BUCKET);
    const inserted = [];
    for (const sample of SAMPLE_ASSETS) {
      const key = `seed/${sample.name.replace(/\s+/g, '-')}.svg`;
      await bucket.putObject(key, placeholderSvg(sample.name, sample.color), { contentType: 'image/svg+xml', overwrite: true });
      const fileUrl = `https://${process.env.STRATUS_BUCKET}-development.zohostratus.in/${key}`;
      const asset = await insertRow(req.catalystApp, 'Assets', {
        NAME: sample.name, ASSET_TYPE: sample.assetType, FUNCTION: sample.func, PROCESS: sample.process,
        BRAND: sample.brand, MARKET: sample.market, LANGUAGE: 'English', USAGE_RIGHTS: 'Internal',
        STATUS: sample.status, CURRENT_VERSION: '1', FILE_URL: fileUrl, THUMBNAIL_URL: fileUrl,
        UPLOADED_BY: 'Priya Sharma',
      });
      inserted.push(asset);
    }

    // Seed a handful of UsageLog rows so /admin/analytics has non-zero usageEvents
    // right after seeding, referencing a few of the just-inserted sample assets.
    const usageLogSeeds = [];
    if (inserted[0] && inserted[0].ROWID) {
      usageLogSeeds.push({ ASSET_ID: inserted[0].ROWID, ACTION: 'View', PERSONA: 'Field Agency Partner', CHANNEL: 'DAM Demo' });
      usageLogSeeds.push({ ASSET_ID: inserted[0].ROWID, ACTION: 'Download', PERSONA: 'Priya Sharma', CHANNEL: 'DAM Demo' });
    }
    if (inserted[1] && inserted[1].ROWID) {
      usageLogSeeds.push({ ASSET_ID: inserted[1].ROWID, ACTION: 'View', PERSONA: 'Dr. Anil Rao', CHANNEL: 'DAM Demo' });
    }
    if (inserted[4] && inserted[4].ROWID) {
      usageLogSeeds.push({ ASSET_ID: inserted[4].ROWID, ACTION: 'Download', PERSONA: 'Field Agency Partner', CHANNEL: 'DAM Demo' });
    }
    for (const usageLog of usageLogSeeds) {
      await insertRow(req.catalystApp, 'UsageLog', usageLog);
    }

    res.status(200).json({ personasSeeded: 4, tagsSeeded: 4, assetsSeeded: inserted.length, usageLogsSeeded: usageLogSeeds.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
