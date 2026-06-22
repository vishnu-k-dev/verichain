/**
 * Operational error with an HTTP status and a stable machine-readable code.
 * Thrown by controllers/services and rendered by the global error handler.
 */
export class ApiError extends Error {
  constructor(status, message, code = "ERROR", details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = "Bad request", code = "BAD_REQUEST", details) {
    return new ApiError(400, msg, code, details);
  }
  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, msg, code);
  }
  static forbidden(msg = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, msg, code);
  }
  static notFound(msg = "Not found", code = "NOT_FOUND") {
    return new ApiError(404, msg, code);
  }
  static conflict(msg = "Already exists", code = "CONFLICT") {
    return new ApiError(409, msg, code);
  }
  static internal(msg = "Internal server error", code = "INTERNAL_ERROR") {
    return new ApiError(500, msg, code);
  }
}

export default ApiError;
