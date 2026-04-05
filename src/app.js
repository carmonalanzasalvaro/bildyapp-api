import express from 'express';
import userRoutes from './routes/user.routes.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'BildyApp API running'
  });
});

app.use('/api/user', userRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'Route not found'
  });
});

export default app;