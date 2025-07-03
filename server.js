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

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// 1) Explicitly serve the IIFE bundle
app.get(
  '/momentum-widget.iife.js',
  cors(),
  (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'momentum-widget.iife.js'));
  }
);

// 2) Explicitly serve the embed page
app.get(
  '/embed.html',
  cors(),
  (req, res) => {
    res.type('text/html');
    res.sendFile(path.join(__dirname, 'public', 'embed.html'));
  }
);

// 3) Serve all other static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// 4) Mount your momentum API under /momentum
app.use('/momentum', momentumRouter);

// 5) Fallback any other GET to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));