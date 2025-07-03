// routes/momentum.js
import express from 'express';
import getRawMomentum from '../services/rawMomentumService.js';
import { fetchOpenClose, fetchVWAPandTime } from '../utils/fmpService.js';

const router = express.Router();

router.get('/:bucket', async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const data   = await getRawMomentum(bucket);

    async function enrich(r) {
      const { ticker, price, rvol } = r;
      const [{ open, close }, { vwap, time }] =
        await Promise.all([fetchOpenClose(ticker), fetchVWAPandTime(ticker)]);

      // Skip if missing essential data
      if (open == null || vwap == null) {
        console.warn(`Skipping ${ticker}`);
        return null;
      }

      const finalPrice     = price ?? close;
      const changeFromOpen = ((finalPrice - open) / open) * 100;
      let entry            = '—';
      const dev            = ((finalPrice - vwap) / vwap) * 100;

      if (Math.abs(dev) > 2) {
        entry = dev > 0 ? 'Short Reversion' : 'Long Reversion';
      } else if (rvol > 2) {
        entry = finalPrice > vwap ? 'Long Bias' : 'Short Bias';
      } else if (Math.abs(dev) < 0.2) {
        entry = 'Bounce Zone';
      }

      return { ...r, open, close, change_from_open: changeFromOpen, vwap, time, entry };
    }

    const [high, low] = await Promise.all([
      Promise.all(data.high_float.map(enrich)).then(a => a.filter(Boolean)),
      Promise.all(data.low_float .map(enrich)).then(a => a.filter(Boolean)),
    ]);

    res.json({
      market_status: data.market_status,
      note:          data.note,
      timestamp:     data.timestamp,
      high_float:    high,
      low_float:     low,
    });
  } catch (err) {
    console.error('Momentum route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;