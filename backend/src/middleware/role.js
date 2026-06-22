import { ApiError } from "../utils/ApiError.js";

/**
 * Restrict a route to one or more roles. Must run after `auth`.
 * @param {string[]} allowed e.g. ['admin', 'institution']
 */
export function role(allowed = []) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Requires one of role: ${allowed.join(", ")}`,
          "INSUFFICIENT_ROLE"
        )
      );
    }
    return next();
  };
}

export default role;
