import { ethers } from "ethers";
import { createRequire } from "module";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";

const require = createRequire(import.meta.url);

// Lazily loaded so a missing/empty contract.json never crashes the process.
let contractMeta = null;
function loadContractMeta() {
  if (contractMeta) return contractMeta;
  try {
    contractMeta = require("../config/contract.json");
  } catch {
    contractMeta = { address: "", abi: [] };
  }
  return contractMeta;
}

function rpcUrl() {
  return env.blockchain.network === "sepolia"
    ? env.blockchain.sepoliaRpcUrl
    : env.blockchain.ganacheUrl;
}

let _provider = null;
export function getProvider() {
  if (_provider) return _provider;
  const url = rpcUrl();
  if (!url) throw ApiError.internal("Blockchain RPC URL not configured", "CHAIN_NOT_CONFIGURED");
  _provider = new ethers.JsonRpcProvider(url);
  return _provider;
}

function contractAddress() {
  return env.blockchain.contractAddress || loadContractMeta().address || "";
}

export function isConfigured() {
  return Boolean(contractAddress() && loadContractMeta().abi?.length);
}

function assertConfigured() {
  if (!isConfigured()) {
    throw new ApiError(
      503,
      "Blockchain is not configured. Deploy the contract and set CONTRACT_ADDRESS.",
      "CHAIN_NOT_CONFIGURED"
    );
  }
}

/** Read-only contract instance (provider-connected). */
export function getReadContract() {
  assertConfigured();
  return new ethers.Contract(contractAddress(), loadContractMeta().abi, getProvider());
}

/** The operator/owner wallet — signs owner-only txs (institution registration). */
export function getOperatorWallet() {
  const provider = getProvider();
  if (env.blockchain.privateKey) {
    return new ethers.Wallet(env.blockchain.privateKey, provider);
  }
  // Fall back to account #0 of the mnemonic.
  return deriveWallet(0);
}

/** Derive a custodial wallet for a given HD index, connected to the provider. */
export function deriveWallet(index) {
  const provider = getProvider();
  const wallet = ethers.HDNodeWallet.fromPhrase(
    env.blockchain.mnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
  return wallet.connect(provider);
}

/** Address that a given derivation index resolves to (no provider needed). */
export function addressForIndex(index) {
  return ethers.HDNodeWallet.fromPhrase(
    env.blockchain.mnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  ).address;
}

/**
 * On local dev chains, top up a custodial institution wallet from the operator
 * so it can pay gas. No-op on real networks (operator must fund out-of-band).
 */
async function ensureFunded(address) {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const isLocal = chainId === 1337 || chainId === 31337;
    if (!isLocal) return;

    const balance = await provider.getBalance(address);
    if (balance >= ethers.parseEther("0.05")) return;

    const operator = getOperatorWallet();
    const tx = await operator.sendTransaction({
      to: address,
      value: ethers.parseEther("1"),
    });
    await tx.wait();
    logger.info(`Funded institution wallet ${address} with 1 ETH (local)`);
  } catch (err) {
    logger.warn(`ensureFunded skipped for ${address}: ${err.message}`);
  }
}

/** Map ethers/contract errors to friendly ApiErrors. */
function mapChainError(err, fallbackMsg) {
  const name = err?.revert?.name || err?.errorName;
  const map = {
    Unauthorized: [403, "Not authorised for this on-chain action", "CHAIN_UNAUTHORIZED"],
    AlreadyExists: [409, "Record already exists on-chain", "CHAIN_CONFLICT"],
    NotFound: [404, "Record not found on-chain", "CHAIN_NOT_FOUND"],
    Revoked: [409, "Transcript already revoked on-chain", "CHAIN_REVOKED"],
    InvalidInput: [400, "Invalid input for on-chain action", "CHAIN_BAD_INPUT"],
  };
  if (name && map[name]) {
    const [status, message, code] = map[name];
    return new ApiError(status, message, code);
  }
  if (err?.code === "CALL_EXCEPTION") {
    return new ApiError(502, err.shortMessage || fallbackMsg, "CHAIN_CALL_EXCEPTION");
  }
  if (err?.code === "NETWORK_ERROR" || err?.code === "ECONNREFUSED" || err?.code === "SERVER_ERROR") {
    return new ApiError(503, "Blockchain node unreachable", "CHAIN_UNREACHABLE");
  }
  if (err instanceof ApiError) return err;
  return new ApiError(502, fallbackMsg || err?.message || "Blockchain error", "CHAIN_ERROR");
}

