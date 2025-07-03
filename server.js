// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import momentumRouter from './routes/momentum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();

// 1) Enable CORS + JSON parsing
app.use(cors());
app.use(express.json());

// 2) Serve all static files from public/
//    embed.html?bucket=raw and momentum-widget.iife.js?bucket=raw
//    will automatically be served by express.static
app.use(express.static(path.join(__dirname, 'public')));

// 3) Mount your momentum API at /momentum/:bucket
app.use('/momentum', momentumRouter);

// 4) Fallback for all other requests—serve index.html
//    (no path string → no path-to-regexp parsing)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));