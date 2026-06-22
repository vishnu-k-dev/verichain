import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * JWT helpers. Access tokens are short-lived; refresh tokens long-lived and the
 * refresh token's hash is also persisted on the User doc for revocation.
 */

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/**
 * Issue an access + refresh pair for a user document.
 * @param {{ id: string, role: string, linkedId?: string }} user
 */
export function issueTokenPair(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    linkedId: user.linkedId || null,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
