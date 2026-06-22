const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/**
 * Deploys AcademicTranscriptContract and writes the address + ABI to
 * backend/src/config/contract.json so the backend can wire up ethers without
 * any manual copy/paste. Works on any network via `--network <name>`.
 */
async function main() {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================");
  console.log(`Deploying to network : ${network}`);
  console.log(`Deployer address     : ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance     : ${hre.ethers.formatEther(balance)} ETH`);
  console.log("============================================================");

  const Factory = await hre.ethers.getContractFactory("AcademicTranscriptContract");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log(`\n✓ Contract deployed at: ${address}`);
  if (deployTx) console.log(`  tx hash: ${deployTx.hash}`);

  // Pull the ABI from the compiled artifact.
  const artifact = await hre.artifacts.readArtifact("AcademicTranscriptContract");

  const output = {
    address,
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // Write to backend config (created if missing).
  const backendConfigDir = path.resolve(__dirname, "../../backend/src/config");
  fs.mkdirSync(backendConfigDir, { recursive: true });
  const backendOut = path.join(backendConfigDir, "contract.json");
  fs.writeFileSync(backendOut, JSON.stringify(output, null, 2));
  console.log(`\n✓ ABI + address written to: ${backendOut}`);

  // Also keep a copy alongside the contracts deployments for reference.
  const localDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(localDir, { recursive: true });
  const localOut = path.join(localDir, `${network}.json`);
  fs.writeFileSync(localOut, JSON.stringify(output, null, 2));
  console.log(`✓ Deployment record written to: ${localOut}`);

  console.log("\nNext steps:");
  console.log(`  • Set CONTRACT_ADDRESS=${address} in your .env`);
  console.log(`  • Set VITE_CONTRACT_ADDRESS=${address} for the frontend`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
