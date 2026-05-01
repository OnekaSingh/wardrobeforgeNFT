import crypto from 'node:crypto';

import { signSmartContractData } from '@wert-io/widget-sc-signer';
import { createPublicClient, encodeFunctionData, http } from 'viem';
import { polygon } from 'viem/chains';

const DEFAULT_CONTRACT_ADDRESS = '0xB81B221d3379F21C17A6f70625d1F22a45399DAf';
const DEFAULT_WERT_ORIGIN = 'https://widget.wert.io';
const DEFAULT_REDIRECT_HASH = '#nfts';

const CRATE_ID_BY_KEY = {
  'crate-sunflare': 1,
  'crate-nebula': 2,
  'crate-verdant': 3,
  'crate-aurora': 4,
};

const BUY_CRATES_ABI = [
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
];

const trimValue = (value) => String(value || '').trim();

const getRequestOrigin = (request) => {
  const configuredOrigin = trimValue(process.env.PUBLIC_APP_ORIGIN);
  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, '');

  const forwardedProto = trimValue(request.headers['x-forwarded-proto']) || 'https';
  const forwardedHost = trimValue(request.headers['x-forwarded-host'] || request.headers.host);
  if (!forwardedHost) return '';
  return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
};

const getPolygonRpcUrl = () => {
  const configuredRpcUrl = trimValue(process.env.POLYGON_RPC_URL);
  if (!configuredRpcUrl) {
    throw new Error('Wert checkout is not configured yet. Add POLYGON_RPC_URL on the server.');
  }

  return configuredRpcUrl;
};

const getWertConfig = () => {
  const partnerId = trimValue(process.env.WERT_PARTNER_ID);
  const wertPrivateKey = trimValue(process.env.WERT_PRIVATE_KEY);
  const contractAddress = trimValue(process.env.WF_CRATE_CONTRACT_ADDRESS) || DEFAULT_CONTRACT_ADDRESS;
  const widgetOrigin = trimValue(process.env.WERT_ORIGIN) || DEFAULT_WERT_ORIGIN;

  if (!partnerId || !wertPrivateKey) {
    throw new Error('Wert checkout is not configured yet. Add WERT_PARTNER_ID and WERT_PRIVATE_KEY on the server.');
  }

  return {
    partnerId,
    wertPrivateKey,
    contractAddress,
    widgetOrigin: widgetOrigin.replace(/\/+$/, ''),
  };
};

const parseCheckoutRequest = (body = {}) => {
  const crateKey = trimValue(body.crateKey);
  const recipientWallet = trimValue(body.recipientWallet);
  const buyerEmail = trimValue(body.buyerEmail).toLowerCase();
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
    buyerEmail,
    displayName: trimValue(body.displayName),
    userId: trimValue(body.userId),
  };
};

const toCommodityAmount = (weiAmount) => {
  const roundFactor = 10n ** 10n;
  const scaled = weiAmount % roundFactor === 0n
    ? weiAmount / roundFactor
    : (weiAmount / roundFactor) + 1n;
  const whole = scaled / 10n ** 8n;
  const fraction = (scaled % 10n ** 8n).toString().padStart(8, '0').replace(/0+$/, '');
  return Number(fraction ? `${whole}.${fraction}` : whole.toString());
};

const buildRedirectUrl = (request, clickId) => {
  const origin = getRequestOrigin(request);
  if (!origin) return '';

  const redirectUrl = new URL('/?wert_status=started', origin);
  redirectUrl.searchParams.set('click_id', clickId);
  redirectUrl.hash = DEFAULT_REDIRECT_HASH;
  return redirectUrl.toString();
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  let wertConfig = null;
  let checkoutRequest = null;
  try {
    wertConfig = getWertConfig();
    checkoutRequest = parseCheckoutRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid Wert checkout request.' });
  }

  try {
    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(getPolygonRpcUrl()),
    });

    const totalPriceWei = await publicClient.readContract({
      address: wertConfig.contractAddress,
      abi: BUY_CRATES_ABI,
      functionName: 'quoteCratePurchase',
      args: [BigInt(checkoutRequest.crateId), BigInt(checkoutRequest.quantity)],
    });

    const clickId = crypto.randomUUID();
    const scInputData = encodeFunctionData({
      abi: BUY_CRATES_ABI,
      functionName: 'buyCrates',
      args: [
        checkoutRequest.recipientWallet,
        BigInt(checkoutRequest.crateId),
        BigInt(checkoutRequest.quantity),
      ],
    });

    const signedData = signSmartContractData(
      {
        address: checkoutRequest.recipientWallet,
        commodity: 'POL',
        network: 'polygon',
        commodity_amount: toCommodityAmount(totalPriceWei),
        sc_address: wertConfig.contractAddress,
        sc_input_data: scInputData,
      },
      wertConfig.wertPrivateKey,
    );

    const checkoutUrl = new URL(`${wertConfig.widgetOrigin}/${wertConfig.partnerId}/widget/order`);
    const checkoutParams = {
      ...signedData,
      click_id: clickId,
      currency: 'USD',
      widget_layout_mode: 'Modal',
    };

    const redirectUrl = buildRedirectUrl(request, clickId);
    if (redirectUrl) {
      checkoutParams.redirect_url = redirectUrl;
    }

    if (checkoutRequest.buyerEmail) {
      checkoutParams.email = checkoutRequest.buyerEmail;
    }

    Object.entries(checkoutParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      checkoutUrl.searchParams.set(key, String(value));
    });

    return response.status(200).json({
      checkoutUrl: checkoutUrl.toString(),
      clickId,
      contractAddress: wertConfig.contractAddress,
      crateId: checkoutRequest.crateId,
      quantity: checkoutRequest.quantity,
      commodity: 'POL',
      network: 'polygon',
      commodityAmount: checkoutParams.commodity_amount,
      totalPriceWei: totalPriceWei.toString(),
    });
  } catch (error) {
    return response.status(500).json({
      message: error?.message || 'Could not prepare Wert checkout right now.',
    });
  }
}
