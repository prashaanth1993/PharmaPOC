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

// Brand -> real Sun Pharma therapeutic franchise. Product names stay
// deliberately fictional (this is a vendor POC, not real marketed-product
// collateral), but every brand is grounded in one of Sun Pharma's actual
// major therapeutic areas so the taxonomy reads as built for Sun Pharma
// specifically, not a generic pharma template.
const THERAPEUTIC_AREA_BY_BRAND = {
  Cardiozan: 'Cardiovascular',
  'Onco-Relief': 'Oncology',
  DiabetCare: 'Diabetes Care',
  NeuroCalm: 'CNS / Neurology',
  RespiCare: 'Respiratory',
};

const SAMPLE_ASSETS = [
  { name: 'Cardiozan Launch Detail Aid', assetType: 'Detail Aid', func: 'Sales/Field Enablement', process: 'Field Enablement', brand: 'Cardiozan', market: 'Nigeria', status: 'Published', expiryDate: '2027-08-01 00:00:00', color: '#7c3aed' },
  { name: 'Cardiozan Campaign Social Post', assetType: 'Social Post', func: 'Marketing', process: 'Campaign', brand: 'Cardiozan', market: 'Philippines', status: 'Published', expiryDate: '2027-10-15 00:00:00', color: '#2563eb' },
  { name: 'Onco-Relief Medical Brochure', assetType: 'Brochure', func: 'Medical Affairs', process: 'Medical Education', brand: 'Onco-Relief', market: 'Kenya', status: 'UnderReview', color: '#ea580c' },
  { name: 'Field Team Onboarding Deck', assetType: 'Presentation', func: 'Training & Learning', process: 'Onboarding', brand: 'Corporate', market: 'Vietnam', status: 'Draft', expiryDate: '2027-06-30 00:00:00', color: '#0d9488' },
  { name: 'Sun Pharma Corporate Overview Video', assetType: 'Video', func: 'Corporate Communications', process: 'Campaign', brand: 'Corporate', market: 'Global', status: 'Published', expiryDate: '2027-12-01 00:00:00', color: '#dc2626' },
  { name: 'DiabetCare Packaging Artwork', assetType: 'Image', func: 'Marketing', process: 'Product Launch', brand: 'DiabetCare', market: 'Indonesia', status: 'Draft', expiryDate: '2027-11-30 00:00:00', color: '#16a34a' },
  // Second wave — deliberately skews toward Draft/UnderReview (the first six had
  // all drifted to Published over the course of demo/testing), spans two new
  // brands and five markets not covered above, so every persona has real,
  // varied content to work with rather than a handful of look-alike rows.
  { name: 'Cardiozan Field Rep Training Module', assetType: 'Presentation', func: 'Training & Learning', process: 'Onboarding', brand: 'Cardiozan', market: 'Kenya', status: 'Draft', color: '#0891b2' },
  { name: 'DiabetCare Patient Education Brochure', assetType: 'Brochure', func: 'Medical Affairs', process: 'Medical Education', brand: 'DiabetCare', market: 'Vietnam', status: 'UnderReview', color: '#65a30d' },
  { name: 'Onco-Relief Congress Booth Banner', assetType: 'Image', func: 'Marketing', process: 'Congress-Event', brand: 'Onco-Relief', market: 'Bangladesh', status: 'Draft', color: '#c2410c' },
  { name: 'NeuroCalm Launch Video', assetType: 'Video', func: 'Marketing', process: 'Product Launch', brand: 'NeuroCalm', market: 'Sri Lanka', status: 'UnderReview', color: '#7e22ce' },
  { name: 'RespiCare Detail Aid', assetType: 'Detail Aid', func: 'Sales/Field Enablement', process: 'Field Enablement', brand: 'RespiCare', market: 'Ghana', status: 'Published', expiryDate: '2027-12-31 00:00:00', color: '#0d9488' },
  { name: 'Q1 Field Force Social Campaign', assetType: 'Social Post', func: 'Marketing', process: 'Campaign', brand: 'Cardiozan', market: 'Nigeria', status: 'Draft', color: '#1d4ed8' },
  { name: 'RespiCare Patient Companion Guide', assetType: 'Brochure', func: 'Medical Affairs', process: 'Medical Education', brand: 'RespiCare', market: 'Philippines', status: 'UnderReview', color: '#15803d' },
  { name: 'Corporate ESG Impact Report', assetType: 'Presentation', func: 'Corporate Communications', process: 'Campaign', brand: 'Corporate', market: 'Global', status: 'Draft', color: '#b91c1c' },
];

const PERSONA_SEEDS = [
  { NAME: 'Priya Sharma', ROLE: 'Brand Manager', MARKET: 'Nigeria' },
  { NAME: 'Dr. Anil Rao', ROLE: 'Reviewer', MARKET: 'Global' },
  { NAME: 'Sun Pharma Admin', ROLE: 'Admin', MARKET: 'Global' },
  { NAME: 'Field Agency Partner', ROLE: 'Agency Viewer', MARKET: 'Philippines' },
];

