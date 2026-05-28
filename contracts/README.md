# WardrobeForge Crate Contract Notes

This folder now contains a Solidity scaffold for the crate purchase model we discussed.

## Compile

Run:

```bash
npm run compile:contracts
```

Hardhat writes artifacts to `artifacts/hardhat` and cache files to `cache/hardhat`.

## Test

Run:

```bash
npm run test:contracts
```

## Deploy

An Ignition deployment module is available at:

- [ignition/modules/WardrobeForgeCrates1155.js](/Users/kalikelaux/Desktop/wardrobeforge/ignition/modules/WardrobeForgeCrates1155.js)

Example:

```bash
npx hardhat ignition deploy ignition/modules/WardrobeForgeCrates1155.js
```

You will need to provide module parameters for:

- `initialOwner`
- `initialTreasury`
- `baseMetadataURI` (optional, defaults to `ipfs://wardrobeforge/`)

### Polygon

Add these environment variables before deploying:

```bash
export POLYGON_RPC_URL="https://your-polygon-rpc"
export POLYGON_PRIVATE_KEY="0xyourprivatekey"
```

Create a parameter file from:

- [ignition/parameters/polygon-crates.example.json](/Users/kalikelaux/Desktop/wardrobeforge/ignition/parameters/polygon-crates.example.json)

Then deploy with:

```bash
npx hardhat ignition deploy ignition/modules/WardrobeForgeCrates1155.js --network polygon --parameters ignition/parameters/polygon-crates.example.json
```

Or with the npm script:

```bash
npm run deploy:contracts:polygon -- --parameters ignition/parameters/polygon-crates.example.json
```

## Seed

A sample seed file is available at:

- [contracts/config/sample-crate-seed.json](/Users/kalikelaux/Desktop/wardrobeforge/contracts/config/sample-crate-seed.json)

Use the seeding script after deployment:

```bash
CONTRACT_ADDRESS=0xYourContractAddress npm run seed:contracts
```

Optional:

```bash
CONTRACT_ADDRESS=0xYourContractAddress CRATE_SEED_CONFIG=./path/to/your-config.json npm run seed:contracts
```

For the local Hardhat node specifically, use:

```bash
CONTRACT_ADDRESS=0xYourContractAddress npm run seed:contracts:local
```

For Polygon, use:

```bash
CONTRACT_ADDRESS=0xYourContractAddress npm run seed:contracts:polygon
```

## Core model

- Users buy crates directly.
- The contract opens those crates immediately.
- The contract mints wearable item NFTs.
- `crateId` is the paid product / loot table selector.
- `tokenId` is the wearable item the user actually owns onchain.

That means:

- `buyCrates(recipient, crateId, quantity)` is the checkout function.
- The NFT token IDs should represent outfits, boots, heads, and items.
- Crates are not minted as their own NFTs in this version.

## Recommended IDs

Use simple numeric IDs first:

- Crates:
  - `1` = `crate-sunflare`
  - `2` = `crate-nebula`
  - `3` = `crate-verdant`
  - `4` = `crate-aurora`

- Item token IDs:
  - `100001+` outfits
  - `200001+` boots
  - `300001+` heads
  - `400001+` accessories / handheld items

This keeps the contract logic simple while making token classes easy to reason about offchain.

## Why ERC-1155

ERC-1155 is the best fit here because:

- multiple buyers can receive the same wearable token ID
- batch-style crate purchases are cheaper than minting many ERC-721s
- your UI already thinks in terms of item types more than one-off art contracts

If later you want every item instance to be fully unique, we can revisit ERC-721 or hybridize the design.

## App checkout shape

The app flow is:

1. map the selected crate UI to a numeric `crateId`
2. map the slider to `quantity`
3. calculate the required POL amount
4. ABI-encode `buyCrates(recipient, crateId, quantity)`
5. submit the transaction from the buyer wallet on Polygon
6. decode the `CrateOpened` events after confirmation

## Production TODOs

- Replace placeholder randomness with VRF or a trusted reveal architecture.
- Add a Solidity toolchain to the repo.
- Add tests for pricing, reward tables, and mint outputs.
- Decide whether treasury payout should be immediate or pull-based.
- Decide whether item metadata will be frozen or upgradeable.
- Decide whether crate odds need to be exposed in-app or onchain.
