const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const CUSTOM_PACK_ID = 'topup-custom';
const COINS_PER_CRATE = 100;
const CRATE_PRICE_CENTS = 299;
const COIN_RATE_CENTS = 299;

const TOP_UP_PACKAGES = {
  'topup-100': { coins: 100, amountCents: 299, label: '100 coins' },
  'topup-400': { coins: 400, amountCents: 1196, label: '400 coins' },
  'topup-1700': { coins: 1700, amountCents: 5083, label: '1,700 coins' },
  'topup-3600': { coins: 3600, amountCents: 10764, label: '3,600 coins' },
  'topup-15500': { coins: 15500, amountCents: 46345, label: '15,500 coins' },
};

const CRATE_LABELS = {
  'crate-sunflare': 'Sunflare Crate',
  'crate-nebula': 'Nebula Crate',
  'crate-verdant': 'Verdant Crate',
  'crate-aurora': 'Aurora Crate',
};

const trimValue = (value) => String(value || '').trim();
const normalizeEmail = (value) => trimValue(value).toLowerCase();

const getRequestOrigin = (request) => {
  const configuredOrigin = trimValue(process.env.PUBLIC_APP_ORIGIN);
  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, '');

  const forwardedProto = trimValue(request.headers['x-forwarded-proto']) || 'https';
  const forwardedHost = trimValue(request.headers['x-forwarded-host'] || request.headers.host);
  if (!forwardedHost) return '';
  return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
};

const appendStripeFields = (params, prefix, value) => {
  if (value === undefined || value === null || value === '') return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => appendStripeFields(params, `${prefix}[${index}]`, entry));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => appendStripeFields(params, `${prefix}[${key}]`, entry));
    return;
  }

  params.append(prefix, String(value));
};

const buildStripeBody = (payload) => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => appendStripeFields(params, key, value));
  return params;
};

const createStripeSession = async ({ secretKey, payload }) => {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildStripeBody(payload),
  });

  const session = await response.json().catch(() => null);
  if (!response.ok) {
    const message = trimValue(session?.error?.message);
    const error = new Error(message || 'Stripe could not create the checkout session.');
    error.statusCode = response.status;
    throw error;
  }

  return session;
};

const parseTopUpRequest = ({ packId, customCoins }) => {
  const cleanPackId = trimValue(packId);
  if (!cleanPackId) {
    throw new Error('Choose a coin pack.');
  }

  if (cleanPackId === CUSTOM_PACK_ID) {
    const coins = Number(customCoins);
    const isValidCoins = Number.isInteger(coins) && coins >= 100 && coins <= 20000 && coins % 100 === 0;
    if (!isValidCoins) {
      throw new Error('Custom top-ups must be between 100 and 20,000 coins in 100-coin steps.');
    }

    return {
      packId: cleanPackId,
      coins,
      amountCents: (coins / 100) * COIN_RATE_CENTS,
      label: `${coins.toLocaleString()} coins`,
    };
  }

  const pack = TOP_UP_PACKAGES[cleanPackId];
  if (!pack) {
    throw new Error('Unknown coin pack.');
  }

  return {
    packId: cleanPackId,
    ...pack,
  };
};

const parseCrateCheckoutRequest = ({ crateKey, quantity }) => {
  const cleanCrateKey = trimValue(crateKey);
  const cleanQuantity = Number(quantity);

  if (!CRATE_LABELS[cleanCrateKey]) {
    throw new Error('Choose a valid crate.');
  }

  if (!Number.isInteger(cleanQuantity) || cleanQuantity < 1 || cleanQuantity > 10) {
    throw new Error('Choose between 1 and 10 crates.');
  }

  return {
    crateKey: cleanCrateKey,
    crateLabel: CRATE_LABELS[cleanCrateKey],
    quantity: cleanQuantity,
    amountCents: cleanQuantity * CRATE_PRICE_CENTS,
    coins: cleanQuantity * COINS_PER_CRATE,
  };
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const stripeSecretKey = trimValue(process.env.STRIPE_SECRET_KEY);
  if (!stripeSecretKey) {
    return response.status(500).json({
      message: 'Stripe checkout is not configured yet. Add STRIPE_SECRET_KEY on the server.',
    });
  }

  const checkoutKind = trimValue(request.body?.checkoutKind);
  const origin = getRequestOrigin(request);
  if (!origin) {
    return response.status(500).json({ message: 'Could not determine the app origin for checkout redirects.' });
  }

  const claimId = crypto.randomUUID();
  const buyerEmail = normalizeEmail(request.body?.buyerEmail);
  const userId = trimValue(request.body?.userId);
  const displayName = trimValue(request.body?.displayName);

  try {
    if (checkoutKind === 'topup') {
      const topUp = parseTopUpRequest(request.body || {});
      const successUrl = `${origin}/?stripe_status=success&checkout=topup&claim=${encodeURIComponent(claimId)}&session_id={CHECKOUT_SESSION_ID}#/topup`;
      const cancelUrl = `${origin}/#/topup`;

      const session = await createStripeSession({
        secretKey: stripeSecretKey,
        payload: {
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: buyerEmail || undefined,
          metadata: {
            checkoutKind,
            claimId,
            userId,
            displayName,
            packId: topUp.packId,
            coins: topUp.coins,
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: 'usd',
                unit_amount: topUp.amountCents,
                product_data: {
                  name: topUp.label,
                  description: 'WardrobeForge coin top-up',
                },
              },
            },
          ],
        },
      });

      return response.status(200).json({
        checkoutUrl: session.url || null,
        sessionId: session.id || null,
        claimId,
        amountCents: topUp.amountCents,
        coins: topUp.coins,
      });
    }

    if (checkoutKind === 'crate') {
      const crateCheckout = parseCrateCheckoutRequest(request.body || {});
      const successUrl = `${origin}/?stripe_status=success&checkout=crate&claim=${encodeURIComponent(claimId)}&session_id={CHECKOUT_SESSION_ID}#/checkout`;
      const cancelUrl = `${origin}/#/nfts`;

      const session = await createStripeSession({
        secretKey: stripeSecretKey,
        payload: {
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: buyerEmail || undefined,
          metadata: {
            checkoutKind,
            claimId,
            userId,
            displayName,
            crateKey: crateCheckout.crateKey,
            quantity: crateCheckout.quantity,
            coins: crateCheckout.coins,
          },
          line_items: [
            {
              quantity: crateCheckout.quantity,
              price_data: {
                currency: 'usd',
                unit_amount: CRATE_PRICE_CENTS,
                product_data: {
                  name: crateCheckout.crateLabel,
                  description: 'WardrobeForge crate purchase',
                },
              },
            },
          ],
        },
      });

      return response.status(200).json({
        checkoutUrl: session.url || null,
        sessionId: session.id || null,
        claimId,
        amountCents: crateCheckout.amountCents,
        quantity: crateCheckout.quantity,
      });
    }

    return response.status(400).json({ message: 'Unknown Stripe checkout type.' });
  } catch (error) {
    return response.status(error.statusCode || 400).json({
      message: error.message || 'Could not create the Stripe checkout session.',
    });
  }
}
