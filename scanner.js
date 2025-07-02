// scanner/runScanner.js
export default async function runScanner(bucket) {
  return {
    highMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `HIGH${i + 1}`,
      strategy: 'HIGH',
      price: 100 + i,
      volume: 1000000 + i * 10000,
      float: 50000000,
      rvol: 2 + Math.random(),
      atr: 1 + Math.random(),
      gap_pct: 1 + i
    })),
    lowMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `LOW${i + 1}`,
      strategy: 'LOW',
      price: 5 + i,
      volume: 200000 + i * 5000,
      float: 4000000,
      rvol: 2.5 + Math.random(),
      atr: 0.5 + Math.random(),
      gap_pct: 2 + i
    }))
  };
}