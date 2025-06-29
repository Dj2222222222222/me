(function(){
  const API = "https://myze-thya.onrender.com/momentum";

  function arrow(v) {
    return v > 0 ? "↑" : v < 0 ? "↓" : "→";
  }

  function abbrMil(v){
    return isNaN(v)
      ? "–"
      : v >= 1e6
        ? (v/1e6).toFixed(1) + " Mil"
        : Number(v).toLocaleString();
  }

  function fmt(v, d = 2){
    return isNaN(v)
      ? "–"
      : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
  }

  function getHeat(val, field){
    if (field === "rvol_value") {
      return val >= 5 ? "heat-blue"
           : val >= 2 ? "heat-green"
           : val >= 1 ? "heat-yellow"
           : val >= 0.5 ? "heat-orange"
           : "heat-red";
    }
    if (field === "gap_pct") {
      return val >= 8 ? "heat-blue"
           : val >= 4 ? "heat-green"
           : val >= 2 ? "heat-yellow"
           : val >= 0 ? "heat-orange"
           : "heat-red";
    }
    return "";
  }

  function buildTable(data, title){
    const wrap = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.textContent = title;
    wrap.appendChild(h2);

    if (!data.length) {
      const nd = document.createElement("div");
      nd.className = "no-data";
      nd.textContent = "No " + title + " data";
      wrap.appendChild(nd);
      return wrap;
    }

    const tbl = document.createElement("table");
    const trh = tbl.createTHead().insertRow();
    const headers = [
      "Strategy","Time","Type","Symbol","Price",
      "Chg","Gap %","Vol","FLOAT/shares","VWAP","Entry"
    ];
    headers.forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      trh.appendChild(th);
    });

    const tbody = tbl.createTBody();
    data.forEach(r => {
      const tr = tbody.insertRow();
      const cells = [
        r.strategy,
        new Date(r.timestamp * 1000)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrow(r.change_from_open),
        r.ticker,
        fmt(r.price),
        fmt(r.change_from_open),
        fmt(r.gap_pct, 1),
        abbrMil(r.volume),
        abbrMil(r.float),
        fmt(r.vwap),
        r.entry_trigger
      ];

      cells.forEach((val, i) => {
        const td = tr.insertCell();
        td.textContent = val;
        if (i < 4) {
          td.className = r.strategy === "LOW-M"
            ? "green-bright"
            : "green-dark";
        } else {
          const fields = [
            "price","change_from_open","gap_pct",
            "volume","float","vwap","entry_trigger"
          ];
          const raw = r[fields[i - 4]] || 0;
          const heat = getHeat(raw, fields[i - 4]);
          if (heat) td.classList.add(heat);
        }
      });
    });

    wrap.appendChild(tbl);
    return wrap;
  }

  function renderWidget(j){
    document.getElementById("mkt-status").textContent =
      "(" + j.market_status + ")";
    document.getElementById("mkt-note").textContent = j.note;
    document.getElementById("mkt-ts").textContent =
      "Updated: " + new Date(j.timestamp * 1000)
        .toLocaleTimeString();
    const out = document.getElementById("mkt-tables");
    out.innerHTML = "";
    out.appendChild(buildTable(j.high_float, "High-Float Momentum"));
    out.appendChild(buildTable(j.low_float, "Low-Float Momentum"));
  }

  async function refresh(){
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      renderWidget(data);
    } catch(e) {
      console.error(e);
      document.getElementById("mkt-tables").innerHTML =
        '<div class="no-data">Error loading data</div>';
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    // inject widget styles
    const style = document.createElement("style");
    style.textContent = `
      #momentum-widget table {
        width:100%; border-collapse:collapse;
        font-size:13px; margin-bottom:20px;
      }
      #momentum-widget th, #momentum-widget td {
        padding:6px 8px; border:1px solid #333;
        text-align:center;
      }
      #momentum-widget th {
        background:#222; color:#fff;
      }
      #momentum-widget tr:hover {
        background:#222;
      }
      .green-dark {
        background:#2e7d32; color:#fff;
      }
      .green-bright {
        background:#76ff03; color:#000;
      }
      .heat-red { background:#651111; }
      .heat-orange { background:#954b00; }
      .heat-yellow { background:#caa500; }
      .heat-green { background:#2e7d32; }
      .heat-blue { background:#004cff; }
      .no-data {
        padding:1rem; color:#f90;
        text-align:center;
      }
    `;
    document.head.appendChild(style);

    // initial fetch + polling every minute
    refresh();
    setInterval(refresh, 60000);
  });
})();
