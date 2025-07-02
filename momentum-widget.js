(async function () {
  const API_BASE = 'https://myze-thya.onrender.com';
  const FMP_API = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
  const params = new URLSearchParams(window.location.search);
  const BUCKET = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;
  const FMP_KEY = 'YOUR_API_KEY_HERE'; // 🔁 Replace with your real FMP key

  async function fetchVWAP(ticker) {
    try {
      const res = await fetch(`${FMP_API}${ticker}?apikey=${FMP_KEY}`);
      const candles = await res.json();
      let tpv = 0, totalVol = 0;

      const today = new Date().toISOString().slice(0, 10);
      for (const bar of candles) {
        if (!bar.date.startsWith(today)) continue;
        const tp = (bar.high + bar.low + bar.close) / 3;
        tpv += tp * bar.volume;
        totalVol += bar.volume;
      }
      return totalVol > 0 ? tpv / totalVol : null;
    } catch {
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

  function getHeat(val, field) {
    if (field === 'vwap_deviation') {
      const absDev = Math.abs(val);
      if (absDev < 0.2) return 'heat-yellow';
      return val > 0 ? 'heat-green' : 'heat-red';
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
      'Strategy','Time','Type','Symbol','Price',
      'Chg','Gap %','Vol','FLOAT','VWAP','Entry'
    ];
    headers.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      trh.appendChild(th);
    });

    const tbody = tbl.createTBody();

    for (const r of data) {
      const tr = tbody.insertRow();

      const timestamp = r.timestamp
        ? new Date(r.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : r.time ?? '—';

      const price = r.price ?? 0;
      const vwap = await fetchVWAP(r.ticker);
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
        r.strategy ?? strategyLabel,
        timestamp,
        arrow(r.change_from_open ?? r.change_pct ?? 0),
        r.ticker ?? '—',
        fmt(price),
        fmt(r.change_from_open ?? r.change_pct),
        fmt(r.gap_pct, 1),
        abbrMil(r.volume),
        abbrMil(r.float),
        vwap ? fmt(vwap) : '—',
        signal
      ];

      cells.forEach((val, i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = strategyLabel === 'LOW' ? 'green-bright' : 'green-dark';
        } else if (i === 10 && deviation !== null) {
          td.classList.add(getHeat(deviation, 'vwap_deviation'));
        }
      });
    }

    wrap.appendChild(tbl);
    return wrap;
  }

  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note').textContent = meta.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(meta.timestamp * 1000).toLocaleTimeString();
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
    setInterval(refresh, 60_000);
  });
})();