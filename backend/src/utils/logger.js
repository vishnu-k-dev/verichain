/* Minimal structured logger. Silenced during tests to keep output clean. */
const isTest = process.env.NODE_ENV === "test";

const ts = () => new Date().toISOString();

export const logger = {
  info: (...args) => !isTest && console.log(`[${ts()}] INFO `, ...args),
  warn: (...args) => !isTest && console.warn(`[${ts()}] WARN `, ...args),
  error: (...args) => !isTest && console.error(`[${ts()}] ERROR`, ...args),
  debug: (...args) =>
    !isTest && process.env.DEBUG && console.debug(`[${ts()}] DEBUG`, ...args),
};

export default logger;
