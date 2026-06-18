import crypto from 'node:crypto';

import { parseCheckoutRequest, trimValue } from '../contract/lib.js';

const getCrateUnitPriceUsd = () => Math.max(0.01, Number(process.env.WF_CRATE_PRICE_USD || 2.99));
const getGasFeeUsd = () => Number(Math.max(0, Number(process.env.WF_GAS_FEE_USD || 0.01)).toFixed(2));
const getCheckoutTotals = (quantity) => {
  const nftPriceUsd = Number((getCrateUnitPriceUsd() * quantity).toFixed(2));
  const gasFeeUsd = getGasFeeUsd();
  const totalUsd = Number((nftPriceUsd + gasFeeUsd).toFixed(2));

  return {
    nftPriceUsd,
    gasFeeUsd,
    totalUsd,
    totalLabel: `$${totalUsd.toFixed(2)}`,
  };
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  let checkoutRequest;
  try {
    checkoutRequest = parseCheckoutRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid checkout request.' });
  }

  const totals = getCheckoutTotals(checkoutRequest.quantity);
  const checkoutId = crypto.randomUUID();

  return response.status(200).json({
    checkoutId,
    crateId: checkoutRequest.crateId,
    crateKey: checkoutRequest.crateKey,
    quantity: checkoutRequest.quantity,
    recipientWallet: checkoutRequest.recipientWallet,
    ...totals,
    paymentProvider: trimValue(process.env.WF_CARD_PAYMENT_PROVIDER) || 'demo',
    status: 'requires_payment',
    demoPaymentAvailable: process.env.NODE_ENV !== 'production' || process.env.WF_ENABLE_DEMO_CARD_CHECKOUT === 'true',
  });
}
