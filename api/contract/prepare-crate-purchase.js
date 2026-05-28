import { parseCheckoutRequest, preparePurchasePayload } from './lib.js';

const toHexQuantity = (value) => `0x${BigInt(value).toString(16)}`;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  let checkoutRequest;
  try {
    checkoutRequest = parseCheckoutRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid contract purchase request.' });
  }

  try {
    const prepared = await preparePurchasePayload(checkoutRequest);

    return response.status(200).json({
      crateId: checkoutRequest.crateId,
      crateKey: checkoutRequest.crateKey,
      quantity: checkoutRequest.quantity,
      recipientWallet: checkoutRequest.recipientWallet,
      network: 'polygon',
      chainId: 137,
      chainIdHex: '0x89',
      contractAddress: prepared.contractAddress,
      totalPriceWei: prepared.totalPriceWei.toString(),
      valueHex: toHexQuantity(prepared.totalPriceWei),
      data: prepared.data,
    });
  } catch (error) {
    return response.status(500).json({
      message: error?.message || 'Could not prepare the contract purchase right now.',
    });
  }
}
