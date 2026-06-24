import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import QRCode from "qrcode";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

// ---- Config (works out-of-the-box against `npx hardhat node`) ----
const PORT = process.env.PORT || 5000;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
// Default = Hardhat account #0 (the contract owner on a fresh local chain).
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ---- Connect to the chain + contract ----
const contractPath = path.resolve(__dirname, "contract.json");
let registry = null;
let wallet = null;
let provider = null;

function connect() {
  if (!fs.existsSync(contractPath)) return false;
  const { address, abi } = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  registry = new ethers.Contract(address, abi, wallet);
  return true;
}
connect();

// ---- Helpers ----
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/** Wrap async handlers so errors flow to the error middleware. */
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Guard: ensure the contract is deployed/connected. */
function ensureReady() {
  if (!registry && !connect()) {
    const e = new Error("Contract not deployed yet. Run the deploy step first.");
    e.status = 503;
    throw e;
  }
}

/** Generate a short, readable certificate id like "VC-7F3A21". */
const newId = () => "VC-" + crypto.randomBytes(3).toString("hex").toUpperCase();

/** Normalise a hex string to a bytes32 file hash (0x + 64 hex), or zero. */
function toBytes32(hashHex) {
  if (!hashHex) return ethers.ZeroHash;
  const clean = hashHex.startsWith("0x") ? hashHex : "0x" + hashHex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(clean)) {
    const e = new Error("fileHash must be a 32-byte (64 hex char) SHA-256");
    e.status = 400;
    throw e;
  }
  return clean.toLowerCase();
}

/** Convert an on-chain Transcript struct into clean JSON. */
function format(t) {
  const zero = "0x" + "0".repeat(64);
  return {
    id: t.id,
    studentName: t.studentName,
    rollNo: t.rollNo,
    course: t.course,
    grade: t.grade,
    fileHash: t.fileHash === zero ? null : t.fileHash,
    issuer: t.issuer,
    issuedAt: Number(t.issuedAt),
    revoked: t.revoked,
  };
}

const statusOf = (t) => (t.revoked ? "REVOKED" : "VALID");

// ---- Routes ----

app.get("/api/health", h(async (_req, res) => {
  if (!registry && !connect()) {
    return res.json({ ok: true, connected: false, message: "Contract not deployed yet" });
  }
  const [net, address] = await Promise.all([
    provider.getNetwork(),
    registry.getAddress(),
  ]);
  res.json({
    ok: true,
    connected: true,
    contract: address,
    chainId: Number(net.chainId),
    issuer: wallet.address,
  });
}));

// List all transcripts (newest first).
app.get("/api/transcripts", h(async (_req, res) => {
  ensureReady();
  const total = Number(await registry.total());
  const page = total ? await registry.list(0, total) : [];
  const items = page.map(format).reverse();
  res.json({ count: items.length, transcripts: items });
}));

// Get one transcript by id.
app.get("/api/transcripts/:id", h(async (req, res) => {
  ensureReady();
  try {
    const t = await registry.get(req.params.id);
    res.json({ transcript: format(t) });
  } catch {
    res.status(404).json({ message: "Transcript not found" });
  }
}));

// Issue a transcript (writes to the blockchain).
app.post("/api/transcripts", h(async (req, res) => {
  ensureReady();
  const { studentName, rollNo, course, grade, fileHash } = req.body;
  if (!studentName || !rollNo || !course || !grade) {
    return res.status(400).json({ message: "studentName, rollNo, course and grade are required" });
  }
  const id = req.body.id?.trim() || newId();
  const hash = toBytes32(fileHash);

  const tx = await registry.issue(id, studentName, rollNo, course, grade, hash);
  const receipt = await tx.wait();
  const t = await registry.get(id);

  const verifyUrl = `${FRONTEND_URL}/?verify=${id}`;
  const qr = await QRCode.toDataURL(verifyUrl, { width: 320, margin: 2 });

  res.status(201).json({
    transcript: format(t),
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    verifyUrl,
    qr,
  });
}));

// Revoke a transcript.
app.post("/api/transcripts/:id/revoke", h(async (req, res) => {
  ensureReady();
  const tx = await registry.revoke(req.params.id);
  const receipt = await tx.wait();
  const t = await registry.get(req.params.id);
  res.json({ transcript: format(t), txHash: tx.hash, blockNumber: receipt.blockNumber });
}));

// Verify by id or by file hash (public — reads from the chain).
app.post("/api/verify", h(async (req, res) => {
  ensureReady();
  const { id, fileHash } = req.body;

  if (id) {
    try {
      const t = await registry.get(id);
      return res.json({ status: statusOf(t), transcript: format(t) });
    } catch {
      return res.json({ status: "NOT_FOUND" });
    }
  }

  if (fileHash) {
    const [found, t] = await registry.verifyByHash(toBytes32(fileHash));
    if (!found) return res.json({ status: "NOT_FOUND" });
    return res.json({ status: statusOf(t), transcript: format(t) });
  }

  res.status(400).json({ message: "Provide an id or a fileHash" });
}));

// ---- Errors ----
app.use((_req, res) => res.status(404).json({ message: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  // Map common contract reverts to friendly messages.
  let message = err.shortMessage || err.message;
  if (err.code === "CALL_EXCEPTION") {
    if (/AlreadyExists/.test(message)) message = "A transcript with that id already exists";
    else if (/NotOwner/.test(message)) message = "Only the issuing institution can do that";
    else if (/AlreadyRevoked/.test(message)) message = "Transcript is already revoked";
    else if (/DoesNotExist/.test(message)) message = "Transcript not found";
  }
  if (err.code === "ECONNREFUSED" || /could not detect network/i.test(message)) {
    return res.status(503).json({ message: "Blockchain node not reachable. Is `hardhat node` running?" });
  }
  res.status(status).json({ message });
});

app.listen(PORT, () => {
  console.log(`Relayer API → http://localhost:${PORT}`);
  console.log(registry ? `Contract connected ✓` : `Waiting for deploy (server/contract.json)…`);
});
