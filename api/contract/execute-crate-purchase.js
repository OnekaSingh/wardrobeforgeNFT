import { executeSponsoredPurchase, parseCheckoutRequest } from './lib.js';
import { assertCheckoutCompliance, logComplianceEvent } from './compliance.js';

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
    const complianceDecision = await assertCheckoutCompliance({
      checkoutRequest,
      request,
      stage: 'execute',
    });
    const purchase = await executeSponsoredPurchase(checkoutRequest);

    await logComplianceEvent({
      eventType: 'checkout_mint_executed',
      stage: 'execute',
      decision: complianceDecision.decision,
      riskScore: complianceDecision.riskScore,
      reasons: complianceDecision.reasons,
      provider: complianceDecision.provider,
      walletAddress: checkoutRequest.recipientWallet,
      crateId: checkoutRequest.crateId,
      crateKey: checkoutRequest.crateKey,
      quantity: checkoutRequest.quantity,
      accountId: complianceDecision.accountId,
      country: complianceDecision.country,
      ipAddress: complianceDecision.ipAddress,
      txHash: purchase.txHash,
      blockNumber: purchase.receipt.blockNumber.toString(),
      contractAddress: purchase.contractAddress,
      payerWallet: purchase.payerAddress,
      totalPriceWei: purchase.totalPriceWei.toString(),
    });

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
    const statusCode = error?.statusCode || 500;
    return response.status(statusCode).json({
      message: error?.message || 'Could not complete the sponsored mint right now.',
      compliance: error?.decision || null,
    });
  }
}
