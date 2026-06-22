import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the monorepo-root .env (two levels up from src/config), and fall back to
// a backend-local .env if present. Existing process.env always wins.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    // In test mode we tolerate missing secrets (they get mocked / overridden).
    if (process.env.NODE_ENV === "test") return "test-placeholder";
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: parseInt(process.env.PORT || "5000", 10),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  mongoUri:
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/transcript_verification",

  jwt: {
    accessSecret: required("JWT_SECRET", process.env.NODE_ENV === "test" ? "test-access-secret" : undefined),
    refreshSecret: required("JWT_REFRESH_SECRET", process.env.NODE_ENV === "test" ? "test-refresh-secret" : undefined),
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "7d",
  },

  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || "ganache",
    ganacheUrl: process.env.GANACHE_URL || "http://127.0.0.1:7545",
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || "",
    privateKey: process.env.PRIVATE_KEY || "",
    mnemonic:
      process.env.BLOCKCHAIN_MNEMONIC ||
      "test test test test test test test test test test test junk",
    contractAddress: process.env.CONTRACT_ADDRESS || "",
    // Optional path to a contract.json written at runtime (e.g. by the Docker
    // deployer into a shared volume). Takes precedence over the bundled copy.
    contractJsonPath: process.env.CONTRACT_JSON_PATH || "",
  },

  pinata: {
    apiKey: process.env.PINATA_API_KEY || "",
    secretApiKey: process.env.PINATA_SECRET_API_KEY || "",
    jwt: process.env.PINATA_JWT || "",
    gateway: process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud",
  },
};

export default env;
