import express from 'express';
import { getDatabaseStatus } from './config/database.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import clientRoutes from './routes/client.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

app.use(express.json());

app.use('/api/client', clientRoutes);
app.use('/api/user', userRoutes);

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
