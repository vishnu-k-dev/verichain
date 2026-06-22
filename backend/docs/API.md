# VeriChain API Reference

Base URL: `http://localhost:5000/api`

All responses are JSON. Success responses include `success: true`. Errors use a
consistent envelope:

```json
{ "success": false, "message": "Human readable message", "code": "MACHINE_CODE" }
```

Authentication uses **Bearer access tokens** (`Authorization: Bearer <token>`).
Access tokens expire in 15 minutes; use the refresh endpoint to get a new one.

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Validation / bad input |
| `401` | Missing / invalid / expired token |
| `403` | Authenticated but not allowed |
| `404` | Not found |
| `409` | Conflict (duplicate) |
| `503` | Blockchain not configured / node unreachable |

---

## Health

### `GET /api/health`
Public. Returns service, IPFS mode, and blockchain status.

```json
{
  "success": true,
  "status": "ok",
  "service": "transcript-verification-api",
  "env": "development",
  "ipfs": "local-mock",
  "blockchain": { "configured": true, "network": "ganache", "chainId": 1337, "address": "0x..." },
  "time": "2026-06-22T10:00:00.000Z"
}
```

---

## Auth

### `POST /api/auth/register`
Public. Self-service signup.

**Body**
```json
{ "email": "you@example.com", "password": "min8chars", "role": "verifier|student|institution|admin",
  "name": "Required for student/institution", "institutionCode": "Required for student/institution" }
```
- `student` — `institutionCode` must map to an **approved** institution; the student is provisioned and registered on-chain under that institution.
- `institution` — creates an unapproved institution + login; admin approves later.
- `admin` — only allowed when no admin exists yet (bootstrap).

**201**
```json
{ "success": true, "accessToken": "...", "refreshToken": "...",
  "user": { "id": "...", "email": "...", "role": "verifier", "linkedId": null } }
```

### `POST /api/auth/login`
Public. **Body** `{ "email", "password" }` → `{ accessToken, refreshToken, user }`.
`401 INVALID_CREDENTIALS` on bad email/password.

### `POST /api/auth/refresh`
Public. **Body** `{ "refreshToken" }` → `{ accessToken }`. Validated against the
stored refresh-token hash (revocation-aware).

### `POST /api/auth/logout`
Auth required. Clears the stored refresh-token hash. → `{ success, message }`.

### `GET /api/auth/me`
Auth required. → `{ user: { id, email, role, linkedId } }`.

---

## Institutions

### `POST /api/institutions/register` — admin
Create an institution. Pass `approve: true` to whitelist on-chain immediately.

**Body** `{ "name", "email", "institutionCode", "approve": true }`
→ **201** `{ institution }`

### `GET /api/institutions` — admin
→ `{ count, institutions: [...] }`

### `PATCH /api/institutions/:id/approve` — admin
Approves and registers the institution wallet on-chain. → `{ institution }`

### `GET /api/institutions/:id/students` — institution(self) / admin
→ `{ count, students: [...] }`

### `GET /api/institutions/me` — institution
The caller's own institution record. → `{ institution }`

### `GET /api/institutions/admin/users` — admin
All users (for the admin panel). → `{ count, users: [...] }`

---

## Students

### `POST /api/students/register` — institution / admin
An institution may only register students under itself.

**Body** `{ "name", "email", "password?", "institutionId? (admin only)" }`
→ **201** `{ student, account }` (`account` is non-null if a password was set)

### `GET /api/students/:id` — institution / student(self) / admin
→ `{ student, institution }`

### `GET /api/students/me` — student
→ `{ student }`

---

## Transcripts

### `POST /api/transcripts/issue` — institution
`multipart/form-data`: `studentId`, `title?`, `file` (PDF, ≤10MB).

Pipeline: QR → stamp PDF → SHA-256 → IPFS → anchor on-chain → save.

→ **201**
```json
{
  "success": true,
  "transcript": { "transcriptId": "...", "sha256Hash": "...", "ipfsCid": "...",
                  "transactionHash": "0x...", "blockNumber": 12, "qrCodeUrl": "data:image/png;base64,...",
                  "isRevoked": false, "issuedAt": "..." },
  "onChain": true,
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/...",
  "downloadUrl": "/api/transcripts/<id>/download",
  "verifyUrl": "http://localhost:5173/verify/<id>"
}
```

### `GET /api/transcripts` — institution / student / admin
Scoped to the caller (institution → its own; student → own; admin → all).
→ `{ count, transcripts: [...] }`

### `GET /api/transcripts/:id` — institution / student(self) / admin
→ `{ transcript }`

### `GET /api/transcripts/student/:studentId` — institution / student(self) / admin
→ `{ count, transcripts: [...] }`

### `POST /api/transcripts/:id/revoke` — institution(owner)
Revokes on-chain + sets the DB flag. → `{ transcript }`. `409` if already revoked.

### `GET /api/transcripts/:id/download` — institution / student / admin
Streams the QR-stamped PDF (`application/pdf`).

---

## Verify (Public — no auth)

### `GET /api/verify/:transcriptId`
Verifies by id using the recorded hash, cross-checking the blockchain.

→ **200**
```json
{
  "success": true,
  "status": "VALID|REVOKED|INVALID",
  "isValid": true,
  "isRevoked": false,
  "issuedAt": 1700000000,
  "transcriptId": "...",
  "studentName": "Ada Lovelace",
  "institutionName": "Alpha University",
  "sha256Hash": "...",
  "ipfsHash": "...",
  "ipfsUrl": "...",
  "transactionHash": "0x...",
  "blockNumber": 12,
  "verifiedVia": "blockchain"
}
```
→ **404** `{ success: true, status: "NOT_FOUND", isValid: false, message }`

### `POST /api/verify/upload`
`multipart/form-data`: `file` (PDF). Hashes the file and matches against issued
transcripts. Same result shape, plus `computedHash`.

### `GET /api/verify/:transcriptId/document`
Streams the QR-stamped PDF for public viewing (`application/pdf`).

---

## cURL quickstart

```bash
# 1. Bootstrap an admin
curl -s -X POST localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vc.io","password":"adminpass1","role":"admin"}'

# 2. Create + approve an institution (use the admin accessToken)
curl -s -X POST localhost:5000/api/institutions/register \
  -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"name":"Alpha University","email":"reg@alpha.edu","institutionCode":"ALPHA","approve":true}'

# 3. Verify a transcript (public)
curl -s localhost:5000/api/verify/<transcriptId>
```
