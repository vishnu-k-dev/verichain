const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AcademicTranscriptContract", function () {
  // Stable identifiers reused across tests.
  const INST_A = "inst-aaa";
  const INST_B = "inst-bbb";
  const STUDENT_1 = "stu-001";
  const TRANSCRIPT_1 = "txr-001";
  const IPFS_HASH = "bafybeigdyrexamplecidvalue1234567890";
  const SHA = "a".repeat(64);
  const WRONG_SHA = "b".repeat(64);

  async function deployFixture() {
    const [owner, instAWallet, instBWallet, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AcademicTranscriptContract");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, instAWallet, instBWallet, outsider };
  }

  // Deploy + register two institutions and one student under institution A.
  async function seededFixture() {
    const base = await deployFixture();
    const { contract, owner, instAWallet, instBWallet } = base;

    await contract
      .connect(owner)
      .registerInstitution(INST_A, "Alpha University", instAWallet.address);
    await contract
      .connect(owner)
      .registerInstitution(INST_B, "Beta Institute", instBWallet.address);

    await contract
      .connect(instAWallet)
      .registerStudent(STUDENT_1, "Ada Lovelace", "ada@alpha.edu", INST_A);

    return base;
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Institution registration", function () {
    it("registers an institution and emits an event", async function () {
      const { contract, owner, instAWallet } = await loadFixture(deployFixture);

      await expect(
        contract.connect(owner).registerInstitution(INST_A, "Alpha University", instAWallet.address)
      )
        .to.emit(contract, "InstitutionRegistered")
        .withArgs(INST_A, instAWallet.address, anyUint());

      expect(await contract.isInstitutionRegistered(instAWallet.address)).to.equal(true);

      const stored = await contract.institutions(INST_A);
      expect(stored.name).to.equal("Alpha University");
      expect(stored.isActive).to.equal(true);
    });

    it("rejects a non-owner caller", async function () {
      const { contract, instAWallet } = await loadFixture(deployFixture);
      await expect(
        contract.connect(instAWallet).registerInstitution(INST_A, "X", instAWallet.address)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("rejects duplicate institutionId", async function () {
      const { contract, owner, instAWallet, instBWallet } = await loadFixture(deployFixture);
      await contract.connect(owner).registerInstitution(INST_A, "A", instAWallet.address);
      await expect(
        contract.connect(owner).registerInstitution(INST_A, "A2", instBWallet.address)
      ).to.be.revertedWithCustomError(contract, "AlreadyExists");
    });

    it("rejects a wallet already bound to an institution", async function () {
      const { contract, owner, instAWallet } = await loadFixture(deployFixture);
      await contract.connect(owner).registerInstitution(INST_A, "A", instAWallet.address);
      await expect(
        contract.connect(owner).registerInstitution(INST_B, "B", instAWallet.address)
      ).to.be.revertedWithCustomError(contract, "AlreadyExists");
    });

    it("rejects empty id or zero address", async function () {
      const { contract, owner, instAWallet } = await loadFixture(deployFixture);
      await expect(
        contract.connect(owner).registerInstitution("", "A", instAWallet.address)
      ).to.be.revertedWithCustomError(contract, "InvalidInput");
      await expect(
        contract.connect(owner).registerInstitution(INST_A, "A", ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "InvalidInput");
    });
  });

  describe("Student registration", function () {
    it("registers a student under the caller's institution", async function () {
      const { contract, owner, instAWallet } = await loadFixture(deployFixture);
      await contract.connect(owner).registerInstitution(INST_A, "A", instAWallet.address);

      await expect(
        contract.connect(instAWallet).registerStudent(STUDENT_1, "Ada", "ada@a.edu", INST_A)
      )
        .to.emit(contract, "StudentRegistered")
        .withArgs(STUDENT_1, INST_A, anyUint());

      const stored = await contract.students(STUDENT_1);
      expect(stored.name).to.equal("Ada");
      expect(stored.institutionId).to.equal(INST_A);
    });

    it("rejects an unauthorized (non-institution) caller", async function () {
      const { contract, outsider } = await loadFixture(seededFixture);
      await expect(
        contract.connect(outsider).registerStudent("stu-x", "X", "x@x.edu", INST_A)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("prevents one institution registering a student under another", async function () {
      const { contract, instBWallet } = await loadFixture(seededFixture);
      // instB tries to register a student claiming institution A.
      await expect(
        contract.connect(instBWallet).registerStudent("stu-x", "X", "x@x.edu", INST_A)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("rejects duplicate studentId", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await expect(
        contract.connect(instAWallet).registerStudent(STUDENT_1, "Dup", "d@a.edu", INST_A)
      ).to.be.revertedWithCustomError(contract, "AlreadyExists");
    });
  });

  describe("Transcript issuance", function () {
    it("stores the transcript and emits an event", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);

      await expect(
        contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA)
      )
        .to.emit(contract, "TranscriptIssued")
        .withArgs(TRANSCRIPT_1, STUDENT_1, SHA, anyUint());

      const t = await contract.getTranscriptById(TRANSCRIPT_1);
      expect(t.sha256Hash).to.equal(SHA);
      expect(t.ipfsHash).to.equal(IPFS_HASH);
      expect(t.institutionId).to.equal(INST_A);
      expect(t.isRevoked).to.equal(false);

      const list = await contract.getStudentTranscripts(STUDENT_1);
      expect(list).to.deep.equal([TRANSCRIPT_1]);
    });

    it("rejects issuance by a non-owning institution", async function () {
      const { contract, instBWallet } = await loadFixture(seededFixture);
      await expect(
        contract.connect(instBWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("rejects issuance for an unknown student", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await expect(
        contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, "ghost", IPFS_HASH, SHA)
      ).to.be.revertedWithCustomError(contract, "NotFound");
    });

    it("rejects duplicate transcriptId", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);
      await expect(
        contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA)
      ).to.be.revertedWithCustomError(contract, "AlreadyExists");
    });

    it("rejects empty hashes", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await expect(
        contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, "")
      ).to.be.revertedWithCustomError(contract, "InvalidInput");
    });
  });

  describe("Transcript verification", function () {
    it("returns valid=true for a matching hash", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);

      const [isValid, isRevoked, issuedAt, institutionId] = await contract.verifyTranscript(
        TRANSCRIPT_1,
        SHA
      );
      expect(isValid).to.equal(true);
      expect(isRevoked).to.equal(false);
      expect(issuedAt).to.be.greaterThan(0n);
      expect(institutionId).to.equal(INST_A);
    });

    it("returns valid=false for a wrong hash", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);

      const [isValid] = await contract.verifyTranscript(TRANSCRIPT_1, WRONG_SHA);
      expect(isValid).to.equal(false);
    });

    it("returns all-zero result for unknown transcript", async function () {
      const { contract } = await loadFixture(seededFixture);
      const [isValid, isRevoked, issuedAt, institutionId] = await contract.verifyTranscript(
        "does-not-exist",
        SHA
      );
      expect(isValid).to.equal(false);
      expect(isRevoked).to.equal(false);
      expect(issuedAt).to.equal(0n);
      expect(institutionId).to.equal("");
    });
  });

  describe("Transcript revocation", function () {
    it("sets the revoked flag and verification reflects it", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);

      await expect(contract.connect(instAWallet).revokeTranscript(TRANSCRIPT_1))
        .to.emit(contract, "TranscriptRevoked")
        .withArgs(TRANSCRIPT_1, anyUint());

      const [isValid, isRevoked] = await contract.verifyTranscript(TRANSCRIPT_1, SHA);
      expect(isValid).to.equal(false);
      expect(isRevoked).to.equal(true);
    });

    it("rejects revocation by a non-owning institution", async function () {
      const { contract, instAWallet, instBWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);
      await expect(
        contract.connect(instBWallet).revokeTranscript(TRANSCRIPT_1)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("rejects double revocation", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await contract.connect(instAWallet).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA);
      await contract.connect(instAWallet).revokeTranscript(TRANSCRIPT_1);
      await expect(
        contract.connect(instAWallet).revokeTranscript(TRANSCRIPT_1)
      ).to.be.revertedWithCustomError(contract, "Revoked");
    });

    it("rejects revoking an unknown transcript", async function () {
      const { contract, instAWallet } = await loadFixture(seededFixture);
      await expect(
        contract.connect(instAWallet).revokeTranscript("nope")
      ).to.be.revertedWithCustomError(contract, "NotFound");
    });
  });

  describe("Access control (restricted functions)", function () {
    it("an outsider wallet cannot register students or issue transcripts", async function () {
      const { contract, outsider } = await loadFixture(seededFixture);
      await expect(
        contract.connect(outsider).registerStudent("s", "n", "e", INST_A)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
      await expect(
        contract.connect(outsider).addTranscript(TRANSCRIPT_1, STUDENT_1, IPFS_HASH, SHA)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
      await expect(
        contract.connect(outsider).revokeTranscript(TRANSCRIPT_1)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("getTranscriptById reverts for unknown id", async function () {
      const { contract } = await loadFixture(seededFixture);
      await expect(
        contract.getTranscriptById("missing")
      ).to.be.revertedWithCustomError(contract, "NotFound");
    });
  });
});

// Helper: matches any uint timestamp in event args.
function anyUint() {
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyValue;
}
