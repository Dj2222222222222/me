// services/rawMomentumService.js
export default async function getRawMomentum(bucket) {
  const HIGH_TICKERS = [
    "AAPL","MSFT","AMZN","GOOG","META",
    "TSLA","NVDA","JPM","V","VISA",
    "JNJ","WMT","PG","MA","DIS"
  ];
  const LOW_TICKERS = [
    "GCT","ABC","XYZ","MNO","QRS",
    "TUV","LMN","PQR","STU","EFG",
    "HIJ","KLM","NOP","WXY","ZAB"
  ];

  function makeRec(ticker, strat) {
    const price  = Number((Math.random() * 100 + (strat==="HIGH"?100:1)).toFixed(2));
    const open   = Number((price * (0.9 + Math.random()*0.2)).toFixed(2));
    const change = ((price - open)/open)*100;
    const type   = change>0 ? "↑" : change<0 ? "↓" : "→";
    const now    = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    const vwap   = Number((price*(0.98+Math.random()*0.04)).toFixed(2));
    const volume = Math.round((strat==="HIGH"?5e6:5e5)*(0.5+Math.random()));
    // now vary float per ticker:
    const floatShares = strat==="HIGH"
      ? Math.round(1e8 + Math.random()*9e8)   // 100 M → 1 B
      : Math.round(1e6 + Math.random()*9e6);  // 1 M → 10 M

    return {
      ticker,
      strategy:        strat,
      price,
      open,
      close:           price,
      change_from_open:Number(change.toFixed(2)),
      type,
      gap_pct:         Number((Math.random()*10 - 2).toFixed(1)), // –2%→+8%
      volume,
      float:           floatShares,
      rvol:            Number((1 + Math.random()*9).toFixed(2)),  // 1→10
      atr:             Number((0.1 + Math.random()*4.9).toFixed(2)),// 0.1→5.0
      vwap,
      time:            now,
      entry:
        change > 2   ? "Short Reversion"   :
        change < -2  ? "Long Reversion"    :
        Math.random()>0.5 ? "Long Bias" : "Short Bias"
    };
  }

  return {
    market_status: "open",
    note:          "Stub data for UI test",
    timestamp:     Math.floor(Date.now()/1000),
    high_float:    HIGH_TICKERS.map(t => makeRec(t, "HIGH")),
    low_float:     LOW_TICKERS .map(t => makeRec(t, "LOW"))
  };
}