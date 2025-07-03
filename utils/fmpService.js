// utils/fmpService.js
import fetch from 'node-fetch';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY  = process.env.FMP_KEY;

export async function fetchOpenClose(ticker) {
  try {
    const url = `${BASE_URL}/quote/${ticker}?apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ fetchOpenClose: no data for ${ticker}`);
      return { open: null, close: null };
    }
    const { open = null, close = null } = data[0];
    return { open, close };
  } catch (err) {
    console.error(`❌ fetchOpenClose error for ${ticker}:`, err);
    return { open: null, close: null };
  }
}

export async function fetchVWAPandTime(ticker) {
  try {
    const url = `${BASE_URL}/historical-chart/1min/${ticker}?apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ fetchVWAPandTime: no data for ${ticker}`);
      return { vwap: null, time: null };
    }
    // Calculate VWAP manually from the latest minute bar
    const latest = data[0];
    const vwap = (latest.high + latest.low + latest.close) / 3;
    const time = latest.date;
    return { vwap, time };
  } catch (err) {
    console.error(`❌ fetchVWAPandTime error for ${ticker}:`, err);
    return { vwap: null, time: null };
  }
}