import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import router from './routes/index';
import { errorHandler, notFound } from './middlewares/errorHandler';

dotenv.config({ path: `.env.${process.env['NODE_ENV'] ?? 'local'}` });

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// CORS — comma-separated origins or * for all
const rawOrigin = process.env['CORS_ORIGIN'] ?? '*';
const corsOrigin = rawOrigin === '*' ? '*' : rawOrigin.split(',').map((o) => o.trim());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const uploadsDir = path.resolve(process.cwd(), process.env['UPLOADS_DIR'] ?? './uploads');
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
