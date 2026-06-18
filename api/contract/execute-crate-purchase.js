import {
  getPaidMintRelayerClient,
  getPublicClient,
  parseCheckoutRequest,
  parseMintedRewardsFromReceipt,
  preparePaidMintPayload,
  requireVerifiedCratePayment,
} from './lib.js';
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
    const paymentReceipt = requireVerifiedCratePayment({
      body: request.body || {},
      checkoutRequest,
    });
    const complianceDecision = await assertCheckoutCompliance({
      checkoutRequest,
      request,
      stage: 'execute',
    });
    const prepared = await preparePaidMintPayload({ checkoutRequest, paymentReceipt });
    const publicClient = getPublicClient();
    const relayerClient = getPaidMintRelayerClient();

    const txHash = await relayerClient.sendTransaction({
      account: relayerClient.account,
      chain: relayerClient.chain,
      to: prepared.contractAddress,
      data: prepared.data,
      value: 0n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      throw new Error('The paid mint transaction did not succeed on Polygon.');
    }

    const mintedRewards = parseMintedRewardsFromReceipt({
      receipt,
      recipientWallet: checkoutRequest.recipientWallet,
      crateId: checkoutRequest.crateId,
      contractAddress: prepared.contractAddress,
    });

    if (!mintedRewards.length) {
      throw new Error('The transaction confirmed, but no crate rewards were found for this wallet.');
    }

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
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: prepared.contractAddress,
      payerWallet: relayerClient.account.address,
      totalPriceWei: '0',
    });

    return response.status(200).json({
      crateId: checkoutRequest.crateId,
      crateKey: checkoutRequest.crateKey,
      quantity: checkoutRequest.quantity,
      recipientWallet: checkoutRequest.recipientWallet,
      payerWallet: relayerClient.account.address,
      contractAddress: prepared.contractAddress,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      totalPriceWei: '0',
      paymentId: prepared.paymentId,
      mintedRewards,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return response.status(statusCode).json({
      message: error?.message || 'Could not complete the paid mint right now.',
      compliance: error?.decision || null,
    });
  }
}
