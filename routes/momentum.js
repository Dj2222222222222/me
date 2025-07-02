// server/routes/momentum.js
import express from 'express';
import getRawMomentum from '../services/rawMomentumService.js';
import { fetchVWAPandTime, fetchOpenClose } from '../utils/fmpService.js';

const router = express.Router();

router.get('/:bucket', async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const j      = await getRawMomentum(bucket);

    async function enrich(r) {
      const ticker = r.ticker;
      // 1) Grab open/close & VWAP+time
      const [{ open, close }, { vwap, time }] = await Promise.all([
        fetchOpenClose(ticker),
        fetchVWAPandTime(ticker)
      ]);

      // 2) Determine price (live or last close)
      const price = r.price ?? close ?? 0;

      // 3) **Always calculate change from open here** ⇩
      const change = open != null
        ? ((price - open) / open) * 100
        : null;

      // 4) Arrow type based on that change
      const type = change != null
        ? change > 0 ? '↑' : change < 0 ? '↓' : '→'
        : '→';

      // 5) Entry logic unchanged
      const dev = (vwap != null) ? ((price - vwap) / vwap) * 100 : null;
      let entry = '—';
      if (dev != null) {
        if (Math.abs(dev) > 2)          entry = dev > 0 ? 'Short Reversion' : 'Long Reversion';
        else if ((r.rvol ?? 0) > 2)     entry = price > vwap ? 'Long Bias' : 'Short Bias';
        else if (Math.abs(dev) < 0.2)   entry = 'Bounce Zone';
      }

      return {
        ...r,
        open,
        close,
        change_from_open: change,
        type,
        vwap,
        time,
        entry
      };
    }

    // Enrich both arrays in parallel
    const [high, low] = await Promise.all([
      Promise.all(j.high_float.map(enrich)),
      Promise.all(j.low_float.map(enrich))
    ]);

    res.json({
      market_status: j.market_status,
      note: j.note,
      timestamp: j.timestamp,
      high_float: high,
      low_float: low
    });
  } catch (err) {
    console.error('Momentum error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;