// routes/momentum.js
import express from 'express';
import getRawMomentum from '../services/rawMomentumService.js';
import { fetchVWAPandTime, fetchOpenClose } from '../utils/fmpService.js';

const router = express.Router();

router.get('/:bucket', async (req, res) => {
  const bucket = req.params.bucket;

  try {
    const data = await getRawMomentum(bucket);

    async function enrich(r) {
      const { ticker, price: lastPrice = null, rvol = 0 } = r;
      const [{ open, close }, { vwap, time }] = await Promise.all([
        fetchOpenClose(ticker),
        fetchVWAPandTime(ticker),
      ]);

      // Skip if essential data is missing
      if (open == null || vwap == null) {
        console.warn(`⚠️ Skipping ${ticker}: missing open or vwap`);
        return null;
      }

      const price = lastPrice ?? close;
      const changeFromOpen = ((price - open) / open) * 100;
      const type =
        changeFromOpen > 0 ? '↑' :
        changeFromOpen < 0 ? '↓' :
        '→';

      let entry = '—';
      const dev = ((price - vwap) / vwap) * 100;
      if (Math.abs(dev) > 2) {
        entry = dev > 0 ? 'Short Reversion' : 'Long Reversion';
      } else if (rvol > 2) {
        entry = price > vwap ? 'Long Bias' : 'Short Bias';
      } else if (Math.abs(dev) < 0.2) {
        entry = 'Bounce Zone';
      }

      return {
        ...r,
        open,
        close,
        change_from_open: changeFromOpen,
        type,
        vwap,
        time,
        entry,
      };
    }

    // Enrich and filter out nulls
    const [high, low] = await Promise.all([
      Promise.all(data.high_float.map(enrich)).then(arr => arr.filter(x => x)),
      Promise.all(data.low_float .map(enrich)).then(arr => arr.filter(x => x)),
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