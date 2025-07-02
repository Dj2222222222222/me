import 'dotenv/config';
import express from 'express';
import path    from 'path';
import momentumRouter from './routes/momentum.js';

const app = express();
const __dirname = path.resolve();

app.use(express.json());

// Mount your momentum API
app.use('/momentum', momentumRouter);

// Serve static assets (widget, HTML, CSS, JS)
app.use(express.static(__dirname));

// Default to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});