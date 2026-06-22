import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORE = path.resolve(__dirname, "../../.ipfs-store");

// "Live" Pinata mode requires either a JWT or the legacy key pair.
const LIVE = Boolean(env.pinata.jwt || (env.pinata.apiKey && env.pinata.secretApiKey));

let pinataClient = null;
async function getPinata() {
  if (pinataClient) return pinataClient;
  const { PinataSDK } = await import("pinata-web3");
  pinataClient = new PinataSDK({
    pinataJwt: env.pinata.jwt,
    pinataGateway: env.pinata.gateway.replace(/^https?:\/\//, ""),
  });
  return pinataClient;
}

/**
 * Build the public gateway URL for a CID.
 * @param {string} cid
 */
export function getFileUrl(cid) {
  return `${env.pinata.gateway.replace(/\/$/, "")}/ipfs/${cid}`;
}

/**
 * Upload a file buffer to IPFS (via Pinata) and return its CID + gateway URL.
 * Falls back to a deterministic local content store when no Pinata credentials
 * are configured, so the end-to-end flow still works in local development.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {object} [metadata]
 * @returns {Promise<{ cid: string, url: string }>}
 */
export async function uploadFile(buffer, filename, metadata = {}) {
  if (LIVE) {
    const pinata = await getPinata();
    const file = new File([buffer], filename, { type: "application/pdf" });
    const result = await pinata.upload.file(file).addMetadata({
      name: filename,
      keyValues: metadata,
    });
    const cid = result.IpfsHash;
    logger.info(`IPFS upload (Pinata): ${filename} -> ${cid}`);
    return { cid, url: getFileUrl(cid) };
  }

  // ---- Local fallback (content-addressed by sha256, CIDv0-ish prefix) ----
  fs.mkdirSync(LOCAL_STORE, { recursive: true });
  const digest = crypto.createHash("sha256").update(buffer).digest("hex");
  const cid = `Qm${digest.slice(0, 44)}`; // pseudo-CID, stable for same bytes
  fs.writeFileSync(path.join(LOCAL_STORE, cid), buffer);
  fs.writeFileSync(
    path.join(LOCAL_STORE, `${cid}.meta.json`),
    JSON.stringify({ filename, metadata, size: buffer.length }, null, 2)
  );
  logger.warn(`IPFS upload (local mock): ${filename} -> ${cid}`);
  return { cid, url: getFileUrl(cid) };
}

/**
 * Fetch the raw bytes for a CID (used by the proxied download endpoint).
 * @param {string} cid
 * @returns {Promise<Buffer>}
 */
export async function fetchFile(cid) {
  if (LIVE) {
    const res = await fetch(getFileUrl(cid));
    if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const filePath = path.join(LOCAL_STORE, cid);
  if (!fs.existsSync(filePath)) throw new Error(`File not found for CID ${cid}`);
  return fs.readFileSync(filePath);
}

export const ipfsMode = LIVE ? "pinata" : "local-mock";

export default { uploadFile, getFileUrl, fetchFile, ipfsMode };
