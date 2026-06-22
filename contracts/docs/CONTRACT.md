# AcademicTranscriptContract — Reference

Solidity `^0.8.20` · Optimizer enabled (200 runs) · License: MIT

The contract is the on-chain source of truth for transcript integrity. It stores
**only hashes and identifiers** — never the document itself or personal data. The
PDF lives on IPFS; its SHA-256 digest is anchored here so anyone can prove a file
is authentic and unmodified.

## Trust model

```
owner ──registers──► institution (wallet) ──registers──► student
                                          └──issues────► transcript (hash anchor)
```

- **owner** — the deployer. Can whitelist institutions. Nothing else.
- **institution** — a whitelisted wallet. Can register its own students and
  issue/revoke transcripts for them. Cannot touch another institution's data.
- **verifier** — anyone. Calls `verifyTranscript` (a free `view`) to check a hash.

## State variables

| Variable | Type | Purpose |
|---|---|---|
| `owner` | `address` | Contract administrator (deployer). |
| `registeredInstitutions` | `mapping(address => bool)` | Fast "is this wallet an institution" check. |
| `institutions` | `mapping(string => Institution)` | institutionId → record. |
| `students` | `mapping(string => Student)` | studentId → record. |
| `transcripts` | `mapping(string => Transcript)` | transcriptId → record. |
| `studentTranscripts` | `mapping(string => string[])` | studentId → transcriptIds. |
| `institutionIdByWallet` | `mapping(address => string)` *(private)* | Reverse lookup used to enforce ownership. |

## Structs

```solidity
Institution { string institutionId; string name; address walletAddress; bool isActive; uint256 registeredAt; }
Student     { string studentId; string name; string email; string institutionId; bool isActive; uint256 registeredAt; }
Transcript  { string transcriptId; string studentId; string institutionId; string ipfsHash; string sha256Hash; uint256 issuedAt; bool isRevoked; }
```

## Custom errors

| Error | Raised when |
|---|---|
| `Unauthorized()` | Caller lacks the required role / ownership. |
| `AlreadyExists()` | Duplicate institution / student / transcript id. |
| `NotFound()` | Referenced record does not exist. |
| `Revoked()` | Attempt to revoke an already-revoked transcript. |
| `InvalidInput()` | Empty required string or zero address. |

Custom errors are used instead of `require` strings for lower gas.

## Functions

### `registerInstitution(string institutionId, string name, address walletAddress)`
- **Access:** `onlyOwner`
- **Effect:** Whitelists `walletAddress` and stores the institution record.
- **Reverts:** `InvalidInput` (empty id / zero address), `AlreadyExists` (dup id or wallet already bound).
- **Emits:** `InstitutionRegistered(institutionId, wallet, timestamp)`

### `registerStudent(string studentId, string name, string email, string institutionId)`
- **Access:** `onlyRegisteredInstitution`
- **Effect:** Registers a student under the caller's own institution.
- **Reverts:** `InvalidInput`, `AlreadyExists` (dup studentId), `Unauthorized` (caller does not own `institutionId`), `NotFound` (institution missing).
- **Emits:** `StudentRegistered(studentId, institutionId, timestamp)`

### `addTranscript(string transcriptId, string studentId, string ipfsHash, string sha256Hash) → bool`
- **Access:** `onlyRegisteredInstitution`
- **Effect:** Anchors a transcript. Appends to `studentTranscripts`.
- **Reverts:** `InvalidInput` (empty fields), `AlreadyExists` (dup transcriptId), `NotFound` (unknown student), `Unauthorized` (student not owned by caller).
- **Emits:** `TranscriptIssued(transcriptId, studentId, sha256Hash, timestamp)`

### `verifyTranscript(string transcriptId, string sha256Hash) → (bool isValid, bool isRevoked, uint256 issuedAt, string institutionId)`
- **Access:** Public `view` (free, no auth).
- **Returns:** `isValid` is true only when the transcript exists, the hash matches, **and** it is not revoked. Unknown ids return `(false, false, 0, "")`.

### `revokeTranscript(string transcriptId)`
- **Access:** `onlyRegisteredInstitution`
- **Effect:** Sets `isRevoked = true`. IPFS hash is never mutated.
- **Reverts:** `NotFound`, `Revoked` (already revoked), `Unauthorized` (not the issuer).
- **Emits:** `TranscriptRevoked(transcriptId, timestamp)`

### `getTranscriptById(string transcriptId) → Transcript`
- **Access:** Public `view`. **Reverts:** `NotFound`.

### `getStudentTranscripts(string studentId) → string[]`
- **Access:** Public `view`. Returns transcript ids (possibly empty).

### `isInstitutionRegistered(address wallet) → bool`
- **Access:** Public `view`.

## Events

```solidity
event InstitutionRegistered(string institutionId, address wallet, uint256 timestamp);
event StudentRegistered(string studentId, string institutionId, uint256 timestamp);
event TranscriptIssued(string transcriptId, string studentId, string sha256Hash, uint256 timestamp);
event TranscriptRevoked(string transcriptId, uint256 timestamp);
```

## Deploy

```bash
npx hardhat run scripts/deploy.js --network ganache   # local
npx hardhat run scripts/deploy.js --network sepolia    # testnet
```

The deploy script writes `{ address, abi, chainId }` to
`backend/src/config/contract.json` automatically.
