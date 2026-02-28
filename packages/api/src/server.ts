// ─── Peacefull.ai API Server ─────────────────────────────────────────
// Express 5 + TypeScript entry point with HIPAA-grade middleware stack.

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { env, API_VERSION, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } from './config/index.js';
import routes from './routes/index.js';
import { auditLog } from './middleware/audit.js';
import { notFound, errorHandler } from './middleware/error.js';
import { apiLogger } from './utils/logger.js';

// ─── Create App ──────────────────────────────────────────────────────

const app = express();

// ─── Security & Compression ─────────────────────────────────────────

app.use(helmet());

// Parse comma-separated CORS origins (supports Netlify + localhost)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────

app.use(
  morgan('short', {
    stream: {
      write: (message: string) => apiLogger.info(message.trim()),
    },
  }),
);

// ─── Body Parsing ────────────────────────────────────────────────────

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests — please try again later',
    },
  },
});

app.use(limiter);

// ─── Audit Logging ───────────────────────────────────────────────────

app.use(auditLog);

// ─── Health Check ────────────────────────────────────────────────────

const startedAt = Date.now();
const APP_VERSION = '0.1.0';

/**
 * Health check endpoint — always public, no auth required.
 * Returns server status, version, timestamp, and uptime.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ──────────────────────────────────────────────────────

app.use(`/api/${API_VERSION}`, routes);

// ─── Error Handling ──────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Graceful Shutdown ───────────────────────────────────────────────

let server: ReturnType<typeof app.listen> | undefined;

/**
 * Gracefully shuts down the server, closing HTTP connections,
 * database pools, and Redis clients.
 */
async function shutdown(signal: string) {
  apiLogger.info(`Received ${signal} — shutting down gracefully…`);

  if (server) {
    server.close(() => {
      apiLogger.info('HTTP server closed');
    });
  }

  // Close database connection (Prisma) — add when Prisma is initialized
  // await prisma.$disconnect();

  // Close Redis — add when Redis is initialized
  // await redis.quit();

  // Give connections time to drain
  setTimeout(() => {
    apiLogger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────

server = app.listen(env.PORT, () => {
  apiLogger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      apiVersion: API_VERSION,
    },
    `🚀 Peacefull API server listening on port ${env.PORT}`,
  );
});

export { app };
