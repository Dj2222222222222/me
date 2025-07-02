import fetch from 'node-fetch';

const FMP_KEY      = process.env.FMP_KEY;
const INTRADAY_V3  = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
const HIST_FULL_V3 = 'https://financialmodelingprep.com/api/v3/historical-price-full/';

// debug: verify your API key is loaded
console.log('🗝 Loaded FMP_KEY:', FMP_KEY ? FMP_KEY.slice(0, 5) + '…' : '⚠️ no key');

export async function fetchOpenClose(ticker) {
  console.log(`Fetching open/close for ${ticker}`);
  try {
    const resp = await fetch(`${HIST_FULL_V3}${ticker}?apikey=${FMP_KEY}`);
    const json = await resp.json();
    console.log(`FMP open/close response for ${ticker}:`, json.historical?.[0]);
    const hist = json.historical;
    if (Array.isArray(hist) && hist.length) {
      return { open: hist[0].open, close: hist[0].close };
    }
  } catch (err) {
    console.warn(`Open/Close error for ${ticker}`, err);
  }
  return { open: null, close: null };
}

export async function fetchVWAPandTime(ticker) {
  console.log(`Fetching VWAP/time for ${ticker}`);
  try {
    // 1) Try intraday bars
    const res1 = await fetch(`${INTRADAY_V3}${ticker}?apikey=${FMP_KEY}`);
    const bars = await res1.json();
    if (Array.isArray(bars) && bars.length > 20) {
      const today = bars[0].date.split(' ')[0];
      let tpv = 0, vol = 0;
      bars.forEach(bar => {
        if (bar.date.startsWith(today)) {
          const tp = (bar.high + bar.low + bar.close) / 3;
          tpv += tp * bar.volume;
          vol += bar.volume;
        }
      });
      const lastBar = bars[bars.length - 1];
      const intradayVWAP = vol ? tpv / vol : null;
      const timeStr = new Date(lastBar.date)
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      console.log(`Intraday VWAP for ${ticker}:`, intradayVWAP);
      return { vwap: intradayVWAP, time: timeStr };
    }

    // 2) Fallback to EOD full history
    const res2 = await fetch(`${HIST_FULL_V3}${ticker}?apikey=${FMP_KEY}`);
    const histJson = await res2.json();
    const histArr = histJson.historical;
    console.log(`EOD VWAP for ${ticker}:`, histArr?.[0]?.vwap);
    if (Array.isArray(histArr) && histArr.length) {
      const rec = histArr[0];
      return { vwap: rec.vwap ?? null, time: `EOD ${rec.date}` };
    }
  } catch (err) {
    console.warn(`VWAP+Time error for ${ticker}`, err);
  }
  return { vwap: null, time: '—' };
}
export async function marketStatus() {
  try {
    const url = `https://financialmodelingprep.com/api/v3/is-the-market-open?apikey=${process.env.FMP_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.isTheStockMarketOpen === true ? 'open' : 'closed';
  } catch (err) {
    console.warn('⚠️ Failed to check market status:', err);
    return 'unknown';
  }
}