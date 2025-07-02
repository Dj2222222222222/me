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

//
// 1) Enable CORS and JSON body parsing for your API
//
app.use(cors());
app.use(express.json());

//
// 2) Explicitly serve your IIFE bundle at the exact path
//    This guarantees JS, not HTML, and sets the correct MIME + CORS headers.
//
app.get(
  '/momentum-widget.iife.js',
  cors(),
  (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'momentum-widget.iife.js'));
  }
);

//
// 3) Serve all static assets from /public
//    Now /, /index.html, /momentum-widget.js, CSS, images, etc. all work
//
app.use(express.static(path.join(__dirname, 'public')));

//
// 4) Mount your momentum API under /momentum
//
app.use('/momentum', momentumRouter);

//
// 5) Fallback: send index.html for any other GET
//    This lets you deep-link (e.g. /foo/bar) and still load your widget shell.
//
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//
// 6) Start the server
//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));