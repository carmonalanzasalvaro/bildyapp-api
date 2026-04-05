import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import userRoutes from './routes/user.routes.js';
import AppError from './utils/AppError.js';
import errorHandler from './middleware/error-handler.js';
import config from './config/index.js';

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many requests, please try again later'
  }
});

app.use(helmet());
app.use(express.json());
app.use(mongoSanitize());
app.use('/uploads', express.static(config.uploadDir));
app.use('/api', apiLimiter);

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