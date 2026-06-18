import crypto from 'node:crypto';

import { createPublicClient, createWalletClient, decodeEventLog, encodeAbiParameters, encodeFunctionData, http, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'crateId', type: 'uint256' },
      { internalType: 'uint256', name: 'quantity', type: 'uint256' },
      { internalType: 'bytes32', name: 'paymentId', type: 'bytes32' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'redeemPaidCrates',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'approvedPayers',
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

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(String(value || ''), 'base64url').toString('utf8');

const getPaymentReceiptSecret = () => {
  const configuredSecret = trimValue(process.env.WF_CRATE_PAYMENT_RECEIPT_SECRET);
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Crate checkout is not configured yet. Add WF_CRATE_PAYMENT_RECEIPT_SECRET on the server.');
  }
  return 'wardrobeforge-local-payment-receipt-secret';
};

const signPaymentReceiptPayload = (payload) => (
  crypto
    .createHmac('sha256', getPaymentReceiptSecret())
    .update(payload)
    .digest('base64url')
);

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const createPaymentId = () => `0x${crypto.randomBytes(32).toString('hex')}`;

export const createCratePaymentReceipt = ({ checkoutRequest, accountId = '', totalUsd = 0 }) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    version: 1,
    status: 'paid',
    checkoutId: crypto.randomUUID(),
    paymentId: createPaymentId(),
    accountId: trimValue(accountId),
    crateId: checkoutRequest.crateId,
    crateKey: checkoutRequest.crateKey,
    quantity: checkoutRequest.quantity,
    recipientWallet: checkoutRequest.recipientWallet,
    totalUsd: Number(totalUsd || 0),
    issuedAt: now,
    expiresAt: now + (60 * 60),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPaymentReceiptPayload(encodedPayload)}`;
};

export const verifyCratePaymentReceipt = ({ receiptToken, checkoutRequest, accountId = '' }) => {
  const [encodedPayload, signature] = String(receiptToken || '').split('.');
  if (!encodedPayload || !signature || !timingSafeEqual(signature, signPaymentReceiptPayload(encodedPayload))) {
    const error = new Error('Complete checkout before starting the Polygon mint step.');
    error.statusCode = 402;
    throw error;
  }

  let receipt;
  try {
    receipt = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (error) {
    const receiptError = new Error('Invalid checkout receipt.');
    receiptError.statusCode = 402;
    throw receiptError;
  }

  const now = Math.floor(Date.now() / 1000);
  const cleanAccountId = trimValue(accountId);
  const receiptAccountId = trimValue(receipt.accountId);
  const matchesCheckout = receipt?.status === 'paid'
    && receipt.crateId === checkoutRequest.crateId
    && receipt.crateKey === checkoutRequest.crateKey
    && Number(receipt.quantity) === checkoutRequest.quantity
    && trimValue(receipt.recipientWallet).toLowerCase() === checkoutRequest.recipientWallet.toLowerCase()
    && /^0x[a-fA-F0-9]{64}$/.test(trimValue(receipt.paymentId))
    && Number(receipt.expiresAt) > now
    && (!cleanAccountId || !receiptAccountId || cleanAccountId === receiptAccountId);

  if (!matchesCheckout) {
    const error = new Error('Checkout receipt does not match this Polygon mint request.');
    error.statusCode = 402;
    throw error;
  }

  return receipt;
};

export const requireVerifiedCratePayment = ({ body = {}, checkoutRequest }) => (
  verifyCratePaymentReceipt({
    receiptToken: body.paymentReceipt,
    checkoutRequest,
    accountId: body.accountId || body.userId,
  })
);

export const createPaidMintAuthorization = async ({ checkoutRequest, paymentReceipt }) => {
  const configuredPrivateKey = trimValue(process.env.WF_PAID_MINT_SIGNER_PRIVATE_KEY || process.env.POLYGON_PRIVATE_KEY);
  if (!/^0x[a-fA-F0-9]{64}$/.test(configuredPrivateKey)) {
    throw new Error('Paid mint authorization is not configured yet. Add WF_PAID_MINT_SIGNER_PRIVATE_KEY on the server.');
  }

  const contractAddress = getContractAddress();
  const deadline = BigInt(Math.min(Number(paymentReceipt.expiresAt), Math.floor(Date.now() / 1000) + (60 * 30)));
  const paymentId = trimValue(paymentReceipt.paymentId);
  const chainId = BigInt(polygon.id);
  const authorizationHash = keccak256(encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes32' },
      { type: 'uint256' },
    ],
    [
      contractAddress,
      chainId,
      checkoutRequest.recipientWallet,
      BigInt(checkoutRequest.crateId),
      BigInt(checkoutRequest.quantity),
      paymentId,
      deadline,
    ],
  ));
  const signer = privateKeyToAccount(configuredPrivateKey);
  const signature = await signer.signMessage({ message: { raw: authorizationHash } });

  return {
    contractAddress,
    paymentId,
    deadline,
    signature,
  };
};

export const preparePaidMintPayload = async ({ checkoutRequest, paymentReceipt }) => {
  const authorization = await createPaidMintAuthorization({ checkoutRequest, paymentReceipt });
  const data = encodeFunctionData({
    abi: BUY_CRATES_ABI,
    functionName: 'redeemPaidCrates',
    args: [
      checkoutRequest.recipientWallet,
      BigInt(checkoutRequest.crateId),
      BigInt(checkoutRequest.quantity),
      authorization.paymentId,
      authorization.deadline,
      authorization.signature,
    ],
  });

  return {
    contractAddress: authorization.contractAddress,
    totalPriceWei: 0n,
    data,
    valueHex: '0x0',
    paymentId: authorization.paymentId,
    deadline: authorization.deadline,
  };
};

export const getPublicClient = () => createPublicClient({
  chain: polygon,
  transport: http(getPolygonRpcUrl()),
});

export const getPaidMintRelayerAccount = () => {
  const configuredPrivateKey = trimValue(
    process.env.WF_PAID_MINT_RELAYER_PRIVATE_KEY
    || process.env.WF_PAID_MINT_SIGNER_PRIVATE_KEY
    || process.env.POLYGON_PRIVATE_KEY,
  );
  if (!/^0x[a-fA-F0-9]{64}$/.test(configuredPrivateKey)) {
    throw new Error('Paid mint relayer is not configured yet. Add WF_PAID_MINT_RELAYER_PRIVATE_KEY on the server.');
  }

  return privateKeyToAccount(configuredPrivateKey);
};

export const getPaidMintRelayerClient = () => createWalletClient({
  account: getPaidMintRelayerAccount(),
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
