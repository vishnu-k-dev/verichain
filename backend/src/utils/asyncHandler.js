/**
 * Wraps an async route handler so any thrown/rejected error is forwarded to
 * Express's error middleware via next(err) — no repetitive try/catch needed.
 *
 * @param {Function} fn (req, res, next) => Promise
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
