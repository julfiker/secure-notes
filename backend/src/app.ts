import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import noteRoutes from './routes/note.routes';
import adminRoutes from './routes/admin.routes';
import postRoutes from './routes/post.routes';
import aggregationRoutes from './routes/aggregation.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

// Security HTTP headers with relaxed CSP for Vite SPA assets
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration supporting same-origin and external callers
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  })
);

// Body parsing with payload size limitation
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Application API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/aggregations', aggregationRoutes);

// Frontend static assets & SPA fallback
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// 404 handler for unmatched API routes
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// SPA fallback for all other client routes (login, notes, admin, etc.)
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Centralized error handling
app.use(errorHandler);

export default app;

