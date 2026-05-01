import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

const polygonRpcUrl = process.env.POLYGON_RPC_URL;
const polygonPrivateKey = process.env.POLYGON_PRIVATE_KEY;

/** @type {import("hardhat/config").HardhatUserConfig} */
const config = defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./cache/hardhat",
    artifacts: "./artifacts/hardhat",
  },
  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    ...(polygonRpcUrl && polygonPrivateKey
      ? {
          polygon: {
            type: "http",
            chainType: "l1",
            url: polygonRpcUrl,
            accounts: [polygonPrivateKey],
          },
        }
      : {}),
  },
});

export default config;
