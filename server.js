// server.js
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import momentumRouter from './routes/momentum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app        = express();

// 1) CORS for your API
app.use(cors());

// 2) JSON parser
app.use(express.json());

// 3) STATIC FIRST — serve anything in /public (HTML, JS, CSS)
//    so /index.html, /momentum-widget.iife.js, / will all work
app.use(express.static(path.join(__dirname, 'public')));

// 4) Then mount your API
app.use('/momentum', momentumRouter);

// 5) Fallback: unmatched GETs → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) Start up
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));