async function sendTx(contractWithSigner, method, args, label) {
  try {
    const tx = await contractWithSigner[method](...args);
    logger.info(`tx ${label} sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`tx ${label} mined in block ${receipt.blockNumber}`);
    return { txHash: tx.hash, blockNumber: receipt.blockNumber };
  } catch (err) {
    logger.error(`tx ${label} failed: ${err.shortMessage || err.message}`);
    throw mapChainError(err, `On-chain ${label} failed`);
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Owner-signed: whitelist an institution wallet on-chain. */
export async function registerInstitution({ institutionId, name, walletAddress }) {
  assertConfigured();
  const contract = getReadContract().connect(getOperatorWallet());
  return sendTx(contract, "registerInstitution", [institutionId, name, walletAddress], "registerInstitution");
}

/** Institution-signed: register a student under that institution. */
export async function registerStudent({ walletIndex, studentId, name, email, institutionId }) {
  assertConfigured();
  const signer = deriveWallet(walletIndex);
  await ensureFunded(signer.address);
  const contract = getReadContract().connect(signer);
  return sendTx(contract, "registerStudent", [studentId, name, email, institutionId], "registerStudent");
}

/** Institution-signed: anchor a transcript hash on-chain. */
export async function addTranscript({ walletIndex, transcriptId, studentId, ipfsHash, sha256Hash }) {
  assertConfigured();
  const signer = deriveWallet(walletIndex);
  await ensureFunded(signer.address);
  const contract = getReadContract().connect(signer);
  return sendTx(
    contract,
    "addTranscript",
    [transcriptId, studentId, ipfsHash, sha256Hash],
    "addTranscript"
  );
}

/** Institution-signed: revoke a transcript on-chain. */
export async function revokeTranscript({ walletIndex, transcriptId }) {
  assertConfigured();
  const signer = deriveWallet(walletIndex);
  await ensureFunded(signer.address);
  const contract = getReadContract().connect(signer);
  return sendTx(contract, "revokeTranscript", [transcriptId], "revokeTranscript");
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function verifyTranscript(transcriptId, sha256Hash) {
  assertConfigured();
  try {
    const contract = getReadContract();
    const [isValid, isRevoked, issuedAt, institutionId] = await contract.verifyTranscript(
      transcriptId,
      sha256Hash
    );
    return {
      isValid,
      isRevoked,
      issuedAt: Number(issuedAt),
      institutionId,
    };
  } catch (err) {
    throw mapChainError(err, "On-chain verification failed");
  }
}

export async function getTranscriptById(transcriptId) {
  assertConfigured();
  try {
    const t = await getReadContract().getTranscriptById(transcriptId);
    return {
      transcriptId: t.transcriptId,
      studentId: t.studentId,
      institutionId: t.institutionId,
      ipfsHash: t.ipfsHash,
      sha256Hash: t.sha256Hash,
      issuedAt: Number(t.issuedAt),
      isRevoked: t.isRevoked,
    };
  } catch (err) {
    throw mapChainError(err, "On-chain lookup failed");
  }
}

export async function getStudentTranscripts(studentId) {
  assertConfigured();
  try {
    return await getReadContract().getStudentTranscripts(studentId);
  } catch (err) {
    throw mapChainError(err, "On-chain lookup failed");
  }
}

export async function isInstitutionRegistered(wallet) {
  assertConfigured();
  try {
    return await getReadContract().isInstitutionRegistered(wallet);
  } catch (err) {
    throw mapChainError(err, "On-chain lookup failed");
  }
}

/** Lightweight status for the health endpoint. */
export async function getNetworkInfo() {
  if (!isConfigured()) {
    return { configured: false, network: env.blockchain.network, address: null };
  }
  try {
    const network = await getProvider().getNetwork();
    return {
      configured: true,
      network: env.blockchain.network,
      chainId: Number(network.chainId),
      address: contractAddress(),
    };
  } catch (err) {
    return { configured: true, reachable: false, error: err.message };
  }
}

export default {
  isConfigured,
  getProvider,
  getOperatorWallet,
  deriveWallet,
  addressForIndex,
  registerInstitution,
  registerStudent,
  addTranscript,
  revokeTranscript,
  verifyTranscript,
  getTranscriptById,
  getStudentTranscripts,
  isInstitutionRegistered,
  getNetworkInfo,
};
