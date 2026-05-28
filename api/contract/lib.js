import { createPublicClient, decodeEventLog, encodeFunctionData, http } from 'viem';
import { polygon } from 'viem/chains';

export const DEFAULT_CONTRACT_ADDRESS = '0xB81B221d3379F21C17A6f70625d1F22a45399DAf';

export const CRATE_ID_BY_KEY = {
  'crate-sunflare': 1,
  'crate-nebula': 2,
  'crate-verdant': 3,
  'crate-aurora': 4,
};

export const BUY_CRATES_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'crateId', type: 'uint256' },
      { internalType: 'uint256', name: 'quantity', type: 'uint256' },
    ],
    name: 'buyCrates',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'crateId', type: 'uint256' },
      { internalType: 'uint256', name: 'quantity', type: 'uint256' },
    ],
    name: 'quoteCratePurchase',
    outputs: [
      { internalType: 'uint256', name: 'totalPriceWei', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'payerAllowlistEnabled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'crateId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'rollNumber', type: 'uint256' },
    ],
    name: 'CrateOpened',
    type: 'event',
  },
];

export const trimValue = (value) => String(value || '').trim();

export const getPolygonRpcUrl = () => {
  const configuredRpcUrl = trimValue(process.env.POLYGON_RPC_URL);
  if (!configuredRpcUrl) {
    throw new Error('Contract checkout is not configured yet. Add POLYGON_RPC_URL on the server.');
  }

  return configuredRpcUrl;
};

export const getContractAddress = () => trimValue(process.env.WF_CRATE_CONTRACT_ADDRESS) || DEFAULT_CONTRACT_ADDRESS;

export const getPublicClient = () => createPublicClient({
  chain: polygon,
  transport: http(getPolygonRpcUrl()),
});

export const parseCheckoutRequest = (body = {}) => {
  const crateKey = trimValue(body.crateKey);
  const recipientWallet = trimValue(body.recipientWallet);
  const quantity = Number(body.quantity);
  const crateId = CRATE_ID_BY_KEY[crateKey];

  if (!crateId) {
    throw new Error('Unknown crate selection.');
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
    throw new Error('Enter a valid Polygon wallet address.');
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('Choose between 1 and 10 crates.');
  }

  return {
    crateId,
    crateKey,
    quantity,
    recipientWallet,
  };
};

export const preparePurchasePayload = async ({ crateId, quantity, recipientWallet }) => {
  const publicClient = getPublicClient();
  const contractAddress = getContractAddress();
  const payerAllowlistEnabled = await publicClient.readContract({
    address: contractAddress,
    abi: BUY_CRATES_ABI,
    functionName: 'payerAllowlistEnabled',
  });
  if (payerAllowlistEnabled) {
    throw new Error('Direct wallet minting is blocked because the deployed contract payer allowlist is still enabled.');
  }

  const totalPriceWei = await publicClient.readContract({
    address: contractAddress,
    abi: BUY_CRATES_ABI,
    functionName: 'quoteCratePurchase',
    args: [BigInt(crateId), BigInt(quantity)],
  });

  const data = encodeFunctionData({
    abi: BUY_CRATES_ABI,
    functionName: 'buyCrates',
    args: [recipientWallet, BigInt(crateId), BigInt(quantity)],
  });

  return {
    contractAddress,
    totalPriceWei,
    data,
  };
};

export const parseMintedRewardsFromReceipt = ({ receipt, recipientWallet, crateId, contractAddress }) => {
  const normalizedRecipient = recipientWallet.toLowerCase();
  const expectedContractAddress = contractAddress.toLowerCase();
  const expectedCrateId = BigInt(crateId);

  return receipt.logs
    .filter((log) => String(log.address || '').toLowerCase() === expectedContractAddress)
    .map((log) => {
      try {
        return decodeEventLog({
          abi: BUY_CRATES_ABI,
          data: log.data,
          topics: log.topics,
        });
      } catch (error) {
        return null;
      }
    })
    .filter((event) => event?.eventName === 'CrateOpened')
    .filter((event) => String(event.args.recipient || '').toLowerCase() === normalizedRecipient)
    .filter((event) => BigInt(event.args.crateId) === expectedCrateId)
    .map((event) => ({
      tokenId: event.args.tokenId.toString(),
      rollNumber: Number(event.args.rollNumber),
    }))
    .sort((left, right) => left.rollNumber - right.rollNumber);
};
