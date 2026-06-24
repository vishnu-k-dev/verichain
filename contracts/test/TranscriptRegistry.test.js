const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TranscriptRegistry", function () {
  const ID = "VC-ABC123";
  const HASH = "0x" + "a".repeat(64);

  async function deploy() {
    const [owner, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("TranscriptRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, other };
  }

  it("sets the deployer as owner", async function () {
    const { registry, owner } = await loadFixture(deploy);
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("issues a transcript and emits an event", async function () {
    const { registry } = await loadFixture(deploy);
    await expect(registry.issue(ID, "Ada Lovelace", "R-01", "BSc CS", "First Class", HASH))
      .to.emit(registry, "TranscriptIssued");

    const t = await registry.get(ID);
    expect(t.studentName).to.equal("Ada Lovelace");
    expect(t.grade).to.equal("First Class");
    expect(t.revoked).to.equal(false);
    expect(await registry.total()).to.equal(1n);
  });

  it("verifies a transcript by file hash", async function () {
    const { registry } = await loadFixture(deploy);
    await registry.issue(ID, "Ada", "R-01", "BSc", "8.7", HASH);

    const [found, t] = await registry.verifyByHash(HASH);
    expect(found).to.equal(true);
    expect(t.id).to.equal(ID);

    const [missing] = await registry.verifyByHash("0x" + "b".repeat(64));
    expect(missing).to.equal(false);
  });

  it("rejects duplicate ids", async function () {
    const { registry } = await loadFixture(deploy);
    await registry.issue(ID, "Ada", "R-01", "BSc", "8.7", HASH);
    await expect(
      registry.issue(ID, "Ada", "R-01", "BSc", "8.7", HASH)
    ).to.be.revertedWithCustomError(registry, "AlreadyExists");
  });

  it("only the owner can issue", async function () {
    const { registry, other } = await loadFixture(deploy);
    await expect(
      registry.connect(other).issue(ID, "X", "R", "C", "G", HASH)
    ).to.be.revertedWithCustomError(registry, "NotOwner");
  });

  it("revokes a transcript", async function () {
    const { registry } = await loadFixture(deploy);
    await registry.issue(ID, "Ada", "R-01", "BSc", "8.7", HASH);
    await expect(registry.revoke(ID)).to.emit(registry, "TranscriptRevoked");

    const t = await registry.get(ID);
    expect(t.revoked).to.equal(true);

    await expect(registry.revoke(ID)).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
  });

  it("reverts when getting a missing transcript", async function () {
    const { registry } = await loadFixture(deploy);
    await expect(registry.get("nope")).to.be.revertedWithCustomError(registry, "DoesNotExist");
  });

  it("lists issued transcripts", async function () {
    const { registry } = await loadFixture(deploy);
    await registry.issue("A", "S1", "R1", "C", "G", ethers.ZeroHash);
    await registry.issue("B", "S2", "R2", "C", "G", ethers.ZeroHash);
    const page = await registry.list(0, 10);
    expect(page.length).to.equal(2);
    expect(page[0].id).to.equal("A");
    expect(page[1].id).to.equal("B");
  });
});
