(async function () {
  const API_BASE = 'https://myze-thya.onrender.com';
  const FMP_API = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
  const FMP_KEY = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params = new URLSearchParams(window.location.search);
  const BUCKET = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  async function fetchVWAP(ticker) {
    try {
      const res = await fetch(`${FMP_API}${ticker}?apikey=${FMP_KEY}`);
      const candles = await res.json();
      if (!Array.isArray(candles) || candles.length === 0) return null;

      const dateCounts = {};
      candles.forEach(bar => {
        const d = bar.date.split(" ")[0];
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      });
      const sortedDates = Object.entries(dateCounts)
        .sort((a, b) => b[0].localeCompare(a[0]));
      const recentDate = sortedDates.find(([_, count]) => count > 50)?.[0];

      let tpv = 0, totalVol = 0;
      candles
        .filter(bar => bar.date.startsWith(recentDate))
        .forEach(bar => {
          const tp = (bar.high + bar.low + bar.close) / 3;
          tpv += tp * bar.volume;
          totalVol += bar.volume;
        });

      return totalVol > 0 ? tpv / totalVol : null;
    } catch (err) {
      console.warn(`VWAP fetch failed for ${ticker}:`, err);
      return null;
    }
  }

  function arrow(v) {
    return v > 0 ? '↑' : v < 0 ? '↓' : '→';
  }

  function abbrMil(v) {
    return isNaN(v) ? '—' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' Mil' : Number(v).toLocaleString();
  }

  function fmt(v, d = 2) {
    return isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  }

  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note').textContent = meta.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(meta.timestamp * 1000).toLocaleTimeString();
  }
  function getColor(val, field) {
    if (field === 'change_from_open') {
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
      const price = r.price ?? 0;
      const timestamp = r.timestamp
        ? new Date(r.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const vwap = await fetchVWAP(r.ticker);
      const deviation = vwap ? ((price - vwap) / vwap) * 100 : null;
      const rvol = r.rvol ?? r.rvol_value ?? null;
      const atr = r.atr ?? null;
      const floatPct = r.float && r.volume ? (r.volume / r.float * 100) : null;

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

      const fields = {
        5: { val: r.change_from_open ?? 0, key: 'change_from_open' },
        6: { val: r.gap_pct ?? 0, key: 'gap_pct' },
        7: { val: r.volume ?? 0, key: 'volume' },
        8: { val: floatPct ?? 0, key: 'float_pct' },
        9: { val: atr ?? 0, key: 'atr' }
      };

      const cells = [
        r.strategy ?? strategyLabel,
        timestamp,
        arrow(r.change_from_open ?? r.change_pct ?? 0),
        r.ticker ?? '—',
        fmt(price),
        fmt(fields[5].val),
        fmt(fields[6].val, 1),
        abbrMil(fields[7].val),
        fmt(fields[8].val, 1),
        fmt(fields[9].val),
        vwap ? fmt(vwap) : '—',
        signal
      ];

      cells.forEach((val, i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = strategyLabel === 'LOW' ? 'green-bright' : 'green-dark';
        } else if (fields[i]) {
          td.classList.add(getColor(fields[i].val, fields[i].key));
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