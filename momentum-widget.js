(async function() {
  const API_BASE      = 'https://myze-thya.onrender.com';
  const FMP_KEY       = 'IjUxySjnW5a5WbVIQkDzBpXRceYhXiDx';
  const params        = new URLSearchParams(window.location.search);
  const BUCKET        = params.get('bucket') || 'low';
  const ENDPOINT      = `${API_BASE}/momentum/${BUCKET}`;

  // v3 intraday and full‐history endpoints
  const INTRADAY_V3   = 'https://financialmodelingprep.com/api/v3/historical-chart/1min/';
  const HISTFULL_V3   = 'https://financialmodelingprep.com/api/v3/historical-price-full/';

  /** 
   * Fetch VWAP & Time:
   * 1) try intraday (1min)
   * 2) if too few bars, fallback to EOD full history
   */
  async function fetchVWAPandTime(ticker) {
    try {
      // 1) Intraday attempt
      const r1   = await fetch(`${INTRADAY_V3}${ticker}?apikey=${FMP_KEY}`);
      const bars = await r1.json();
      if (Array.isArray(bars) && bars.length > 20) {
        // group today’s bars
        const today = bars[0].date.split(' ')[0];
        let tpv = 0, vol = 0;
        bars.forEach(b => {
          if (b.date.startsWith(today)) {
            const tp = (b.high + b.low + b.close) / 3;
            tpv += tp * b.volume;
            vol += b.volume;
          }
        });
        const last = bars[bars.length - 1];
        const vwap = vol ? tpv / vol : null;
        console.log(`${ticker} intraday VWAP:`, vwap);
        return {
          vwap,
          time: new Date(last.date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
        };
      }

      // 2) Fallback → EOD full history
      const r2   = await fetch(`${HISTFULL_V3}${ticker}?apikey=${FMP_KEY}`);
      const j2   = await r2.json();
      const hist = j2.historical;
      if (Array.isArray(hist) && hist.length) {
        const latest = hist[0];
        console.log(`${ticker} EOD VWAP:`, latest.vwap);
        return {
          vwap: latest.vwap ?? null,
          time: `EOD ${latest.date}`
        };
      }
    } catch (err) {
      console.warn(`VWAP+Time fetch error for ${ticker}`, err);
    }
    return { vwap: null, time: '—' };
  }

  /** 
   * Fetch today's open & last close from full history.
   * We reuse HISTFULL_V3, grabbing open & close from hist[0].
   */
  async function fetchOpenClose(ticker) {
    try {
      const res = await fetch(`${HISTFULL_V3}${ticker}?apikey=${FMP_KEY}`);
      const js  = await res.json();
      if (Array.isArray(js.historical) && js.historical.length) {
        const { open, close } = js.historical[0];
        return { open, close };
      }
    } catch (err) {
      console.warn(`Open/Close fetch error for ${ticker}`, err);
    }
    return { open: null, close: null };
  }

  // Formatting & color‐logic helpers
  function fmt(v,d=2)         { return isNaN(v)? '—': Number(v).toLocaleString(undefined,{maximumFractionDigits:d}); }
  function abbrMil(v)         { return isNaN(v)? '—': v>=1e6? (v/1e6).toFixed(1)+' Mil': Number(v).toLocaleString(); }
  function arrow(v)           { return v>0?'↑':v<0?'↓':'→'; }
  function getColor(val,fld) {
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
      if (val<10_000_000)return 'bright-green';
      if (val<50_000_000)return 'dark-green';
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
    const wrap = document.createElement('div'),
          h2   = document.createElement('h2');
    h2.textContent = title;
    wrap.appendChild(h2);

    if (!data.length) {
      const nd = document.createElement('div');
      nd.className = 'no-data';
      nd.textContent = `No ${title} data`;
      wrap.appendChild(nd);
      return wrap;
    }

    // Build table & header
    const tbl    = document.createElement('table'),
          trh    = tbl.createTHead().insertRow(),
          labels = [
            'Strategy','Time','Type','Symbol','Price',
            'Chg %','Gap %','Volume','% Float','ATR','VWAP','Entry'
          ];
    labels.forEach(l => {
      const th = document.createElement('th');
      th.textContent = l;
      trh.appendChild(th);
    });
    const tbody = tbl.createTBody();

    for (const r of data) {
      const tr       = tbody.insertRow(),
            ticker   = r.ticker    || '—',
            strategy = r.strategy  || strategyLabel,
            vol      = r.volume    || 0,
            flt      = r.float     || 0,
            floatPct = flt>0? (vol/flt)*100 : null,
            gapPct   = r.gap_pct   ?? 0,
            atr      = r.atr       ?? null;

      // Parallel fetches for this ticker
      const [oc, vt] = await Promise.all([
        fetchOpenClose(ticker),
        fetchVWAPandTime(ticker)
      ]);
      const { open, close } = oc;
      const { vwap, time }  = vt;

      // Price + Change logic
      const price  = r.price ?? close  ?? 0;
      const change = (open||open===0)
                     ? ((price - open)/open)*100
                     : null;
      const deviation = (vwap||vwap===0)
                        ? ((price - vwap)/vwap)*100
                        : null;
      const rvol   = r.rvol ?? r.rvol_value ?? 0;

      // Entry signal
      let signal = '—';
      if (deviation !== null) {
        if (Math.abs(deviation) > 2)
          signal = deviation > 0 ? 'Short Reversion' : 'Long Reversion';
        else if (rvol > 2)
          signal = price > vwap ? 'Long Bias' : 'Short Bias';
        else if (Math.abs(deviation) < 0.2)
          signal = 'Bounce Zone';
      }

      // Compose cells
      const cells = [
        strategy,            // 0
        time,                // 1
        arrow(change),       // 2
        ticker,              // 3
        fmt(price),          // 4
        fmt(change),         // 5
        fmt(gapPct,1),       // 6
        abbrMil(vol),        // 7
        fmt(floatPct,1),     // 8
        fmt(atr),            // 9
        (typeof vwap==='number' && !isNaN(vwap))? fmt(vwap): '—', //10
        signal               //11
      ];

      // Color mapping for cols 5–10
      const colorMap = {
        5:  { val: change,   field:'change' },
        6:  { val: gapPct,   field:'gap_pct' },
        7:  { val: vol,      field:'volume' },
        8:  { val: floatPct, field:'float_pct' },
        9:  { val: atr,      field:'atr' }
      };

      // Render row
      cells.forEach((val,i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = strategy==='LOW'? 'green-bright':'green-dark';
        } else if (colorMap[i]) {
          const { val:V, field:F } = colorMap[i];
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
    if (BUCKET === 'raw') {
      out.appendChild(await buildTable(json.high_float,'High-Float Momentum','HIGH'));
      out.appendChild(await buildTable(json.low_float ,'Low-Float Momentum' ,'LOW'));
    } else if (BUCKET === 'high') {
      out.appendChild(await buildTable(json.high_float,'High-Float Momentum','HIGH'));
    } else {
      out.appendChild(await buildTable(json.low_float ,'Low-Float Momentum' ,'LOW'));
    }
  }

  async function refresh() {
    try {
      const res  = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(res.status);
      const json = await res.json();
      await renderWidget(json);
    } catch {
      document.getElementById('mkt-tables').innerHTML =
        `<div class="no-data">No data available for “${BUCKET}”</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(refresh, 60000);
  });
})();
