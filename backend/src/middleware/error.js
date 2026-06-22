import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/** 404 handler for unmatched routes. */
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
}

/**
 * Global error handler. Normalises Mongoose/JWT/known errors into the standard
 * `{ success, message, code }` envelope. Stack traces are never sent in prod.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "Internal server error";
  let details = err.details;

  // Mongoose: duplicate key.
  if (err.code === 11000) {
    status = 409;
    code = "DUPLICATE_KEY";
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with that ${field} already exists`;
  }

  // Mongoose: validation error.
  if (err.name === "ValidationError") {
    status = 400;
    code = "VALIDATION_ERROR";
    details = Object.values(err.errors).map((e) => e.message);
    message = "Validation failed";
  }

  // Mongoose: bad ObjectId / cast.
  if (err.name === "CastError") {
    status = 400;
    code = "INVALID_ID";
    message = `Invalid value for ${err.path}`;
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} →`, err.stack || err.message);
  }

  const body = { success: false, message, code };
  if (details) body.details = details;
  if (!env.isProd && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
}

export default errorHandler;
