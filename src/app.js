import express from 'express';
import userRoutes from './routes/user.routes.js';
import AppError from './utils/AppError.js';
import errorHandler from './middleware/error-handler.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'BildyApp API running'
  });
});

app.use('/api/user', userRoutes);

app.use((req, res, next) => {
  next(AppError.notFound('Route not found'));
});

app.use(errorHandler);

export default app;