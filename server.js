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

app.use(cors());
app.use(express.json());

// 1) Mount your JSON API *before* static/fallback
app.use('/momentum', momentumRouter);

// 2) Serve any front-end assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// 3) SPA fallback (for index.html in public)
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Listening on port ${PORT}`)
);
