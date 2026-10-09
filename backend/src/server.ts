import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './adapters/inbound/http/router';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Mount Hexagonal HTTP API Router
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Peasants Running Kit Hexagonal Backend API listening on port ${port}`);
});
