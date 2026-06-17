import { trimComplianceValue, writeComplianceLogEntry } from '../contract/compliance.js';

const getHeader = (request, name) => {
  const headers = request?.headers || {};
  if (typeof headers.get === 'function') {
    return trimComplianceValue(headers.get(name));
  }

  return trimComplianceValue(headers[name] || headers[name.toLowerCase()]);
};

const getBearerToken = (request) => {
  const authorization = getHeader(request, 'authorization');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return trimComplianceValue(match?.[1]);
};

const getWebhookBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Compliance event payload must be a JSON object.');
  }

  return body;
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const webhookToken = trimComplianceValue(process.env.WF_COMPLIANCE_WEBHOOK_TOKEN);
  if (webhookToken) {
    const providedToken = getBearerToken(request) || getHeader(request, 'x-compliance-webhook-token');
    if (providedToken !== webhookToken) {
      return response.status(401).json({ message: 'Unauthorized' });
    }
  }

  let eventPayload;
  try {
    eventPayload = getWebhookBody(request.body);
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }

  const received = await writeComplianceLogEntry({
    ...eventPayload,
    eventType: eventPayload.eventType || 'compliance_webhook_event',
    webhookReceivedAt: new Date().toISOString(),
    webhookSourceIp: getHeader(request, 'x-forwarded-for').split(',')[0]?.trim()
      || getHeader(request, 'x-real-ip')
      || request?.socket?.remoteAddress
      || null,
  });

  return response.status(200).json({
    ok: true,
    timestamp: received.timestamp,
  });
}
