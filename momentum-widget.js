(async function () {
  const API_BASE = 'https://myze-thya.onrender.com';
  const FMP_KEY = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params = new URLSearchParams(window.location.search);
  const BUCKET = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  const FMP_EOD = 'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=';
  const FMP_INTRADAY = 'https://financialmodelingprep.com/stable/historical-chart/1min?symbol=';

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
    } catch (err) {
      console.warn(`Open/Close fetch failed for ${ticker}`, err);
      return { open: null, close: null };
    }
  }

  async function fetchVWAPandTime(ticker) {
    try {
      const res = await fetch(`${FMP_INTRADAY}${ticker}&apikey=${FMP_KEY}`);
      const candles = await res.json();
      if (!Array.isArray(candles) || !candles.length) return { vwap: null, time: '—' };

      const recentDate = candles[0].date.split(' ')[0];
      let tpv = 0, vol = 0;
      let lastBar = candles[candles.length - 1];

      candles
        .filter(bar => bar.date.startsWith(recentDate))
        .forEach(bar => {
          const tp = (bar.high + bar.low + bar.close) / 3;
          tpv += tp * bar.volume;
          vol += bar.volume;
        });

      return {
        vwap: vol ? tpv / vol : null,
        time: new Date(lastBar.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (err) {
      console.warn(`VWAP fetch failed for ${ticker}`, err);
      return { vwap: null, time: '—' };
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
  async function buildTable(data, title, strategyLabel) {
    const wrap = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = title;
    wrap.appendChild(h2);

    if (!data.length) {
      const nd = document.createElement('div');
      nd.className = 'no-data';
      nd.textContent = `No ${title} data`;
      wrap.appendChild(nd);
      return wrap;
    }

    const tbl = document.createElement('table');
    const trh = tbl.createTHead().insertRow();
    const headers = [
      'Strategy', 'Time', 'Type', 'Symbol', 'Price',
      'Chg %', 'Gap %', 'Volume', '% Float', 'ATR', 'VWAP', 'Entry'
    ];
    headers.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      trh.appendChild(th);
    });

    const tbody = tbl.createTBody();

    for (const r of data) {
      const tr = tbody.insertRow();
      const ticker = r.ticker ?? '—';
      const strategy = r.strategy ?? strategyLabel;
      const volume = r.volume ?? 0;
      const float = r.float ?? 0;
      const floatPct = float > 0 ? (volume / float) * 100 : null;
      const atr = r.atr ?? null;
      const gap = r.gap_pct ?? 0;

      const { open, close } = await fetchOpenClose(ticker);
      const { vwap, time } = await fetchVWAPandTime(ticker);

      const price = r.price ?? close ?? 0;
      const change = open ? ((price - open) / open) * 100 : null;
      const deviation = vwap ? ((price - vwap) / vwap) * 100 : null;
      const rvol = r.rvol ?? r.rvol_value ?? 0;

      let signal = '—';
      if (vwap) {
        if (Math.abs(deviation) > 2) {
          signal = deviation > 0 ? 'Short Reversion' : 'Long Reversion';
        } else if (rvol > 2) {
          signal = price > vwap ? 'Long Bias' : price < vwap ? 'Short Bias' : '—';
        } else if (Math.abs(deviation) < 0.2) {
          signal = 'Bounce Zone';
        }
      }

      const cells = [
        strategy, time, arrow(change), ticker, fmt(price),
        fmt(change), fmt(gap), abbrMil(volume), fmt(floatPct, 1),
        fmt(atr), vwap ? fmt(vwap) : '—', signal
      ];

      const colorMap = {
        5: { val: change, field: 'change' },
        6: { val: gap, field: 'gap_pct' },
        7: { val: volume, field: 'volume' },
        8: { val: floatPct, field: 'float_pct' },
        9: { val: atr, field: 'atr' }
      };

      cells.forEach((val, i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = strategy === 'LOW' ? 'green-bright' : 'green-dark';
        } else if (colorMap[i]) {
          td.classList.add(getColor(colorMap[i].val, colorMap[i].field));
        }
      });
    }

    wrap.appendChild(tbl);
    return wrap;
  }

  async function renderWidget(j) {
    renderHeader(j);
    const out = document.getElementById('mkt-tables');
    out.innerHTML = '';

    if (BUCKET === 'raw') {
      out.appendChild(await buildTable(j.high_float, 'High-Float Momentum', 'HIGH'));
      out.appendChild(await buildTable(j.low_float, 'Low-Float Momentum', 'LOW'));
    } else if (BUCKET === 'high') {
      out.appendChild(await buildTable(j.high_float, 'High-Float Momentum', 'HIGH'));
    } else {
      out.appendChild(await buildTable(j.low_float, 'Low-Float Momentum', 'LOW'));
    }
  }

  async function refresh() {
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      await renderWidget(data);
    } catch (err) {
      console.error('refresh() error:', err);
      document.getElementById('mkt-tables').innerHTML =
        `<div class="no-data">No data available for bucket “${BUCKET}”</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(refresh, 60000);
  });
})();
  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note').textContent = meta.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(meta.timestamp * 1000).toLocaleTimeString();
  }