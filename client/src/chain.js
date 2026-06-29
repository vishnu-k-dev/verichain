import { ethers } from "ethers";

// Read-only RPC (used for verification — no wallet needed). Override for testnets.
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

let _meta = null;

/** Load the deployed contract address + ABI (written by the deploy script). */
export async function loadMeta() {
  if (_meta) return _meta;
  const res = await fetch("/contract.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Contract not deployed yet — run `npm run dev`.");
  _meta = await res.json();
  return _meta;
}

export function hasWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

/** A read-only contract instance via the public RPC (no MetaMask required). */
export async function readContract() {
  const { address, abi } = await loadMeta();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(address, abi, provider);
}

/** Prompt MetaMask to connect and return the active account address. */
export async function connectWallet() {
  if (!hasWallet()) {
    throw new Error("MetaMask not found. Install it to issue or revoke transcripts.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return signer.getAddress();
}

/** A write-enabled contract instance signed by the connected MetaMask account. */
export async function writeContract() {
  if (!hasWallet()) throw new Error("MetaMask not found.");
  await ensureNetwork();
  const { address, abi } = await loadMeta();
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(address, abi, signer);
}

/** Ask MetaMask to switch to (or add) the contract's network. */
export async function ensureNetwork() {
  const { chainId } = await loadMeta();
  const hex = "0x" + Number(chainId).toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
  } catch (err) {
    // 4902 = chain not added to MetaMask yet → add it (local chains only).
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hex,
            chainName: "Ledgr Local Chain",
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } else if (err.code !== -32002) {
      throw err;
    }
  }
}

/** Listen for MetaMask account/chain changes. Returns an unsubscribe fn. */
export function onWalletChange(cb) {
  if (!hasWallet()) return () => {};
  const handler = () => cb();
  window.ethereum.on("accountsChanged", handler);
  window.ethereum.on("chainChanged", handler);
  return () => {
    window.ethereum.removeListener("accountsChanged", handler);
    window.ethereum.removeListener("chainChanged", handler);
  };
}

/** Turn a 64-hex SHA-256 into a bytes32, or the zero hash when absent. */
export function toBytes32(hex) {
  if (!hex) return ethers.ZeroHash;
  return hex.startsWith("0x") ? hex : "0x" + hex;
}

/** Convert an on-chain Transcript struct (ethers Result) into plain JSON. */
export function format(t) {
  const fileHash = t.fileHash && t.fileHash !== ethers.ZeroHash ? t.fileHash : null;
  return {
    id: t.id,
    studentName: t.studentName,
    rollNo: t.rollNo,
    course: t.course,
    grade: t.grade,
    fileHash,
    issuer: t.issuer,
    issuedAt: Number(t.issuedAt),
    revoked: t.revoked,
  };
}

/** Map common contract reverts / wallet errors to friendly messages. */
export function explainError(err) {
  const msg = err?.shortMessage || err?.info?.error?.message || err?.message || "Transaction failed";
  if (/NotOwner/.test(msg)) {
    return "This wallet isn't the contract owner. Import the issuer account into MetaMask to issue or revoke.";
  }
  if (/AlreadyExists/.test(msg)) return "A transcript with that id already exists.";
  if (/AlreadyRevoked/.test(msg)) return "This transcript is already revoked.";
  if (/DoesNotExist/.test(msg)) return "Transcript not found.";
  if (err?.code === "ACTION_REJECTED" || /rejected/i.test(msg)) return "You rejected the transaction in MetaMask.";
  if (/could not detect network|connection refused|failed to fetch/i.test(msg)) {
    return "Can't reach the blockchain. Is the local chain running (npm run dev)?";
  }
  return msg;
}

/** Generate a short, readable certificate id like "VC-7F3A21". */
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return "VC-" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
