import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import request from "supertest";
import { PDFDocument } from "pdf-lib";

// --- Mock external side-effects BEFORE importing the app ---
jest.unstable_mockModule("../src/services/blockchain.service.js", () => ({
  isConfigured: () => true,
  addressForIndex: (i) => "0x" + i.toString(16).padStart(40, "0"),
  isInstitutionRegistered: jest.fn().mockResolvedValue(false),
  registerInstitution: jest.fn().mockResolvedValue({ txHash: "0xinst", blockNumber: 1 }),
  registerStudent: jest.fn().mockResolvedValue({ txHash: "0xstu", blockNumber: 2 }),
  addTranscript: jest.fn().mockResolvedValue({ txHash: "0xtxr", blockNumber: 3 }),
  revokeTranscript: jest.fn().mockResolvedValue({ txHash: "0xrev", blockNumber: 4 }),
  verifyTranscript: jest.fn(),
  getNetworkInfo: jest.fn().mockResolvedValue({ configured: true, network: "mock" }),
}));

jest.unstable_mockModule("../src/services/ipfs.service.js", () => ({
  ipfsMode: "mock",
  uploadFile: jest.fn().mockResolvedValue({ cid: "QmTestCid", url: "http://ipfs.local/QmTestCid" }),
  getFileUrl: (cid) => `http://ipfs.local/${cid}`,
  fetchFile: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 stamped")),
}));

let app;
let pdfBuffer;

async function makePdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText("Official Transcript", { x: 50, y: 700, size: 24 });
  return Buffer.from(await doc.save());
}

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();
  pdfBuffer = await makePdf();
});

/** Walk the full setup and return an institution access token + studentId. */
async function setupInstitutionAndStudent() {
  // 1. Self-register institution (creates org + login).
  const inst = await request(app).post("/api/auth/register").send({
    email: "registrar@alpha.edu",
    password: "instpassword1",
    role: "institution",
    name: "Alpha University",
    institutionCode: "ALPHA",
  });
  const instToken = inst.body.accessToken;
  const institutionId = inst.body.user.linkedId;

  // 2. Bootstrap admin + approve the institution.
  const admin = await request(app).post("/api/auth/register").send({
    email: "admin@system.io",
    password: "adminpassword1",
    role: "admin",
  });
  await request(app)
    .patch(`/api/institutions/${institutionId}/approve`)
    .set("Authorization", `Bearer ${admin.body.accessToken}`)
    .expect(200);

  // 3. Institution registers a student.
  const student = await request(app)
    .post("/api/students/register")
    .set("Authorization", `Bearer ${instToken}`)
    .send({ name: "Ada Lovelace", email: "ada@alpha.edu" });

  return { instToken, institutionId, studentId: student.body.student.studentId };
}

describe("Transcript issuance", () => {
  it("issues a transcript through the full pipeline", async () => {
    const { instToken, studentId } = await setupInstitutionAndStudent();

    const res = await request(app)
      .post("/api/transcripts/issue")
      .set("Authorization", `Bearer ${instToken}`)
      .field("studentId", studentId)
      .attach("file", pdfBuffer, { filename: "transcript.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.onChain).toBe(true);
    expect(res.body.transcript.transcriptId).toBeTruthy();
    expect(res.body.transcript.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.transcript.transactionHash).toBe("0xtxr");
    expect(res.body.transcript.ipfsCid).toBe("QmTestCid");
    expect(res.body.verifyUrl).toContain("/verify/");
  });

  it("rejects a non-PDF upload", async () => {
    const { instToken, studentId } = await setupInstitutionAndStudent();
    const res = await request(app)
      .post("/api/transcripts/issue")
      .set("Authorization", `Bearer ${instToken}`)
      .field("studentId", studentId)
      .attach("file", Buffer.from("not a pdf"), {
        filename: "x.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_FILE_TYPE");
  });

  it("forbids a student from issuing", async () => {
    const res = await request(app)
      .post("/api/transcripts/issue")
      .set("Authorization", "Bearer not-a-real-token")
      .field("studentId", "x");
    expect(res.status).toBe(401);
  });
});
