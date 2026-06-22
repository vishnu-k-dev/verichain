/** Decode a JWT payload (no verification — display only). */
export function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Whether a JWT is expired (with a small clock-skew buffer). */
export function isExpired(token, skewSeconds = 10) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp - skewSeconds;
}
