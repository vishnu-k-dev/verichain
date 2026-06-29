# Ledgr — Blockchain Transcript Verification

A simple, real blockchain mini-project. An institution **issues** academic
transcripts onto an Ethereum smart contract by signing transactions in
**MetaMask**; anyone can **verify** a transcript in seconds — by its certificate
ID or by re-uploading the PDF. Because the record lives on-chain, it can't be
forged or quietly altered.

> Tiny on purpose: **one smart contract + one React page (dApp).**
> No backend, no database, no IPFS — the browser talks straight to the chain.

## How it works

```
   React dApp  ──MetaMask (sign)──►  TranscriptRegistry  ◄──read (public RPC)── anyone
  (issue / verify)                   (smart contract on Ethereum)
```

- **Issue / Revoke** → the browser asks **MetaMask** to sign a transaction that
  calls the contract. You see the real tx hash + block number afterwards.
- **Verify** → a free, public read straight from the chain (no wallet needed).
  Enter a certificate ID, or upload the PDF — it's hashed in your browser and
  matched against the on-chain hash.

The blockchain stores the transcript record (name, roll no, course, grade) plus
an optional SHA-256 of the PDF. **There is no database** — the chain is the
single source of truth.

## Run it

Requires **Node.js 20+** and the **MetaMask** browser extension.

```bash
npm run setup     # install contracts + client deps
npm run dev       # starts a local chain, deploys the contract, runs the UI
```

Then open **http://localhost:5173**.

`npm run dev` runs two things together:
1. a local Ethereum chain (`hardhat node`, port 8545),
2. deploys `TranscriptRegistry` and writes its address/ABI to
   `client/public/contract.json`, then starts the React app (port 5173).

### One-time MetaMask setup (to issue)

Verifying needs **no wallet**. To *issue or revoke*, you act as the contract
owner, so:

1. Install **MetaMask** and click **Connect** in the app — it will offer to add
   the local network (`Ledgr Local Chain`, RPC `http://127.0.0.1:8545`, chain id
   `31337`).
2. Import the **issuer account** (Hardhat account #0, which deployed the contract):
   - Address `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Private key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - ⚠️ This is a well-known **local-only test key** — never use it on a real network.
3. Connect that account, fill the Issue form (try **“Fill sample data”**), and
   confirm the MetaMask popup.

> If you restart `npm run dev`, the chain resets. MetaMask may then show a nonce
> error — fix it via **Settings → Advanced → Clear activity tab data**.

## Project structure

```
.
├── contracts/   # Hardhat: TranscriptRegistry.sol, tests, deploy script
├── client/      # React + Vite + Tailwind dApp (ethers.js + MetaMask)
└── package.json # one-command orchestration (npm run dev)
```

## Tech stack

| Part | Tech |
|---|---|
| Smart contract | Solidity ^0.8.20, Hardhat |
| Chain | Hardhat local node (→ Sepolia optional) |
| Wallet / signing | MetaMask + ethers.js v6 (`BrowserProvider`) |
| UI | React 18, Vite, Tailwind CSS |
| Extras | `qrcode` (QR), Web Crypto (browser SHA-256) |

## Tests

```bash
npm test        # Hardhat contract tests (8 tests)
```

## Deploy to a public testnet (optional)

Put `SEPOLIA_RPC_URL` and a funded `PRIVATE_KEY` in `.env`, then:

```bash
npm --prefix contracts run deploy:sepolia
```

Set `VITE_RPC_URL` (in `client/.env`) to a Sepolia RPC so reads/verification hit
the testnet, and point MetaMask at Sepolia for issuing.

## Notes

- Restarting `npm run dev` starts a fresh chain, so previously issued transcripts
  reset — expected for local development.
- The contract restricts issuing/revoking to its **owner** (the institution),
  while verification is open to everyone.

MIT
