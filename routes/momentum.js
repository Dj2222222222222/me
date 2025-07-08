// routes/momentum.js
import express from 'express';
import fetch from 'node-fetch';

const router  = express.Router();
const API_KEY = process.env.FMP_API_KEY;
const BASE    = 'https://financialmodelingprep.com/api/v3';

// ─── Helper: fetch JSON or throw ────────────────────────────
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── 1) Fetch up to 5,000 symbols ───────────────────────────
async function getAllSymbols() {
  const list = await fetchJson(`${BASE}/stock/list?apikey=${API_KEY}`);
  return list.slice(0, 5000).map(x => x.symbol);
}

// ─── 2) Batch‐fetch quotes or fallback to last‐close ────────
async function getQuotes(symbols) {
  const BATCH = 100;
  const out   = [];
  let queue   = symbols.slice();

  while (queue.length) {
    const batch = queue.splice(0, BATCH).join(',');
    let quotes = [];

    try {
      quotes = await fetchJson(`${BASE}/quote/${batch}?apikey=${API_KEY}`);
      if (!Array.isArray(quotes) || !quotes.length) throw 0;
    } catch {
      const hist = await fetchJson(
        `${BASE}/historical-price-full/${batch}?limit=1&apikey=${API_KEY}`
      );
      quotes = hist.map(h => {
        const d = h.historical[0];
        return {
          symbol:        h.symbol,
          open:          d.open,
          close:         d.close,
          dayHigh:       d.high,
          dayLow:        d.low,
          previousClose: d.close,
          volume:        d.volume,
          avgVolume:     d.volume
        };
      });
    }

    out.push(...quotes);
  }

  return out;
}

// ─── 3) Enrich with RVOL, change, gap%, ATR, VWAP ───────────
function enrich(quotes) {
  return quotes.map(q => {
    const open  = Number(q.open)          || 0;
    const prevC = Number(q.previousClose) || open;
    const high  = Number(q.dayHigh)       || open;
    const low   = Number(q.dayLow)        || open;
    const vol   = Number(q.volume)        || 0;
    const avgV  = Number(q.avgVolume)     || vol || 1;

    const rvol   = avgV > 0 ? vol / avgV : 0;
    const change = prevC > 0 ? (open - prevC) / prevC * 100 : 0;
    const tr     = Math.max(
      high - low,
      Math.abs(high - prevC),
      Math.abs(prevC - low)
    );
    const atr  = tr;
    const vwap = (high + low + Number(q.close)) / 3;

    return {
      ticker:           q.symbol,
      price:            open,
      float:            Number(q.floatShares || q.sharesOutstanding || 0),
      rvol,
      change_from_open: change,
      gap_pct:          change,
      atr,
      vwap,
      volume:           vol
    };
  });
}

// ─── 4) Filter, sort by RVOL & pick top 15 ─────────────────
function pickTop(data, floatTest) {
  return data
    .filter(x => x.price >= 1 && floatTest(x.float))
    .sort((a, b) => b.rvol - a.rvol)
    .slice(0, 15);
}

// ─── /momentum/low ──────────────────────────────────────────
router.get('/low', async (req, res) => {
  try {
    const symbols  = await getAllSymbols();
    const quotes   = await getQuotes(symbols);
    const items    = enrich(quotes);
    const lowFloat = pickTop(items, f => f > 0 && f < 50_000_000);
    return res.json(lowFloat);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── /momentum/high ─────────────────────────────────────────
router.get('/high', async (req, res) => {
  try {
    const symbols   = await getAllSymbols();
    const quotes    = await getQuotes(symbols);
    const items     = enrich(quotes);
    const highFloat = pickTop(items, f => f >= 100_000_000);
    return res.json(highFloat);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── /momentum/all (optional) ───────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const symbols   = await getAllSymbols();
    const quotes    = await getQuotes(symbols);
    const items     = enrich(quotes);
    const lowFloat  = pickTop(items, f => f > 0 && f < 50_000_000);
    const highFloat = pickTop(items, f => f >= 100_000_000);
    return res.json({ lowFloat, highFloat });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
