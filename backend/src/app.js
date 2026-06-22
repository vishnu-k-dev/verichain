import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { notFound, errorHandler } from "./middleware/error.js";
import * as chain from "./services/blockchain.service.js";
import { ipfsMode } from "./services/ipfs.service.js";

import authRoutes from "./routes/auth.routes.js";
import institutionRoutes from "./routes/institution.routes.js";
import studentRoutes from "./routes/student.routes.js";
import transcriptRoutes from "./routes/transcript.routes.js";
import verifyRoutes from "./routes/verify.routes.js";

const __filename = fileURLToPath(import.meta.url);

/** Build and configure the Express app (no listening — testable). */
export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isTest) app.use(morgan("dev"));

  // Health / status.
  app.get("/api/health", async (_req, res) => {
    const blockchain = await chain.getNetworkInfo().catch(() => ({ configured: false }));
    res.json({
      success: true,
      status: "ok",
      service: "transcript-verification-api",
      env: env.nodeEnv,
      ipfs: ipfsMode,
      blockchain,
      time: new Date().toISOString(),
    });
  });

  // API routes.
  app.use("/api/auth", authRoutes);
  app.use("/api/institutions", institutionRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/transcripts", transcriptRoutes);
  app.use("/api/verify", verifyRoutes);

  // 404 + error handling (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

/** Boot the server (connect DB, then listen). */
async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(env.port, () => {
      logger.info(`API listening on http://localhost:${env.port}`);
      logger.info(`IPFS mode: ${ipfsMode}`);
      logger.info(`Blockchain configured: ${chain.isConfigured()}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

// Start only when executed directly (so tests can import createApp).
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (invokedDirectly) start();

export default createApp;
