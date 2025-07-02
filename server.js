// server.js
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import momentumRouter    from './routes/momentum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();

// 1) JSON + CORS for your API
app.use(express.json());
app.use(cors());

// 2) Explicitly serve the IIFE bundle—correct MIME + CORS header
app.get('/momentum-widget.iife.js', cors(), (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'momentum-widget.iife.js'));
});

// 3) Static‐first: serve index.html, CSS, original JS, etc.
app.use(express.static(path.join(__dirname, 'public')));

// 4) Mount your momentum API
app.use('/momentum', momentumRouter);

// 5) Fallback everything else to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on ${PORT}`));