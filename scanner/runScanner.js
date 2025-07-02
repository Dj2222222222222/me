export default async function runScanner(bucket) {
  return {
    highMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `HIGH${i + 1}`,
      strategy: 'HIGH',
      price: 100 + i,
      open: 95 + i,                      // ← real open price
      close: 102 + i,                    // ← real close price
      volume: 1_000_000 + i * 15000,
      float: 100_000_000,
      rvol: 2.5 + i * 0.1,
      atr: 1.2 + i * 0.05,
      gap_pct: 1 + i * 0.3
    })),
    lowMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `LOW${i + 1}`,
      strategy: 'LOW',
      price: 4 + i,
      open: 3.5 + i,
      close: 4.2 + i,
      volume: 500_000 + i * 10000,
      float: 5_000_000,
      rvol: 3 + i * 0.2,
      atr: 0.6 + i * 0.05,
      gap_pct: 1.5 + i * 0.25
    }))
  };
}