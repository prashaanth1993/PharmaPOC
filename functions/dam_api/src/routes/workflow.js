'use strict';
const express = require('express');
const { query, insertRow, updateRow, escapeZcql } = require('../db');

const router = express.Router();

async function getAsset(catalystApp, id) {
  const rows = await query(catalystApp, `SELECT * FROM Assets WHERE ROWID = '${escapeZcql(id)}'`, 'Assets');
  return rows[0] || null;
}

function logAction(catalystApp, assetId, action, actorPersona, actorRole, comments = '') {
  return insertRow(catalystApp, 'ApprovalWorkflow', {
    ASSET_ID: assetId, ACTION: action, ACTOR_PERSONA: actorPersona, ACTOR_ROLE: actorRole, COMMENTS: comments,
  });
}

router.post('/:id/submit', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'Draft') return res.status(400).json({ error: 'Only a Draft asset can be submitted for review' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'UnderReview' });
    await logAction(req.catalystApp, req.params.id, 'Submitted', req.body.actorPersona, req.body.actorRole);
    res.status(200).json({ status: 'UnderReview' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'UnderReview') return res.status(400).json({ error: 'Only an UnderReview asset can be approved' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'Published', EFFECTIVE_DATE: new Date().toISOString() });
    await logAction(req.catalystApp, req.params.id, 'Approved', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'Published' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const asset = await getAsset(req.catalystApp, req.params.id);
    if (!asset || asset.STATUS !== 'UnderReview') return res.status(400).json({ error: 'Only an UnderReview asset can be rejected' });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, STATUS: 'Draft' });
    await logAction(req.catalystApp, req.params.id, 'Rejected', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'Draft' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/delegate', async (req, res) => {
  try {
    await logAction(req.catalystApp, req.params.id, 'Delegated', req.body.actorPersona, req.body.actorRole, req.body.comments || '');
    res.status(200).json({ status: 'delegated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/annotate', async (req, res) => {
  try {
    const { xPercent, yPercent, timestampSec, comment, authorPersona } = req.body;
    if (!comment) return res.status(400).json({ error: 'comment is required' });
    const annotation = await insertRow(req.catalystApp, 'Annotations', {
      ASSET_ID: req.params.id, X_PERCENT: xPercent ?? null, Y_PERCENT: yPercent ?? null,
      TIMESTAMP_SEC: timestampSec ?? null, COMMENT: comment, AUTHOR_PERSONA: authorPersona,
    });
    res.status(201).json({ annotation });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/version', async (req, res) => {
  try {
    const { fileUrl, changedBy, changeNotes, versionNumber } = req.body;
    if (!fileUrl || !versionNumber) return res.status(400).json({ error: 'fileUrl and versionNumber are required' });
    const version = await insertRow(req.catalystApp, 'AssetVersions', {
      ASSET_ID: req.params.id, VERSION_NUMBER: versionNumber, FILE_URL: fileUrl, CHANGED_BY: changedBy, CHANGE_NOTES: changeNotes || '',
    });
    await updateRow(req.catalystApp, 'Assets', { ROWID: req.params.id, CURRENT_VERSION: versionNumber, FILE_URL: fileUrl });
    res.status(201).json({ version });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
