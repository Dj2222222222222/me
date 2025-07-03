// utils/fmpService.js
import fetch from 'node-fetch';

const BASE = 'https://financialmodelingprep.com/api/v3';
const KEY  = process.env.FMP_KEY;

export async function fetchOpenClose(ticker) {
  try {
    const res  = await fetch(`${BASE}/quote/${ticker}?apikey=${KEY}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) {
      console.warn(`⚠️ No open/close for ${ticker}`);
      return { open: null, close: null };
    }
    return { open: data[0].open, close: data[0].close };
  } catch (err) {
    console.error(`❌ fetchOpenClose error for ${ticker}:`, err);
    return { open: null, close: null };
  }
}

export async function fetchVWAPandTime(ticker) {
  try {
    const res  = await fetch(`${BASE}/historical-chart/1min/${ticker}?apikey=${KEY}`);
    const arr  = await res.json();
    if (!Array.isArray(arr) || !arr[0]) {
      console.warn(`⚠️ No VWAP/time for ${ticker}`);
      return { vwap: null, time: null };
    }
    const { high, low, close, date } = arr[0];
    const vwap = (high + low + close) / 3;
    return { vwap, time: date };
  } catch (err) {
    console.error(`❌ fetchVWAPandTime error for ${ticker}:`, err);
    return { vwap: null, time: null };
  }
}