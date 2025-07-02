(async function() {
  const API_BASE = 'http://localhost:3000';
  const BUCKET = new URLSearchParams(window.location.search).get('bucket') || 'low';
  const ENDPOINT = `${API_BASE}/momentum/${BUCKET}`;

  // Helpers
  function fmt(v, d=2) {
    return isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  }
  function abbrMil(v) {
    if (isNaN(v)) return '—';
    return v >= 1e6 ? (v/1e6).toFixed(1)+'M' : Number(v).toLocaleString();
  }

  // Color palettes
  const COLORS = {
    darkRed: '#c82333', lightRed: '#f8d7da',
    gray: '#e0e0e0', lightGreen: '#d4edda',
    mediumGreen: '#a3d3a1', brightGreen: '#7cc47c',
    darkGreen: '#3a6f3a', blue: '#007bff', yellow: '#ffeeba'
  };

  // Pick color key for numeric ranges
  function pick(val, fld) {
    switch(fld) {
      case 'rvol':
        if(val<1) return 'gray'; if(val<2) return 'lightGreen';
        if(val<3) return 'mediumGreen'; if(val<5) return 'brightGreen';
        return 'darkGreen';

      case 'change':
        if(val<=-50) return 'darkRed'; if(val<=-10) return 'lightRed';
        if(val<0) return 'lightRed'; if(val===0) return 'gray';
        if(val<5) return 'lightGreen'; if(val<15) return 'mediumGreen';
        if(val<30) return 'brightGreen'; return 'darkGreen';

      case 'gap':
        if(val<=-5) return 'darkRed'; if(val< -1) return 'lightRed';
        if(Math.abs(val)<1) return 'gray'; if(val<3) return 'lightGreen';
        if(val<7) return 'brightGreen'; return 'blue';

      case 'volume':
        if(val<5e5) return 'gray'; if(val<2e6) return 'lightGreen';
        if(val<5e6) return 'mediumGreen'; if(val<1e7) return 'brightGreen';
        if(val<5e7) return 'darkGreen'; return 'blue';

      case 'float_pct':
        if(val<5) return 'gray'; if(val<10) return 'lightBlue';
        if(val<20) return 'mediumBlue'; if(val<50) return 'brightBlue';
        return 'darkBlue';

      case 'atr':
        if(val<0.5) return 'gray'; if(val<1) return 'yellow';
        if(val<2) return 'brightGreen'; return 'darkRed';

      // Price/VWAP deviation
      case 'dev':
        if(val<=-2) return 'darkRed'; if(val<=-0.5) return 'lightRed';
        if(Math.abs(val)<=0.5) return 'gray'; if(val<=2) return 'lightGreen';
        return 'brightGreen';
    }
    return null;
  }

  // Render header
  function renderHeader(m) {
    document.getElementById('mkt-status').textContent=`(${m.market_status})`;
    document.getElementById('mkt-note').textContent=m.note;
    document.getElementById('mkt-ts').textContent=
      'Updated: '+new Date(m.timestamp*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }

  // Build table
  async function buildTable(arr, title, strat) {
    const wrap = document.createElement('div');
    wrap.appendChild(Object.assign(document.createElement('h2'), { textContent: title }));
    if(!arr.length) {
      const no = document.createElement('div');
      no.className='no-data';
      no.textContent=`No ${title}`;
      wrap.appendChild(no);
      return wrap;
    }
    const tbl = document.createElement('table');
    const hdr = ['Strat','Time','Type','Symbol','Price','RVOL','Chg%','Gap%','Vol','Float','ATR','VWAP','Entry'];
    const trh=tbl.createTHead().insertRow();
    hdr.forEach(h=> trh.appendChild(Object.assign(document.createElement('th'),{textContent:h})));

    const tbody=tbl.createTBody();
    arr.forEach(r=>{
      const tr=tbody.insertRow();
      const dev = ((r.price-r.vwap)/r.vwap)*100;
      const gap = r.gap_pct;
      const floatPct = r.float? (r.volume/r.float)*100:0;

      const vals = [
        strat, r.time, r.type, r.ticker,
        fmt(r.price),
        fmt(r.rvol,1),
        fmt(r.change_from_open),
        fmt(gap,1),
        abbrMil(r.volume),
        abbrMil(r.float),
        fmt(r.atr),
        fmt(r.vwap),
        r.entry
      ];

      // column mapping to fld/picker
      const fldMap = {
        4:'dev',5:'rvol',6:'change',7:'gap',8:'volume',
        9:'float_pct',10:'atr',11:'dev',12:'entry'
      };

      vals.forEach((v,i)=>{
        const td=tr.insertCell();
        td.textContent=v;

        // static cols 0-3
        if(i<4){ td.className = strat==='LOW'?'green-bright':'green-dark'; return;}
        // Price (4) & VWAP (11)
        if(i===4||i===11) {
          const key=pick(dev,'dev');
          td.style.background=COLORS[key];
          td.style.color='#000';
          return;
        }
        // Entry (12)
        if(i===12){
          const e=r.entry;
          const col=e.includes('Long')?'brightGreen':
                    e.includes('Short')?'darkRed':
                    e.includes('Reversion')?'yellow':'gray';
          td.style.background=COLORS[col];
          td.style.color='#000';
          return;
        }
        // dynamic others
        const fld = fldMap[i];
        const num = fld==='float_pct'?floatPct: r[fld];
        const key = pick(num,fld);
        td.style.background=COLORS[key]||null;
        td.style.color='#000';
      });
    });

    wrap.appendChild(tbl);
    return wrap;
  }

  // Render
  async function render(m) {
    renderHeader(m);
    const out=document.getElementById('mkt-tables'); out.innerHTML='';
    if(BUCKET==='raw'){
      out.appendChild(await buildTable(m.high_float,'High-Float Momentum','HIGH'));
      out.appendChild(await buildTable(m.low_float,'Low-Float Momentum','LOW'));
    } else if(BUCKET==='high'){
      out.appendChild(await buildTable(m.high_float,'High-Float Momentum','HIGH'));
    } else {
      out.appendChild(await buildTable(m.low_float,'Low-Float Momentum','LOW'));
    }
  }

  // Refresh loop
  async function refresh(){
    try{
      const r = await fetch(ENDPOINT);
      if(!r.ok) throw new Error(r.statusText);
      const j = await r.json();
      await render(j);
    } catch(e){
      console.error(e);
      document.getElementById('mkt-tables').innerHTML='<div class="no-data">No data</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refresh();
    setInterval(refresh,60000);
  });
})();