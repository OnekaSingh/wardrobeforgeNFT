const STRIPE_API_BASE = 'https://api.stripe.com/v1';

const trimValue = (value) => String(value || '').trim();

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const stripeSecretKey = trimValue(process.env.STRIPE_SECRET_KEY);
  if (!stripeSecretKey) {
    return response.status(500).json({
      message: 'Stripe checkout is not configured yet. Add STRIPE_SECRET_KEY on the server.',
    });
  }

  const sessionId = trimValue(request.query?.sessionId);
  if (!sessionId) {
    return response.status(400).json({ message: 'Missing Stripe session id.' });
  }

  try {
    const stripeUrl = new URL(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`);
    stripeUrl.searchParams.set('expand[]', 'payment_intent');

    const stripeResponse = await fetch(stripeUrl, {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    });

    const session = await stripeResponse.json().catch(() => null);
    if (!stripeResponse.ok) {
      return response.status(stripeResponse.status).json({
        message: trimValue(session?.error?.message) || 'Could not verify the Stripe checkout session.',
      });
    }

    return response.status(200).json({
      id: session.id || null,
      paymentStatus: session.payment_status || null,
      status: session.status || null,
      amountTotal: session.amount_total || null,
      currency: session.currency || null,
      metadata: session.metadata || {},
      customerEmail: session.customer_details?.email || session.customer_email || null,
    });
  } catch (error) {
    return response.status(502).json({ message: 'Could not reach Stripe right now.' });
  }
}
