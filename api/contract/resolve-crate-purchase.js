import { getContractAddress, getPublicClient, parseMintedRewardsFromReceipt, parseCheckoutRequest, trimValue } from './lib.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const txHash = trimValue(request.body?.txHash);
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return response.status(400).json({ message: 'Missing or invalid transaction hash.' });
  }

  let checkoutRequest;
  try {
    checkoutRequest = parseCheckoutRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid contract purchase request.' });
  }

  try {
    const publicClient = getPublicClient();
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') {
      return response.status(409).json({ message: 'The purchase transaction did not succeed.' });
    }

    const mintedRewards = parseMintedRewardsFromReceipt({
      receipt,
      recipientWallet: checkoutRequest.recipientWallet,
      crateId: checkoutRequest.crateId,
      contractAddress: getContractAddress(),
    });

    if (!mintedRewards.length) {
      return response.status(422).json({
        message: 'The transaction confirmed, but no crate rewards were found for this wallet.',
      });
    }

    return response.status(200).json({
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      mintedRewards,
    });
  } catch (error) {
    return response.status(500).json({
      message: error?.message || 'Could not resolve minted rewards right now.',
    });
  }
}
