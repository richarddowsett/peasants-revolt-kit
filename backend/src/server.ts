import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './adapters/inbound/http/router';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Disable Express ETag generation to prevent 304 Not Modified on dynamic APIs
app.disable('etag');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Set no-cache headers for all dynamic API endpoints
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Mount Hexagonal HTTP API Router
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Peasants Running Kit Hexagonal Backend API listening on port ${port}`);
});

