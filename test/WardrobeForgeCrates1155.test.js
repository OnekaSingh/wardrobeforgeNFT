import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

const BASE_URI = "ipfs://wardrobeforge/";
const CRATE_ID = 1n;
const ITEM_TOKEN_ID = 100001n;
const CRATE_PRICE = parseEther("0.001");

async function deployFixture() {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [owner, treasury, approvedPayer, recipient, outsider] = await viem.getWalletClients();

  const contract = await viem.deployContract("WardrobeForgeCrates1155", [
    owner.account.address,
    treasury.account.address,
    BASE_URI,
  ]);

  await contract.write.setItemTokenEnabled([ITEM_TOKEN_ID, true], {
    account: owner.account,
  });
  await contract.write.configureCrate([CRATE_ID, CRATE_PRICE, 10, true], {
    account: owner.account,
  });
  await contract.write.replaceCrateRewards(
    [
      CRATE_ID,
      [
        {
          tokenId: ITEM_TOKEN_ID,
          weight: 100,
          active: true,
        },
      ],
    ],
    {
      account: owner.account,
    },
  );

  return {
    viem,
    publicClient,
    contract,
    owner,
    treasury,
    approvedPayer,
    recipient,
    outsider,
  };
}

describe("WardrobeForgeCrates1155", async function () {
  it("mints wearable item token IDs when a crate purchase succeeds", async function () {
    const { viem, publicClient, contract, approvedPayer, recipient, treasury } =
      await deployFixture();

    const treasuryBalanceBefore = await publicClient.getBalance({
      address: treasury.account.address,
    });

    await viem.assertions.emitWithArgs(
      contract.write.buyCrates([recipient.account.address, CRATE_ID, 2n], {
        account: approvedPayer.account,
        value: CRATE_PRICE * 2n,
      }),
      contract,
      "CratePurchased",
      [
        getAddress(approvedPayer.account.address),
        getAddress(recipient.account.address),
        CRATE_ID,
        2n,
        CRATE_PRICE * 2n,
      ],
    );

    const recipientBalance = await contract.read.balanceOf([
      recipient.account.address,
      ITEM_TOKEN_ID,
    ]);
    const treasuryBalanceAfter = await publicClient.getBalance({
      address: treasury.account.address,
    });

    assert.equal(recipientBalance, 2n);
    assert.equal(treasuryBalanceAfter - treasuryBalanceBefore, CRATE_PRICE * 2n);
  });

  it("reverts when the payer sends the wrong amount", async function () {
    const { viem, contract, approvedPayer, recipient } = await deployFixture();

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.write.buyCrates([recipient.account.address, CRATE_ID, 2n], {
        account: approvedPayer.account,
        value: CRATE_PRICE,
      }),
      contract,
      "IncorrectPayment",
      [CRATE_PRICE * 2n, CRATE_PRICE],
    );
  });

  it("reverts when the payer is not allowlisted while payer restrictions are enabled", async function () {
    const { viem, contract, owner, recipient, outsider } = await deployFixture();

    await contract.write.setPayerAllowlistEnabled([true], {
      account: owner.account,
    });

    await viem.assertions.revertWithCustomErrorWithArgs(
      contract.write.buyCrates([recipient.account.address, CRATE_ID, 1n], {
        account: outsider.account,
        value: CRATE_PRICE,
      }),
      contract,
      "UnauthorizedPayer",
      [getAddress(outsider.account.address)],
    );
  });

  it("allows an approved payer when payer restrictions are enabled", async function () {
    const { contract, owner, approvedPayer, recipient } = await deployFixture();

    await contract.write.setPayerAllowlistEnabled([true], {
      account: owner.account,
    });
    await contract.write.setApprovedPayer([approvedPayer.account.address, true], {
      account: owner.account,
    });

    await contract.write.buyCrates([recipient.account.address, CRATE_ID, 1n], {
      account: approvedPayer.account,
      value: CRATE_PRICE,
    });

    const recipientBalance = await contract.read.balanceOf([
      recipient.account.address,
      ITEM_TOKEN_ID,
    ]);

    assert.equal(recipientBalance, 1n);
  });

  it("reverts when the requested quantity exceeds the crate transaction limit", async function () {
    const { viem, contract, approvedPayer, recipient } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      contract.write.buyCrates([recipient.account.address, CRATE_ID, 11n], {
        account: approvedPayer.account,
        value: CRATE_PRICE * 11n,
      }),
      contract,
      "InvalidQuantity",
    );
  });
});
