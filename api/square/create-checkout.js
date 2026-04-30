const SQUARE_API_ENDPOINT = 'https://connect.squareup.com/v2/online-checkout/payment-links';
const SQUARE_API_VERSION = '2026-01-22';
const CUSTOM_PACK_ID = 'topup-custom';

const TOP_UP_PACKAGES = {
  'topup-100': { tokens: 100, amountCents: 199, label: '100 VTO tokens' },
  'topup-400': { tokens: 400, amountCents: 599, label: '400 VTO tokens' },
  'topup-1700': { tokens: 1700, amountCents: 2599, label: '1,700 VTO tokens' },
  'topup-3600': { tokens: 3600, amountCents: 5099, label: '3,600 VTO tokens' },
  'topup-15500': { tokens: 15500, amountCents: 20099, label: '15,500 VTO tokens' },
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

const parseTopUpRequest = ({ packId, customTokens }) => {
  const cleanPackId = trimValue(packId);

  if (!cleanPackId) {
    throw new Error('Choose a top-up package.');
  }

  if (cleanPackId === CUSTOM_PACK_ID) {
    const tokens = Number(customTokens);
    const isValidTokens = Number.isInteger(tokens) && tokens >= 100 && tokens <= 20000 && tokens % 100 === 0;

    if (!isValidTokens) {
      throw new Error('Custom top-ups must be between 100 and 20,000 tokens in 100-token steps.');
    }

    return {
      packId: cleanPackId,
      tokens,
      amountCents: (tokens / 100) * 199,
      label: `${tokens.toLocaleString()} custom VTO tokens`,
    };
  }

  const pack = TOP_UP_PACKAGES[cleanPackId];
  if (!pack) {
    throw new Error('Unknown top-up package.');
  }

  return {
    packId: cleanPackId,
    ...pack,
  };
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const squareAccessToken = trimValue(process.env.SQUARE_ACCESS_TOKEN);
  const squareLocationId = trimValue(process.env.SQUARE_LOCATION_ID);
  const merchantSupportEmail = trimValue(process.env.SQUARE_MERCHANT_SUPPORT_EMAIL);

  if (!squareAccessToken || !squareLocationId) {
    return response.status(500).json({
      message: 'Square checkout is not configured yet. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID on the server.',
    });
  }

  let topUp = null;
  try {
    topUp = parseTopUpRequest(request.body || {});
  } catch (error) {
    return response.status(400).json({ message: error.message || 'Invalid top-up request.' });
  }

  const origin = getRequestOrigin(request);
  if (!origin) {
    return response.status(500).json({ message: 'Could not determine the app origin for checkout redirects.' });
  }

  const redirectUrl = new URL('/?square_status=success', origin);
  redirectUrl.searchParams.set('pack', topUp.packId);
  redirectUrl.searchParams.set('tokens', String(topUp.tokens));
  redirectUrl.hash = 'topup';

  const buyerEmail = normalizeEmail(request.body?.buyerEmail);
  const userId = trimValue(request.body?.userId);
  const displayName = trimValue(request.body?.displayName);

  const squareRequestBody = {
    idempotency_key: crypto.randomUUID(),
    description: `WardrobeForge top-up checkout for ${displayName || userId || 'guest'}`,
    quick_pay: {
      name: topUp.label,
      price_money: {
        amount: topUp.amountCents,
        currency: 'USD',
      },
      location_id: squareLocationId,
    },
    checkout_options: {
      allow_tipping: false,
      redirect_url: redirectUrl.toString(),
    },
    payment_note: `WardrobeForge top-up ${topUp.packId} (${topUp.tokens} tokens) for ${userId || buyerEmail || 'guest'}`,
  };

  if (merchantSupportEmail) {
    squareRequestBody.checkout_options.merchant_support_email = merchantSupportEmail;
  }

  if (buyerEmail) {
    squareRequestBody.pre_populated_data = {
      buyer_email: buyerEmail,
    };
  }

  try {
    const squareResponse = await fetch(SQUARE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${squareAccessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
      body: JSON.stringify(squareRequestBody),
    });

    const squarePayload = await squareResponse.json().catch(() => null);

    if (!squareResponse.ok) {
      const squareMessage = Array.isArray(squarePayload?.errors) && squarePayload.errors.length
        ? squarePayload.errors.map((entry) => trimValue(entry?.detail || entry?.code)).filter(Boolean).join(' ')
        : '';

      return response.status(squareResponse.status).json({
        message: squareMessage || 'Square could not create the checkout page.',
      });
    }

    return response.status(200).json({
      checkoutUrl: squarePayload?.payment_link?.url || squarePayload?.payment_link?.long_url || null,
      paymentLinkId: squarePayload?.payment_link?.id || null,
      amountCents: topUp.amountCents,
      tokens: topUp.tokens,
    });
  } catch (error) {
    return response.status(502).json({ message: 'Could not reach Square right now.' });
  }
}
