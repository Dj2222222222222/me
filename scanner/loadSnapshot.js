export default async function getLatestSnapshot(bucket) {
  return {
    highMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `HIGHX${i + 1}`,
      strategy: 'HIGH',
      price: 98 + i,
      open: 96 + i,
      close: 101 + i,
      volume: 1_200_000 + i * 10000,
      float: 90_000_000,
      rvol: 2 + i * 0.1,
      atr: 1.1 + i * 0.04,
      gap_pct: 0.9 + i * 0.2
    })),
    lowMomentum: Array.from({ length: 15 }, (_, i) => ({
      ticker: `LOWX${i + 1}`,
      strategy: 'LOW',
      price: 5.5 + i,
      open: 5 + i,
      close: 6.3 + i,
      volume: 400_000 + i * 8000,
      float: 4_000_000,
      rvol: 2.8 + i * 0.2,
      atr: 0.5 + i * 0.04,
      gap_pct: 2.2 + i * 0.2
    }))
  };
}