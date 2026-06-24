const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys TranscriptRegistry and writes { address, abi } to server/contract.json
 * so the relayer can connect with zero manual configuration.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const Registry = await hre.ethers.getContractFactory("TranscriptRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`✓ TranscriptRegistry deployed at: ${address}`);

  const artifact = await hre.artifacts.readArtifact("TranscriptRegistry");
  const out = { address, abi: artifact.abi, network: hre.network.name };

  const serverDir = path.resolve(__dirname, "../../server");
  fs.mkdirSync(serverDir, { recursive: true });
  const outPath = path.join(serverDir, "contract.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✓ Wrote address + ABI to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
