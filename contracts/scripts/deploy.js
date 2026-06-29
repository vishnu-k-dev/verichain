const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys TranscriptRegistry and writes { address, abi, chainId } to
 * client/public/contract.json so the React dApp can connect with zero config.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account (owner/issuer): ${deployer.address}`);

  const Registry = await hre.ethers.getContractFactory("TranscriptRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const net = await hre.ethers.provider.getNetwork();
  console.log(`✓ TranscriptRegistry deployed at: ${address}`);

  const artifact = await hre.artifacts.readArtifact("TranscriptRegistry");
  const out = {
    address,
    chainId: Number(net.chainId),
    network: hre.network.name,
    owner: deployer.address,
    abi: artifact.abi,
  };

  const publicDir = path.resolve(__dirname, "../../client/public");
  fs.mkdirSync(publicDir, { recursive: true });
  const outPath = path.join(publicDir, "contract.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✓ Wrote address + ABI to ${outPath}`);
  console.log(`\nIssuer account to import into MetaMask: ${deployer.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
