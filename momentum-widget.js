(async function () {
  const API_BASE = 'https://myze-thya.onrender.com';
  const FMP_1MIN = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
  const FMP_EOD = 'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=';
  const FMP_KEY = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params = new URLSearchParams(window.location.search);
  const BUCKET = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  async function fetchVWAPandTime(ticker) {
    try {
      const res = await fetch(`${FMP_1MIN}${ticker}?apikey=${FMP_KEY}`);
      const candles = await res.json();
      if (!Array.isArray(candles) || candles.length === 0) return { vwap: null, time: '—' };

      const dateGroups = {};
      candles.forEach(bar => {
        const d = bar.date.split(" ")[0];
        dateGroups[d] = (dateGroups[d] || 0) + 1;
      });
      const recentDate = Object.entries(dateGroups)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .find(([_, count]) => count > 50)?.[0];

      let tpv = 0, totalVol = 0;
      let latestTime = '—';

      candles
        .filter(bar => bar.date.startsWith(recentDate))
        .forEach((bar, idx, arr) => {
          const tp = (bar.high + bar.low + bar.close) / 3;
          tpv += tp * bar.volume;
          totalVol += bar.volume;
          if (idx === arr.length - 1) {
            latestTime = new Date(bar.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        });

      return {
        vwap: totalVol > 0 ? tpv / totalVol : null,
        time: latestTime
      };
    } catch {
      return { vwap: null, time: '—' };
    }
  }

  async function fetchOpenClose(ticker) {
    try {
      const res = await fetch(`${FMP_EOD}${ticker}&apikey=${FMP_KEY}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return { open: null, close: null };

      const latest = data[0];
      return {
        open: latest.open ?? null,
        close: latest.close ?? null
      };
    } catch {
      return { open: null, close: null };
    }
  }

  function fmt(v, d = 2) {
    return isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  }

  function abbrMil(v) {
    return isNaN(v) ? '—' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' Mil' : Number(v).toLocaleString();
  }

  function arrow(v) {
    return v > 0 ? '↑' : v < 0 ? '↓' : '→';
  }

  function getColor(val, field) {
    if (field === 'change') {
      if (val <= -50) return 'dark-red';
      if (val <= -10) return 'medium-red';
      if (val < 0) return 'light-red';
      if (val === 0) return 'white';
      if (val < 5) return 'light-green';
      if (val < 15) return 'medium-green';
      if (val < 30) return 'bright-green';
      return 'dark-green';
    }

    if (field === 'gap_pct') {
      if (val < 0) return 'light-red';
      if (val < 5) return 'white';
      if (val < 15) return 'light-yellow';
      if (val < 30) return 'yellow';
      if (val < 50) return 'orange';
      if (val < 100) return 'dark-orange';
      return 'red-orange';
    }

    if (field === 'volume') {
      if (val < 500_000) return 'gray';
      if (val < 2_000_000) return 'light-green';
      if (val < 5_000_000) return 'medium-green';
      if (val < 10_000_000) return 'bright-green';
      if (val < 50_000_000) return 'dark-green';
      return 'highlight-blue';
    }

    if (field === 'float_pct') {
      if (val < 5) return 'gray';
      if (val < 10) return 'light-blue';
      if (val < 20) return 'medium-blue';
      if (val < 50) return 'bright-blue';
      return 'dark-blue';
    }

    if (field === 'atr') {
      if (val < 0.5) return 'light-gray';
      if (val < 1.0) return 'yellow';
      if (val < 2.0) return 'orange';
      return 'red';
    }

    return '';
  }

  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note').textContent = meta.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(meta.timestamp * 1000).toLocaleTimeString();
  }
(async function () {
  const API_BASE = 'https://myze-thya.onrender.com';
  const FMP_1MIN = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
  const FMP_EOD = 'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=';
  const FMP_KEY = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params = new URLSearchParams(window.location.search);
  const BUCKET = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  async function fetchVWAPandTime(ticker) {
    try {
      const res = await fetch(`${FMP_1MIN}${ticker}?apikey=${FMP_KEY}`);
      const candles = await res.json();
      if (!Array.isArray(candles) || candles.length === 0) return { vwap: null, time: '—' };

      const dateGroups = {};
      candles.forEach(bar => {
        const d = bar.date.split(" ")[0];
        dateGroups[d] = (dateGroups[d] || 0) + 1;
      });
      const recentDate = Object.entries(dateGroups)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .find(([_, count]) => count > 50)?.[0];

      let tpv = 0, totalVol = 0;
      let latestTime = '—';

      candles
        .filter(bar => bar.date.startsWith(recentDate))
        .forEach((bar, idx, arr) => {
          const tp = (bar.high + bar.low + bar.close) / 3;
          tpv += tp * bar.volume;
          totalVol += bar.volume;
          if (idx === arr.length - 1) {
            latestTime = new Date(bar.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        });

      return {
        vwap: totalVol > 0 ? tpv / totalVol : null,
        time: latestTime
      };
    } catch {
      return { vwap: null, time: '—' };
    }
  }

  async function fetchOpenClose(ticker) {
    try {
      const res = await fetch(`${FMP_EOD}${ticker}&apikey=${FMP_KEY}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return { open: null, close: null };

      const latest = data[0];
      return {
        open: latest.open ?? null,
        close: latest.close ?? null
      };
    } catch {
      return { open: null, close: null };
    }
  }

  function fmt(v, d = 2) {
    return isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  }

  function abbrMil(v) {
    return isNaN(v) ? '—' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' Mil' : Number(v).toLocaleString();
  }

  function arrow(v) {
    return v > 0 ? '↑' : v < 0 ? '↓' : '→';
  }

  function getColor(val, field) {
    if (field === 'change') {
      if (val <= -50) return 'dark-red';
      if (val <= -10) return 'medium-red';
      if (val < 0) return 'light-red';
      if (val === 0) return 'white';
      if (val < 5) return 'light-green';
      if (val < 15) return 'medium-green';
      if (val < 30) return 'bright-green';
      return 'dark-green';
    }

    if (field === 'gap_pct') {
      if (val < 0) return 'light-red';
      if (val < 5) return 'white';
      if (val < 15) return 'light-yellow';
      if (val < 30) return 'yellow';
      if (val < 50) return 'orange';
      if (val < 100) return 'dark-orange';
      return 'red-orange';
    }

    if (field === 'volume') {
      if (val < 500_000) return 'gray';
      if (val < 2_000_000) return 'light-green';
      if (val < 5_000_000) return 'medium-green';
      if (val < 10_000_000) return 'bright-green';
      if (val < 50_000_000) return 'dark-green';
      return 'highlight-blue';
    }

    if (field === 'float_pct') {
      if (val < 5) return 'gray';
      if (val < 10) return 'light-blue';
      if (val < 20) return 'medium-blue';
      if (val < 50) return 'bright-blue';
      return 'dark-blue';
    }

    if (field === 'atr') {
      if (val < 0.5) return 'light-gray';
      if (val < 1.0) return 'yellow';
      if (val < 2.0) return 'orange';
      return 'red';
    }

    return '';
  }

  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note').textContent = meta.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(meta.timestamp * 1000).toLocaleTimeString();
  }