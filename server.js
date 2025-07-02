// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import momentumRouter from './routes/momentum.js';  // ← fixed quote + semicolon

const app = express();

// 1) Enable CORS so GHL (and any client) can fetch your API
app.use(cors());

// 2) Parse JSON bodies
app.use(express.json());

// 3) Mount your momentum API under /momentum
app.use('/momentum', momentumRouter);

// 4) Serve static assets (index.html, CSS, JS) from your project root
const __dirname = path.resolve();
app.use(express.static(__dirname));

// 5) (Optional) Fallback to index.html on unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 6) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});