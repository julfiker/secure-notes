import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';

const PORT = Number(process.env.PORT) || 8090;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectDatabase();
    const server = app.listen(PORT, HOST, () => {
      console.log(`[Server] Secure Notes full-stack app listening on http://${HOST}:${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

