(async function() {
  const API_BASE     = 'https://myze-thya.onrender.com';
  const FMP_KEY      = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params       = new URLSearchParams(window.location.search);
  const BUCKET       = params.get('bucket') || 'low';
  const ENDPOINT     = `${API_BASE}/momentum/${BUCKET}`;

  // EOD Full (with vwap) & Intraday 1-min endpoints
  const FMP_EOD_FULL    = 'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=';
  const FMP_INTRADAY_1M = 'https://financialmodelingprep.com/stable/historical-chart/1min?symbol=';

  // 1) Fetch open/close for last session
  async function fetchOpenClose(ticker) {
    try {
      const res  = await fetch(`${FMP_EOD_FULL}${ticker}&apikey=${FMP_KEY}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return { open: null, close: null };
      const { open, close } = data[0];
      return { open, close };
    } catch {
      return { open: null, close: null };
    }
  }

  // 2) Fetch intraday bars → VWAP & time; fallback to EOD vwap if no intraday
  async function fetchVWAPandTime(ticker) {
    try {
      // fetch 1-min bars
      const r1      = await fetch(`${FMP_INTRADAY_1M}${ticker}&apikey=${FMP_KEY}`);
      const candles = await r1.json();
      if (Array.isArray(candles) && candles.length) {
        // group by date, pick today (first bar’s date)
        const today = candles[0].date.split(' ')[0];
        let tpv = 0, vol = 0;
        candles
          .filter(b => b.date.startsWith(today))
          .forEach(b => {
            const tp = (b.high + b.low + b.close)/3;
            tpv += tp * b.volume;
            vol += b.volume;
          });
        const lastBar = candles[candles.length - 1];
        const intradayVWAP = vol ? tpv/vol : null;
        if (intradayVWAP !== null) {
          return {
            vwap: intradayVWAP,
            time: new Date(lastBar.date)
                    .toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
          };
        }
      }
      // fallback → EOD vwap
      const r2   = await fetch(`${FMP_EOD_FULL}${ticker}&apikey=${FMP_KEY}`);
      const d2   = await r2.json();
      if (Array.isArray(d2) && d2.length && typeof d2[0].vwap === 'number') {
        return {
          vwap: d2[0].vwap,
          time: `EOD ${d2[0].date}`
        };
      }
      return { vwap: null, time: '—' };
    } catch {
      return { vwap: null, time: '—' };
    }
  }

  // formatting & color utilities
  function fmt(v,d=2)          { return isNaN(v)? '—' : Number(v).toLocaleString(undefined,{maximumFractionDigits:d}); }
  function abbrMil(v)          { return isNaN(v)? '—' : v>=1e6? (v/1e6).toFixed(1)+' Mil': Number(v).toLocaleString(); }
  function arrow(v)            { return v>0?'↑':v<0?'↓':'→'; }
  function getColor(val, fld) {
    if (fld==='change') {
      if (val<=-50) return 'dark-red';
      if (val<=-10) return 'medium-red';
      if (val<0)    return 'light-red';
      if (val===0)  return 'white';
      if (val<5)    return 'light-green';
      if (val<15)   return 'medium-green';
      if (val<30)   return 'bright-green';
      return 'dark-green';
    }
    if (fld==='gap_pct') {
      if (val<0)    return 'light-red';
      if (val<5)    return 'white';
      if (val<15)   return 'light-yellow';
      if (val<30)   return 'yellow';
      if (val<50)   return 'orange';
      if (val<100)  return 'dark-orange';
      return 'red-orange';
    }
    if (fld==='volume') {
      if (val<500_000)   return 'gray';
      if (val<2_000_000) return 'light-green';
      if (val<5_000_000) return 'medium-green';
      if (val<10_000_000) return 'bright-green';
      if (val<50_000_000) return 'dark-green';
      return 'highlight-blue';
    }
    if (fld==='float_pct') {
      if (val<5)    return 'gray';
      if (val<10)   return 'light-blue';
      if (val<20)   return 'medium-blue';
      if (val<50)   return 'bright-blue';
      return 'dark-blue';
    }
    if (fld==='atr') {
      if (val<0.5)  return 'light-gray';
      if (val<1.0)  return 'yellow';
      if (val<2.0)  return 'orange';
      return 'red';
    }
    return '';
  }

  function renderHeader(meta) {
    document.getElementById('mkt-status').textContent = `(${meta.market_status})`;
    document.getElementById('mkt-note'  ).textContent = meta.note;
    document.getElementById('mkt-ts'    ).textContent =
      'Updated: ' + new Date(meta.timestamp*1000)
                    .toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }
  async function buildTable(data, title, strategyLabel) {
    const wrap = document.createElement('div');
    const h2   = document.createElement('h2');
    h2.textContent = title;
    wrap.appendChild(h2);

    if (!data.length) {
      const nd = document.createElement('div');
      nd.className = 'no-data';
      nd.textContent = `No ${title} data`;
      wrap.appendChild(nd);
      return wrap;
    }

    const tbl    = document.createElement('table');
    const trh    = tbl.createTHead().insertRow();
    const labels = ['Strategy','Time','Type','Symbol','Price',
                    'Chg %','Gap %','Volume','% Float','ATR','VWAP','Entry'];
    labels.forEach(l => {
      const th = document.createElement('th');
      th.textContent = l;
      trh.appendChild(th);
    });

    const tbody = tbl.createTBody();

    for (const r of data) {
      const tr       = tbody.insertRow();
      const ticker   = r.ticker    || '—';
      const volume   = r.volume    || 0;
      const flt      = r.float     || 0;
      const floatPct = flt>0? (volume/flt)*100 : null;
      const gapPct   = r.gap_pct   || 0;
      const atr      = r.atr       || null;
      const strategy = r.strategy  || strategyLabel;

      // parallel fetches
      const [oc, vt]     = await Promise.all([
        fetchOpenClose(ticker),
        fetchVWAPandTime(ticker)
      ]);
      const { open, close } = oc;
      const { vwap, time }  = vt;

      const price  = r.price ?? close ?? 0;
      const change = (open||open===0)
                     ? ((price-open)/open)*100
                     : null;
      const deviation = (vwap||vwap===0)
                        ? ((price-vwap)/vwap)*100
                        : null;
      const rvol   = r.rvol || r.rvol_value || 0;

      // entry logic
      let signal = '—';
      if (deviation!==null) {
        if (Math.abs(deviation)>2)
          signal = deviation>0 ? 'Short Reversion':'Long Reversion';
        else if (rvol>2)
          signal = price>vwap ? 'Long Bias':'Short Bias';
        else if (Math.abs(deviation)<0.2)
          signal = 'Bounce Zone';
      }

      // cells array
      const cells = [
        strategy,
        time,
        arrow(change),
        ticker,
        fmt(price),
        fmt(change),
        fmt(gapPct,1),
        abbrMil(volume),
        fmt(floatPct,1),
        fmt(atr),
        (typeof vwap==='number'&&!isNaN(vwap))? fmt(vwap): '—',
        signal
      ];

      // color map for columns 5–10
      const colorMap = {
        5: {val: change,   field:'change'},
        6: {val: gapPct,   field:'gap_pct'},
        7: {val: volume,   field:'volume'},
        8: {val: floatPct, field:'float_pct'},
        9: {val: atr,      field:'atr'}
      };

      cells.forEach((val,i) => {
        const td = tr.insertCell();
        td.textContent = val;
        // first 4 columns solid
        if (i<4) {
          td.className = strategy==='LOW'? 'green-bright':'green-dark';
        }
        // apply color logic 5–10
        else if (colorMap[i]) {
          const {val:V, field:F} = colorMap[i];
          td.classList.add(getColor(V,F));
        }
      });
    }

    wrap.appendChild(tbl);
    return wrap;
  }

  async function renderWidget(json) {
    renderHeader(json);
    const out = document.getElementById('mkt-tables');
    out.innerHTML = '';
    if (BUCKET==='raw') {
      out.appendChild(await buildTable(json.high_float,'High-Float Momentum','HIGH'));
      out.appendChild(await buildTable(json.low_float ,'Low-Float Momentum' ,'LOW'));
    }
    else if (BUCKET==='high') {
      out.appendChild(await buildTable(json.high_float,'High-Float Momentum','HIGH'));
    } else {
      out.appendChild(await buildTable(json.low_float ,'Low-Float Momentum' ,'LOW'));
    }
  }

  async function refresh() {
    try {
      const res  = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      await renderWidget(data);
    } catch {
      document.getElementById('mkt-tables').innerHTML =
        `<div class="no-data">No data for bucket “${BUCKET}”</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(refresh, 60000);
  });
})();