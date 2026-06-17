import { readComplianceReviewEvents, trimComplianceValue } from '../contract/compliance.js';

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

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const adminToken = trimComplianceValue(process.env.WF_COMPLIANCE_ADMIN_TOKEN);
  if (!adminToken) {
    return response.status(500).json({ message: 'Compliance review queue is not configured yet.' });
  }

  const providedToken = getBearerToken(request) || trimComplianceValue(request.query?.token);
  if (providedToken !== adminToken) {
    return response.status(401).json({ message: 'Unauthorized' });
  }

  const reviews = await readComplianceReviewEvents();
  return response.status(200).json({
    reviews,
    count: reviews.length,
  });
}
