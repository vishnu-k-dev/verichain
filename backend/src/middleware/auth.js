import { verifyAccessToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Verify the Bearer access token and attach `req.user = { userId, role, linkedId }`.
 * Use on any protected route.
 */
export function auth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      linkedId: payload.linkedId ?? null,
    };
    return next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    return next(ApiError.unauthorized("Invalid or expired token", code));
  }
}

export default auth;
