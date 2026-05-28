import { executeSponsoredPurchase, parseCheckoutRequest } from './lib.js';

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
    const purchase = await executeSponsoredPurchase(checkoutRequest);

    return response.status(200).json({
      crateId: checkoutRequest.crateId,
      crateKey: checkoutRequest.crateKey,
      quantity: checkoutRequest.quantity,
      recipientWallet: checkoutRequest.recipientWallet,
      payerWallet: purchase.payerAddress,
      contractAddress: purchase.contractAddress,
      txHash: purchase.txHash,
      blockNumber: purchase.receipt.blockNumber.toString(),
      totalPriceWei: purchase.totalPriceWei.toString(),
      mintedRewards: purchase.mintedRewards,
    });
  } catch (error) {
    return response.status(500).json({
      message: error?.message || 'Could not complete the sponsored mint right now.',
    });
  }
}
