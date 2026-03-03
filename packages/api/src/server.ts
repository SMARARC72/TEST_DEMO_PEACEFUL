// ─── Peacefull.ai API Server ─────────────────────────────────────────
// Express 5 + TypeScript entry point with HIPAA-grade middleware stack.

import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";

import { env, API_VERSION } from "./config/index.js";
import { requestId } from "./middleware/request-id.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import routes from "./routes/index.js";
import { auditLog } from "./middleware/audit.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { apiLogger } from "./utils/logger.js";
import { prisma } from "./models/index.js";
import { WebSocketServer, WebSocket } from "ws";
import { verifyTokenForWs } from "./middleware/auth.js";

// ─── Create App ──────────────────────────────────────────────────────

const app = express();

// ─── Request ID (must be first for correlation) ─────────────────────

app.use(requestId);

// ─── Security & Compression ─────────────────────────────────────────

// Parse comma-separated CORS origins for CSP
const cspConnectSrc = [
  "'self'",
  ...env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: cspConnectSrc,
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 63_072_000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// PRD §3.5: Permissions-Policy — deny access to sensitive browser APIs
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );
  next();
});

// Parse comma-separated CORS origins — SEC-06: No wildcard `*` allowed.
const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter((o) => o !== "*"); // Strip wildcard — CORS must be explicit per PRD §3.4

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Tenant-ID",
    ],
    maxAge: 7200,
  }),
);
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────

app.use(
  morgan("short", {
    stream: {
      write: (message: string) => apiLogger.info(message.trim()),
    },
  }),
);

// ─── Body Parsing ────────────────────────────────────────────────────

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────────────

app.use(globalLimiter);

// ─── Audit Logging ───────────────────────────────────────────────────

app.use(auditLog);

// ─── Health / Ready / Version ────────────────────────────────────────

const startedAt = Date.now();
const APP_VERSION = "0.1.0";

/**
 * Health check — always public, no auth required.
 * Returns server status, version, timestamp, and uptime.
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    environment: env.NODE_ENV,
  });
});

/**
 * Readiness probe — checks database connectivity.
 * Returns 503 if the database is unreachable.
 */
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "connected" });
  } catch {
    res.status(503).json({ status: "not-ready", database: "disconnected" });
  }
});

/**
 * Version endpoint — returns build metadata.
 */
app.get("/version", (_req, res) => {
  res.json({
    version: APP_VERSION,
    node: process.version,
    environment: env.NODE_ENV,
    startedAt: new Date(startedAt).toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────

app.use(`/api/${API_VERSION}`, routes);

// ─── Error Handling ──────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Graceful Shutdown ───────────────────────────────────────────────

let server: ReturnType<typeof app.listen> | undefined;

// Track connected WebSocket clients (minimal state for broadcast later)
const wsClients = new Set<WebSocket>();

/**
 * Gracefully shuts down the server, closing HTTP connections,
 * database pools, and Redis clients.
 */
async function shutdown(signal: string) {
  apiLogger.info(`Received ${signal} — shutting down gracefully…`);

  if (server) {
    server.close(() => {
      apiLogger.info("HTTP server closed");
    });
  }

  // Close Prisma connection pool
  try {
    await prisma.$disconnect();
    apiLogger.info("Prisma disconnected");
  } catch (err) {
    apiLogger.error({ err }, "Error disconnecting Prisma");
  }

  // Give connections time to drain
  setTimeout(() => {
    apiLogger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

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

// ─── WebSocket Server (notifications) ──────────────────────────────

if (server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const KEEPALIVE_MS = 30_000;

  wss.on("connection", async (socket, req) => {
    // Extract token from query string (client passes ?token=...)
    const url = new URL(
      req.url ?? "",
      `http://${req.headers.host ?? "localhost"}`,
    );
    const token = url.searchParams.get("token");

    if (!token) {
      socket.close(4401, "Missing token");
      return;
    }

    let userId = "unknown";

    try {
      const payload = await verifyTokenForWs(token);
      userId = payload.sub;
    } catch (err) {
      apiLogger.warn({ err }, "WS auth failed");
      socket.close(4401, "Invalid or expired token");
      return;
    }

    apiLogger.info({ userId }, "WS connection established");
    wsClients.add(socket);

    // Send initial ack
    socket.send(JSON.stringify({ type: "connected", userId }));

    // Keepalive pings so Netlify/ALB doesn’t idle-timeout the socket
    const keepalive = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, KEEPALIVE_MS);

    socket.on("message", (data) => {
      // Basic pong handling for clients that respond manually
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === "pong") return;
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on("close", () => {
      clearInterval(keepalive);
      wsClients.delete(socket);
      apiLogger.info({ userId }, "WS connection closed");
    });

    socket.on("error", (err) => {
      apiLogger.warn({ err, userId }, "WS error");
    });
  });
}

export { app };
