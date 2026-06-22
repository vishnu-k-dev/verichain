import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import request from "supertest";

const verifyTranscriptMock = jest.fn();

jest.unstable_mockModule("../src/services/blockchain.service.js", () => ({
  isConfigured: () => true,
  addressForIndex: (i) => "0x" + i.toString(16).padStart(40, "0"),
  isInstitutionRegistered: jest.fn().mockResolvedValue(true),
  registerInstitution: jest.fn(),
  registerStudent: jest.fn(),
  addTranscript: jest.fn(),
  revokeTranscript: jest.fn(),
  verifyTranscript: verifyTranscriptMock,
  getNetworkInfo: jest.fn().mockResolvedValue({ configured: true }),
}));

jest.unstable_mockModule("../src/services/ipfs.service.js", () => ({
  ipfsMode: "mock",
  uploadFile: jest.fn(),
  getFileUrl: (cid) => `http://ipfs.local/${cid}`,
  fetchFile: jest.fn(),
}));

let app;
let Transcript, Student, Institution;

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();
  ({ Transcript } = await import("../src/models/Transcript.js"));
  ({ Student } = await import("../src/models/Student.js"));
  ({ Institution } = await import("../src/models/Institution.js"));
});

async function seedTranscript(overrides = {}) {
  await Institution.create({
    institutionId: "inst-1",
    name: "Alpha University",
    email: "a@alpha.edu",
    institutionCode: "ALPHA",
    walletIndex: 1,
    isApproved: true,
    onChain: true,
  });
  await Student.create({
    studentId: "stu-1",
    name: "Ada Lovelace",
    email: "ada@alpha.edu",
    institutionId: "inst-1",
  });
  return Transcript.create({
    transcriptId: "txr-1",
    studentId: "stu-1",
    institutionId: "inst-1",
    ipfsHash: "QmCid",
    ipfsCid: "QmCid",
    sha256Hash: "a".repeat(64),
    transactionHash: "0xabc",
    blockNumber: 7,
    ...overrides,
  });
}

describe("GET /api/verify/:transcriptId (public)", () => {
  beforeEach(() => verifyTranscriptMock.mockReset());

  it("returns VALID for an authentic transcript", async () => {
    await seedTranscript();
    verifyTranscriptMock.mockResolvedValue({
      isValid: true,
      isRevoked: false,
      issuedAt: 1700000000,
      institutionId: "inst-1",
    });

    const res = await request(app).get("/api/verify/txr-1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("VALID");
    expect(res.body.isValid).toBe(true);
    expect(res.body.studentName).toBe("Ada Lovelace");
    expect(res.body.institutionName).toBe("Alpha University");
    expect(res.body.verifiedVia).toBe("blockchain");
  });

  it("returns REVOKED for a revoked transcript", async () => {
    await seedTranscript({ isRevoked: true });
    verifyTranscriptMock.mockResolvedValue({
      isValid: false,
      isRevoked: true,
      issuedAt: 1700000000,
      institutionId: "inst-1",
    });

    const res = await request(app).get("/api/verify/txr-1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REVOKED");
    expect(res.body.isRevoked).toBe(true);
  });

  it("returns NOT_FOUND for an unknown transcript id", async () => {
    const res = await request(app).get("/api/verify/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.status).toBe("NOT_FOUND");
    expect(res.body.isValid).toBe(false);
  });

  it("does not require authentication", async () => {
    await seedTranscript();
    verifyTranscriptMock.mockResolvedValue({
      isValid: true,
      isRevoked: false,
      issuedAt: 1700000000,
      institutionId: "inst-1",
    });
    // No Authorization header at all.
    const res = await request(app).get("/api/verify/txr-1");
    expect(res.status).toBe(200);
  });
});
