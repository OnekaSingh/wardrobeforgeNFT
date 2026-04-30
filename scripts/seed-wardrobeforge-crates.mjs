import fs from "node:fs/promises";
import path from "node:path";

import { network } from "hardhat";

const DEFAULT_CONFIG_PATH = "./contracts/config/sample-crate-seed.json";

function toBigInt(value, label) {
  try {
    return BigInt(value);
  } catch (error) {
    throw new Error(`Invalid bigint for ${label}: ${value}`);
  }
}

async function loadSeedConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  const raw = await fs.readFile(resolvedPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.itemTokens)) {
    throw new Error("Seed config must include an itemTokens array.");
  }

  if (!Array.isArray(parsed.crates)) {
    throw new Error("Seed config must include a crates array.");
  }

  return parsed;
}

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Missing CONTRACT_ADDRESS environment variable.");
  }

  const configPath = process.env.CRATE_SEED_CONFIG || DEFAULT_CONFIG_PATH;
  const config = await loadSeedConfig(configPath);

  const { viem } = await network.create();
  const [deployer] = await viem.getWalletClients();
  const contract = await viem.getContractAt("WardrobeForgeCrates1155", contractAddress);

  console.log(`Seeding contract ${contractAddress}`);
  console.log(`Using config ${path.resolve(configPath)}`);

  if (typeof config.baseMetadataURI === "string" && config.baseMetadataURI.length > 0) {
    console.log(`- setting base metadata URI to ${config.baseMetadataURI}`);
    await contract.write.setBaseMetadataURI([config.baseMetadataURI], {
      account: deployer.account,
    });
  }

  if (typeof config.payerAllowlistEnabled === "boolean") {
    console.log(`- setting payer allowlist mode to ${config.payerAllowlistEnabled}`);
    await contract.write.setPayerAllowlistEnabled([config.payerAllowlistEnabled], {
      account: deployer.account,
    });
  }

  for (const payer of config.approvedPayers || []) {
    console.log(`- approving payer ${payer}`);
    await contract.write.setApprovedPayer([payer, true], {
      account: deployer.account,
    });
  }

  for (const tokenId of config.itemTokens) {
    const parsedTokenId = toBigInt(tokenId, "itemTokens");
    console.log(`- enabling item token ${parsedTokenId}`);
    await contract.write.setItemTokenEnabled([parsedTokenId, true], {
      account: deployer.account,
    });
  }

  for (const crate of config.crates) {
    const crateId = toBigInt(crate.crateId, "crateId");
    const priceWei = toBigInt(crate.priceWei, `crate ${crateId} priceWei`);
    const maxQuantityPerTx = Number(crate.maxQuantityPerTx);

    console.log(`- configuring crate ${crateId} with price ${priceWei} wei`);
    await contract.write.configureCrate(
      [crateId, priceWei, maxQuantityPerTx, Boolean(crate.active)],
      { account: deployer.account },
    );

    const rewards = (crate.rewards || []).map((reward, index) => ({
      tokenId: toBigInt(reward.tokenId, `crate ${crateId} reward ${index} tokenId`),
      weight: Number(reward.weight),
      active: Boolean(reward.active),
    }));

    console.log(`- replacing reward table for crate ${crateId} with ${rewards.length} entries`);
    await contract.write.replaceCrateRewards([crateId, rewards], {
      account: deployer.account,
    });
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
