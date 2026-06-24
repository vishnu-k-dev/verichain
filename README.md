# Ledgr — Blockchain Transcript Verification

A simple, real blockchain mini-project. An institution **issues** academic
transcripts onto an Ethereum smart contract; anyone can **verify** a transcript in
seconds — by its certificate ID or by re-uploading the PDF. Because the record
lives on-chain, it can't be forged or quietly altered.

> Tiny on purpose: **one smart contract + one small server + one React page.**
> No database, no login, no IPFS — just the blockchain as the source of truth.

## How it works

```
   React UI  ──HTTP──►  Express relayer  ──ethers.js──►  TranscriptRegistry
  (issue /             (one wallet signs              (smart contract on a
   verify)              transactions)                  local Ethereum chain)
```

- **Issue** → the server calls the contract's `issue(...)`; the transcript (name,
  roll no, course, grade, and an optional SHA-256 of the PDF) is stored on-chain.
  You get a certificate ID, the transaction hash, the block number, and a QR code.
- **Verify** → reads straight from the chain. Enter a certificate ID, or upload the
  PDF — the file is hashed in your browser and matched against the on-chain hash.
- **Revoke** → the institution can revoke a transcript; verification then shows
  *Revoked* instantly.

The blockchain stores only the transcript record + hash. Verifying is a free,
public read — no account needed.

## Run it (one command)

Requires **Node.js 20+**.

```bash
npm run setup     # installs contracts, server, and client deps
npm run dev       # starts the chain, deploys the contract, runs API + UI
```

Then open **http://localhost:5173**.

`npm run dev` runs three things together:
1. a local Ethereum chain (`hardhat node`, port 8545),
2. deploys `TranscriptRegistry` and writes its address/ABI to `server/contract.json`,
3. starts the relayer API (port 5000) and the React UI (port 5173).

> First time, click **“Fill sample data”** on the Issue tab, issue a transcript,
> then copy its ID into the Verify tab (or scan the QR). Try uploading the same
> PDF under *Verify → By PDF file* to see hash-based verification.

## Project structure

```
.
├── contracts/   # Hardhat: TranscriptRegistry.sol, tests, deploy script
├── server/      # Express relayer (index.js) — talks to the contract via ethers
├── client/      # React + Vite + Tailwind UI (Issue / Verify / Records)
└── package.json # one-command orchestration (npm run dev)
```

## Tech stack

| Part | Tech |
|---|---|
| Smart contract | Solidity ^0.8.20, Hardhat |
| Chain | Hardhat local node (→ Sepolia optional) |
| Server | Node.js, Express, ethers.js v6 |
| UI | React 18, Vite, Tailwind CSS |
| Extras | `qrcode` (QR), Web Crypto (browser-side SHA-256) |

## Tests

```bash
npm test        # Hardhat contract tests (8 tests)
```

## Deploy to a public testnet (optional)

Put `SEPOLIA_RPC_URL` and a funded `PRIVATE_KEY` in `.env`, then:

```bash
npm --prefix contracts run deploy:sepolia
# update server/.env (RPC_URL + PRIVATE_KEY) to point at Sepolia, then npm --prefix server start
```

## Notes

- The default `PRIVATE_KEY` is Hardhat's well-known test account — **local dev
  only**, never use it on a real network.
- Restarting `npm run dev` starts a fresh chain, so previously issued transcripts
  reset. That's expected for local development.

MIT
