import { createCratePaymentReceipt, parseCheckoutRequest, trimValue } from '../contract/lib.js';

const getCrateUnitPriceUsd = () => Math.max(0.01, Number(process.env.WF_CRATE_PRICE_USD || 2.99));

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  if (process.env.NODE_ENV === 'production' && process.env.WF_ENABLE_DEMO_CARD_CHECKOUT !== 'true') {
    return response.status(503).json({
      message: 'Card checkout provider is not configured yet. Connect a payment provider before confirming crate purchases.',
    });
  }

  let checkoutRequest;
  try {
    checkoutRequest = parseCheckoutRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid checkout request.' });
  }

  const checkoutId = trimValue(request.body?.checkoutId);
  if (!checkoutId) {
    return response.status(400).json({ message: 'Missing checkout session.' });
  }

  const totalUsd = Number((getCrateUnitPriceUsd() * checkoutRequest.quantity).toFixed(2));
  const paymentReceipt = createCratePaymentReceipt({
    checkoutRequest,
    accountId: request.body?.accountId || request.body?.userId,
    totalUsd,
  });

  return response.status(200).json({
    checkoutId,
    crateId: checkoutRequest.crateId,
    crateKey: checkoutRequest.crateKey,
    quantity: checkoutRequest.quantity,
    recipientWallet: checkoutRequest.recipientWallet,
    totalUsd,
    totalLabel: `$${totalUsd.toFixed(2)}`,
    paymentMethod: 'Card / Fiat',
    status: 'paid',
    paymentReceipt,
  });
}
