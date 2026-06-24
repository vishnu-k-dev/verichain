require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // In-process chain for tests.
    hardhat: { chainId: 31337 },
    // The `npx hardhat node` chain that the app talks to.
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    // Optional public testnet (set SEPOLIA_RPC_URL + PRIVATE_KEY in .env).
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};
