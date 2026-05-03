import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import swaggerSpec from './config/swagger.js';
import { getDatabaseStatus } from './config/database.js';
import deliveryNoteRoutes from './routes/deliverynote.routes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { sanitizeNoSql } from './middleware/security.js';
import clientRoutes from './routes/client.routes.js';
import projectRoutes from './routes/project.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const swaggerUiOptions = {
  explorer: true
};
const swaggerUiHtml = swaggerUi.generateHTML(swaggerSpec, swaggerUiOptions);
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(helmet());
app.use(apiRateLimit);

app.use(express.json());
app.use(sanitizeNoSql);

app.get('/api-docs.json', (_req, res) => {
  res.status(200).json(swaggerSpec);
});

app.get('/api-docs', (_req, res) => {
  res.status(200).send(swaggerUiHtml);
});
app.get('/api-docs/', (_req, res) => {
  res.status(200).send(swaggerUiHtml);
});
app.use('/api-docs', swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions));

app.use('/api/client', clientRoutes);
app.use('/api/deliverynote', deliveryNoteRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    db: getDatabaseStatus(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

if (config.isTest) {
  app.get('/api/test/force-500', (_req, _res, next) => {
    next(new Error('Forced test error'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
