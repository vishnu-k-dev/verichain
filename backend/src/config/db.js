import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Connect to MongoDB. Safe to call once at startup. In test mode the connection
 * is managed by mongodb-memory-server, so this is skipped.
 */
export async function connectDB(uri = env.mongoUri) {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) =>
    logger.error("MongoDB connection error", err.message)
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected")
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

export default connectDB;
