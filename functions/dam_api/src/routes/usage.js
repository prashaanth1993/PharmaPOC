'use strict';
const express = require('express');
const { insertRow } = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { assetId, action, persona, channel } = req.body;
    if (!assetId || !action) return res.status(400).json({ error: 'assetId and action are required' });
    const log = await insertRow(req.catalystApp, 'UsageLog', { ASSET_ID: assetId, ACTION: action, PERSONA: persona || '', CHANNEL: channel || '' });
    res.status(201).json({ log });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
