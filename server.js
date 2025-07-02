// server.js
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import momentumRouter from './routes/momentum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// 1) Enable CORS for your API
app.use(cors());

// 2) JSON parser
app.use(express.json());

// 3) Mount the API under /momentum
app.use('/momentum', momentumRouter);

// 4) Serve everything in /public as static files
app.use(express.static(path.join(__dirname, 'public')));

// 5) Fallback: for any other GET, return public/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});