const TAG_SEEDS = [
  { TAG_NAME: 'Launch', TAG_CATEGORY: 'Campaign' },
  { TAG_NAME: 'Field', TAG_CATEGORY: 'Content Type' },
  { TAG_NAME: 'Digital', TAG_CATEGORY: 'Content Type' },
  { TAG_NAME: 'Cardiovascular', TAG_CATEGORY: 'Therapeutic Area' },
  { TAG_NAME: 'Oncology', TAG_CATEGORY: 'Therapeutic Area' },
  { TAG_NAME: 'Diabetes Care', TAG_CATEGORY: 'Therapeutic Area' },
  { TAG_NAME: 'CNS / Neurology', TAG_CATEGORY: 'Therapeutic Area' },
  { TAG_NAME: 'Respiratory', TAG_CATEGORY: 'Therapeutic Area' },
  { TAG_NAME: 'MLR Approved', TAG_CATEGORY: 'Compliance' },
  { TAG_NAME: 'Congress', TAG_CATEGORY: 'Campaign' },
];

router.post('/seed', async (req, res) => {
  try {
    // Personas: only insert the ones that don't already exist (by NAME), so
    // re-running /admin/seed never hits a uniqueness error and never duplicates rows.
    const existingPersonas = await query(req.catalystApp, 'SELECT NAME FROM Personas', 'Personas');
    const existingPersonaNames = new Set(existingPersonas.map((p) => p.NAME));
    const newPersonas = PERSONA_SEEDS.filter((p) => !existingPersonaNames.has(p.NAME));
    if (newPersonas.length) {
      await insertRows(req.catalystApp, 'Personas', newPersonas);
    }

    // Tags: same skip-if-exists pattern, keyed on TAG_NAME.
    const existingTags = await query(req.catalystApp, 'SELECT TAG_NAME FROM Tags', 'Tags');
    const existingTagNames = new Set(existingTags.map((t) => t.TAG_NAME));
    const newTags = TAG_SEEDS.filter((t) => !existingTagNames.has(t.TAG_NAME));
    if (newTags.length) {
      await insertRows(req.catalystApp, 'Tags', newTags);
    }

    // Sample Assets: same skip-if-exists pattern, keyed on NAME. Skip the Stratus
    // upload entirely for assets that already exist, so re-seeding doesn't re-upload.
    const existingAssets = await query(req.catalystApp, 'SELECT NAME FROM Assets', 'Assets');
    const existingAssetNames = new Set(existingAssets.map((a) => a.NAME));
    const bucket = req.catalystApp.stratus().bucket(process.env.STRATUS_BUCKET);
    const inserted = [];
    for (const sample of SAMPLE_ASSETS) {
      if (existingAssetNames.has(sample.name)) continue;
      const key = `seed/${sample.name.replace(/\s+/g, '-')}.svg`;
      await bucket.putObject(key, placeholderSvg(sample.name, sample.color), { contentType: 'image/svg+xml', overwrite: true });
      const fileUrl = `https://${process.env.STRATUS_BUCKET}-development.zohostratus.in/${key}`;
      const asset = await insertRow(req.catalystApp, 'Assets', {
        NAME: sample.name, ASSET_TYPE: sample.assetType, FUNCTION: sample.func, PROCESS: sample.process,
        BRAND: sample.brand, MARKET: sample.market, LANGUAGE: 'English', USAGE_RIGHTS: 'Internal',
        STATUS: sample.status, CURRENT_VERSION: '1', FILE_URL: fileUrl, THUMBNAIL_URL: fileUrl,
        UPLOADED_BY: 'Priya Sharma', THERAPEUTIC_AREA: THERAPEUTIC_AREA_BY_BRAND[sample.brand] || null,
        EXPIRY_DATE: sample.expiryDate || null,
      });
      inserted.push(asset);
    }

    // Seed a handful of UsageLog rows so /admin/analytics has non-zero usageEvents
    // right after seeding, referencing a few of the just-inserted sample assets.
    // Only do this when this call actually created new assets, so re-running
    // /admin/seed after everything already exists doesn't pile up duplicate usage events.
    const USAGE_ROTATION = [
      { ACTION: 'View', PERSONA: 'Field Agency Partner' },
      { ACTION: 'Download', PERSONA: 'Priya Sharma' },
      { ACTION: 'View', PERSONA: 'Dr. Anil Rao' },
      { ACTION: 'Download', PERSONA: 'Field Agency Partner' },
      { ACTION: 'View', PERSONA: 'Sun Pharma Admin' },
    ];
    const usageLogSeeds = inserted.map((asset, i) => ({
      ASSET_ID: asset.ROWID,
      ...USAGE_ROTATION[i % USAGE_ROTATION.length],
      CHANNEL: 'DAM Demo',
    }));
    for (const usageLog of usageLogSeeds) {
      await insertRow(req.catalystApp, 'UsageLog', usageLog);
    }

    res.status(200).json({
      personasSeeded: newPersonas.length,
      tagsSeeded: newTags.length,
      assetsSeeded: inserted.length,
      usageLogsSeeded: usageLogSeeds.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
