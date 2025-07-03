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
      const [{ open, close }, { vwap, time }] = await Promise.all([
        fetchOpenClose(ticker),
        fetchVWAPandTime(ticker),
      ]);

      if (open == null || vwap == null) {
        console.warn(`Skipping ${ticker}`);
        return null;
      }

      const finalPrice = price ?? close;
      const change     = ((finalPrice - open) / open) * 100;
      const entry      = Math.abs((finalPrice - vwap) / vwap) > 2
        ? (finalPrice > vwap ? 'Short Reversion' : 'Long Reversion')
        : rvol > 2
          ? (finalPrice > vwap ? 'Long Bias' : 'Short Bias')
          : '—';

      return { ...r, open, close, change_from_open: change, vwap, time, entry };
    }

    const [high, low] = await Promise.all([
      Promise.all(data.high_float.map(enrich)).then(a => a.filter(Boolean)),
      Promise.all(data.low_float .map(enrich)).then(a => a.filter(Boolean))
    ]);

    res.json({ market_status: data.market_status,
               note: data.note,
               timestamp: data.timestamp,
               high_float: high,
               low_float: low });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;