(function(){
  const API_BASE = 'https://myze-thya.onrender.com';
  const params   = new URLSearchParams(window.location.search);
  const BUCKET   = params.get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  function arrow(v) {
    return v > 0 ? '↑' : v < 0 ? '↓' : '→';
  }

  function abbrMil(v) {
    return isNaN(v)
      ? '–'
      : v >= 1e6
        ? (v/1e6).toFixed(1) + ' Mil'
        : Number(v).toLocaleString();
  }

  function fmt(v, d = 2) {
    return isNaN(v)
      ? '–'
      : Number(v).toLocaleString(undefined, {
          maximumFractionDigits: d
        });
  }

  function getHeat(val, field) {
    if (field === 'rvol' || field === 'rvol_value') {
      return val >= 5 ? 'heat-blue'
           : val >= 2 ? 'heat-green'
           : val >= 1 ? 'heat-yellow'
           : val >= 0.5 ? 'heat-orange'
           : 'heat-red';
    }
    if (field === 'gap_pct') {
      return val >= 8 ? 'heat-blue'
           : val >= 4 ? 'heat-green'
           : val >= 2 ? 'heat-yellow'
           : val >= 0 ? 'heat-orange'
           : 'heat-red';
    }
    return '';
  }

  function buildTable(data, title) {
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
      'Chg','Gap %','Vol','FLOAT/shares','VWAP','Entry'
    ];
    headers.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      trh.appendChild(th);
    });

    const tbody = tbl.createTBody();
    const fields = [
      'price','change_from_open','gap_pct',
      'volume','float','vwap','entry_trigger'
    ];
    data.forEach(r => {
      const tr = tbody.insertRow();
      const cells = [
        r.strategy || '',
        r.timestamp
          ? new Date(r.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : r.time || '',
        arrow(r.change_from_open || r.change_pct),
        r.ticker,
        fmt(r.price),
        fmt(r.change_from_open || r.change_pct),
        fmt(r.gap_pct, 1),
        abbrMil(r.volume),
        abbrMil(r.float),
        fmt(r.vwap),
        r.entry_trigger || ''
      ];

      cells.forEach((val, i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = r.strategy === 'LOW-M'
            ? 'green-bright'
            : 'green-dark';
        } else {
          const fieldKeys = ['price','change_from_open','gap_pct','volume','float','vwap','entry_trigger'];
          const rawField = fieldKeys[i - 4];
          const heat = getHeat(r[rawField] || r.rvol, rawField);
          if (heat) td.classList.add(heat);
        }
      });
    });

    wrap.appendChild(tbl);
    return wrap;
  }

  function renderWidget(j) {
    document.getElementById('mkt-status').textContent = `(${j.market_status})`;
    document.getElementById('mkt-note').textContent = j.note;
    document.getElementById('mkt-ts').textContent =
      'Updated: ' + new Date(j.timestamp * 1000).toLocaleTimeString();

    const out = document.getElementById('mkt-tables');
    out.innerHTML = '';

    if (BUCKET === 'low') {
      out.appendChild(buildTable(j.low_float, 'Low-Float Momentum'));
    } else if (BUCKET === 'high') {
      out.appendChild(buildTable(j.high_float, 'High-Float Momentum'));
    } else {
      out.appendChild(buildTable(j.high_float, 'High-Float Momentum'));
      out.appendChild(buildTable(j.low_float, 'Low-Float Momentum'));
    }
  }

  async function refresh() {
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      renderWidget(data);
    } catch (err) {
      console.error('refresh() error:', err);
      document.getElementById('mkt-tables').innerHTML =
        `<div class="no-data">
           No data available for bucket “${BUCKET}”
         </div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(refresh, 60_000);
  });
})();