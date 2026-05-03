import express from 'express';
import { getDatabaseStatus } from './config/database.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    db: getDatabaseStatus(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
