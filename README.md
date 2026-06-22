# VeriChain — Blockchain Academic Transcript Verification

Tamper-proof issuance and instant verification of academic transcripts, anchored
on Ethereum. Institutions issue QR-stamped PDF transcripts whose SHA-256
fingerprint is recorded on-chain; anyone can verify authenticity in seconds by
scanning the QR or uploading the file — no account required.

> **Status:** active build. Smart contracts and backend API are complete and
> tested. Frontend, Docker, and full documentation are in progress.

## Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity ^0.8.20, Hardhat |
| Blockchain | Ganache (local) → Sepolia testnet |
| Backend | Node.js 20+, Express, ethers.js v6 |
| Database | MongoDB (Mongoose) |
| File storage | IPFS via Pinata (local-store fallback) |
| Auth | JWT (access + refresh) |
| Frontend | React 18 + Vite, Tailwind CSS |
| QR / PDF | `qrcode`, `pdf-lib` |
| Testing | Hardhat (Solidity), Jest + Supertest (API) |

## Monorepo layout

```
blockchain-transcript/
├── contracts/   # Hardhat project — Solidity, tests, deploy script
├── backend/     # Express API — models, services, routes, controllers, tests
├── frontend/    # React + Vite app (in progress)
└── docs/        # Architecture & sequence diagrams (in progress)
```

## Quick start

### 1. Contracts

```bash
cd contracts
npm install
npx hardhat test          # 24 tests, 100% line coverage
npx hardhat node          # or run Ganache on :7545
npx hardhat run scripts/deploy.js --network ganache
```

The deploy script writes the address + ABI to
`backend/src/config/contract.json` automatically.

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example ../.env   # then fill in secrets
npm test                     # Jest + Supertest (in-memory Mongo)
npm run dev                  # http://localhost:5000
```

## Architecture (high level)

```
 React SPA ──HTTP──> Express API ──ethers──> Smart Contract (Ethereum)
                          │
                          ├──> MongoDB (off-chain metadata)
                          └──> IPFS / Pinata (transcript PDFs)
```

The blockchain stores only hashes and identifiers. PDFs live on IPFS; personal
data lives in MongoDB. Verification re-hashes the document and compares against
the on-chain anchor.

## License

MIT
