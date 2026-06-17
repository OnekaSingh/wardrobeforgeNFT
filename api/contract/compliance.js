import { appendFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LOG_PATH = '/tmp/wardrobeforge-compliance-events.jsonl';
const POLYGON_CHAIN_ID = 137;
const DEFAULT_BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SY'];
const DEFAULT_BLOCKED_REGION_TERMS = ['crimea', 'donetsk', 'luhansk'];

export class ComplianceBlockedError extends Error {
  constructor(message, decision) {
    super(message);
    this.name = 'ComplianceBlockedError';
    this.statusCode = 403;
    this.decision = decision;
  }
}

export class ComplianceReviewRequiredError extends Error {
  constructor(message, decision) {
    super(message);
    this.name = 'ComplianceReviewRequiredError';
    this.statusCode = 409;
    this.decision = decision;
  }
}

export const trimComplianceValue = (value) => String(value || '').trim();

const splitList = (value) => trimComplianceValue(value)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const normalizeWallet = (value) => trimComplianceValue(value).toLowerCase();

const normalizeRegion = (value) => trimComplianceValue(value).toLowerCase();

const parseIntegerEnv = (name, fallback) => {
  const parsed = Number.parseInt(trimComplianceValue(process.env[name]), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getHeader = (request, name) => {
  const headers = request?.headers || {};
  if (typeof headers.get === 'function') {
    return trimComplianceValue(headers.get(name));
  }

  return trimComplianceValue(headers[name] || headers[name.toLowerCase()]);
};

export const getComplianceRequestContext = (request) => {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  const ipAddress = forwardedFor.split(',')[0]?.trim()
    || getHeader(request, 'x-real-ip')
    || request?.socket?.remoteAddress
    || '';
  const country = (
    getHeader(request, 'x-vercel-ip-country')
    || getHeader(request, 'cf-ipcountry')
    || getHeader(request, 'x-country-code')
    || ''
  ).toUpperCase();
  const region = (
    getHeader(request, 'x-vercel-ip-country-region')
    || getHeader(request, 'x-vercel-ip-region')
    || getHeader(request, 'cf-region')
    || getHeader(request, 'x-region-code')
    || ''
  ).toUpperCase();
  const city = (
    getHeader(request, 'x-vercel-ip-city')
    || getHeader(request, 'cf-ipcity')
    || getHeader(request, 'x-city')
    || ''
  );

  return {
    ipAddress,
    country,
    region,
    city,
    userAgent: getHeader(request, 'user-agent'),
    accountId: trimComplianceValue(request?.body?.accountId || request?.body?.userId),
    emailHash: trimComplianceValue(request?.body?.emailHash),
  };
};

const createReviewId = () => `WF-AML-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const hasAnyText = (text, needles) => needles.some((needle) => text.includes(needle));

const normalizeProviderDecision = (providerPayload) => {
  if (!providerPayload || typeof providerPayload !== 'object') {
    return {
      providerRiskScore: 0,
      providerRiskLevel: '',
      providerSanctioned: false,
      providerReview: false,
      providerReasons: [],
      providerReferenceId: '',
    };
  }

  const serialized = JSON.stringify(providerPayload).toLowerCase();
  const rawScore = Number(
    providerPayload.riskScore
    ?? providerPayload.score
    ?? providerPayload.risk_score
    ?? providerPayload.risk?.score
    ?? providerPayload.result?.riskScore
    ?? 0,
  );
  const providerRiskScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const providerRiskLevel = trimComplianceValue(
    providerPayload.riskLevel
    ?? providerPayload.risk_level
    ?? providerPayload.level
    ?? providerPayload.risk?.level
    ?? providerPayload.result?.riskLevel,
  ).toLowerCase();
  const providerSanctioned = Boolean(
    providerPayload.sanctioned
    || providerPayload.isSanctioned
    || providerPayload.sanctions
    || providerPayload.ofac
    || providerPayload.result?.sanctioned
    || hasAnyText(serialized, ['sanction', 'ofac', 'blocked person', 'blocked property']),
  );
  const providerReview = Boolean(
    providerPayload.review
    || providerPayload.requiresReview
    || providerPayload.manualReview
    || providerPayload.requiresKyc
    || providerPayload.result?.requiresReview
  );
  const providerReasons = [
    ...new Set([
      ...splitList(providerPayload.reason || providerPayload.reasons || providerPayload.category || ''),
      ...(hasAnyText(serialized, ['mixer', 'tornado', 'darknet', 'ransomware', 'stolen funds']) ? ['high-risk blockchain exposure'] : []),
    ]),
  ];
  const providerReferenceId = trimComplianceValue(
    providerPayload.id
    ?? providerPayload.referenceId
    ?? providerPayload.reference_id
    ?? providerPayload.result?.id,
  );

  return {
    providerRiskScore,
    providerRiskLevel,
    providerSanctioned,
    providerReview,
    providerReasons,
    providerReferenceId,
  };
};

const screenWalletWithProvider = async ({ checkoutRequest, context }) => {
  const screeningUrl = trimComplianceValue(process.env.WF_AML_SCREENING_URL);
  const screeningApiKey = trimComplianceValue(process.env.WF_AML_SCREENING_API_KEY);

  if (!screeningUrl) {
    return normalizeProviderDecision(null);
  }

  const screeningResponse = await fetch(screeningUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(screeningApiKey ? { Authorization: `Bearer ${screeningApiKey}` } : {}),
    },
    body: JSON.stringify({
      address: checkoutRequest.recipientWallet,
      walletAddress: checkoutRequest.recipientWallet,
      chain: 'polygon',
      chainId: POLYGON_CHAIN_ID,
      network: 'polygon',
      accountId: context.accountId || null,
      ipCountry: context.country || null,
      ipRegion: context.region || null,
      ipCity: context.city || null,
    }),
  });

  const payload = await screeningResponse.json().catch(() => null);
  if (!screeningResponse.ok) {
    return {
      providerRiskScore: 60,
      providerRiskLevel: 'review',
      providerSanctioned: false,
      providerReview: true,
      providerReasons: ['wallet screening provider unavailable'],
      providerReferenceId: payload?.id || '',
    };
  }

  return normalizeProviderDecision(payload);
};

export const scoreCheckoutRisk = async ({ checkoutRequest, context }) => {
  const normalizedWallet = normalizeWallet(checkoutRequest.recipientWallet);
  const blockedWallets = new Set(splitList(process.env.WF_AML_BLOCKED_WALLETS).map(normalizeWallet));
  const reviewWallets = new Set(splitList(process.env.WF_AML_REVIEW_WALLETS).map(normalizeWallet));
  const blockedCountries = new Set([
    ...DEFAULT_BLOCKED_COUNTRIES,
    ...splitList(process.env.WF_AML_BLOCKED_COUNTRIES).map((entry) => entry.toUpperCase()),
  ]);
  const reviewCountries = new Set(splitList(process.env.WF_AML_REVIEW_COUNTRIES).map((entry) => entry.toUpperCase()));
  const blockedRegionTerms = [
    ...DEFAULT_BLOCKED_REGION_TERMS,
    ...splitList(process.env.WF_AML_BLOCKED_REGIONS).map(normalizeRegion),
  ];
  const normalizedRegionText = normalizeRegion(`${context.region} ${context.city}`);
  const providerDecision = await screenWalletWithProvider({ checkoutRequest, context });
  const reasons = [];
  let riskScore = providerDecision.providerRiskScore;
  let blocked = false;
  let review = false;

  if (blockedWallets.has(normalizedWallet)) {
    riskScore = Math.max(riskScore, 100);
    blocked = true;
    reasons.push('wallet address is blocked by WardrobeForge compliance controls');
  }

  if (reviewWallets.has(normalizedWallet)) {
    riskScore = Math.max(riskScore, 60);
    review = true;
    reasons.push('wallet address requires manual review');
  }

  if (context.country && blockedCountries.has(context.country)) {
    riskScore = Math.max(riskScore, 100);
    blocked = true;
    reasons.push(`request originated from blocked jurisdiction ${context.country}`);
  }

  if (context.country && reviewCountries.has(context.country)) {
    riskScore = Math.max(riskScore, 55);
    review = true;
    reasons.push('request originated from a jurisdiction requiring manual review');
  }

  if (blockedRegionTerms.some((term) => term && normalizedRegionText.includes(term))) {
    riskScore = Math.max(riskScore, 100);
    blocked = true;
    reasons.push('request originated from a blocked region of Ukraine');
  }

  if (providerDecision.providerSanctioned) {
    riskScore = Math.max(riskScore, 100);
    blocked = true;
    reasons.push('wallet screening identified sanctions exposure');
  }

  if (providerDecision.providerReview) {
    riskScore = Math.max(riskScore, 55);
    review = true;
    reasons.push('wallet screening requires manual review');
  }

  if (['critical', 'high', 'severe', 'blocked', 'sanctioned'].includes(providerDecision.providerRiskLevel)) {
    riskScore = Math.max(riskScore, 85);
  }

  if (['medium', 'review', 'elevated'].includes(providerDecision.providerRiskLevel)) {
    riskScore = Math.max(riskScore, 55);
  }

  reasons.push(...providerDecision.providerReasons);

  const blockScore = parseIntegerEnv('WF_AML_BLOCK_SCORE', 85);
  const reviewScore = parseIntegerEnv('WF_AML_REVIEW_SCORE', 50);
  const kycScore = parseIntegerEnv('WF_AML_KYC_SCORE', 50);

  if (riskScore >= blockScore) {
    blocked = true;
  } else if (riskScore >= reviewScore) {
    review = true;
  }

  return {
    riskScore,
    reasons: [...new Set(reasons)].filter(Boolean),
    blocked,
    review,
    kycRequired: riskScore >= kycScore || review,
    provider: {
      riskScore: providerDecision.providerRiskScore,
      riskLevel: providerDecision.providerRiskLevel,
      referenceId: providerDecision.providerReferenceId,
    },
  };
};

export const getComplianceLogPath = () => trimComplianceValue(process.env.WF_COMPLIANCE_LOG_PATH) || DEFAULT_LOG_PATH;

export const writeComplianceLogEntry = async (event) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  console.log(JSON.stringify({ type: 'wardrobeforge.compliance', ...logEntry }));

  try {
    await appendFile(getComplianceLogPath(), `${JSON.stringify(logEntry)}\n`, 'utf8');
  } catch (error) {
    if (!getComplianceLogPath().startsWith('/tmp/')) {
      await appendFile(DEFAULT_LOG_PATH, `${JSON.stringify({ ...logEntry, logPathError: error.message })}\n`, 'utf8');
    }
  }

  return logEntry;
};

export const logComplianceEvent = async (event) => {
  const logEntry = await writeComplianceLogEntry(event);
  const logWebhookUrl = trimComplianceValue(process.env.WF_COMPLIANCE_WEBHOOK_URL);

  if (logWebhookUrl) {
    fetch(logWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {});
  }

  return logEntry;
};

export const buildComplianceDecision = ({ checkoutRequest, context, risk }) => {
  const decision = risk.blocked ? 'BLOCK' : risk.review ? 'REVIEW' : 'ALLOW';
  const reviewId = decision === 'REVIEW' ? createReviewId() : null;

  return {
    decision,
    reviewId,
    kycRequired: risk.kycRequired,
    riskScore: risk.riskScore,
    reasons: risk.reasons,
    provider: risk.provider,
    walletAddress: checkoutRequest.recipientWallet,
    crateId: checkoutRequest.crateId,
    crateKey: checkoutRequest.crateKey,
    quantity: checkoutRequest.quantity,
    accountId: context.accountId || null,
    country: context.country || null,
    region: context.region || null,
    city: context.city || null,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
  };
};

export const assertCheckoutCompliance = async ({ checkoutRequest, request, stage }) => {
  const context = getComplianceRequestContext(request);
  const risk = await scoreCheckoutRisk({ checkoutRequest, context });
  const complianceDecision = buildComplianceDecision({ checkoutRequest, context, risk });

  await logComplianceEvent({
    eventType: 'checkout_compliance_decision',
    stage,
    ...complianceDecision,
  });

  if (complianceDecision.decision === 'BLOCK') {
    throw new ComplianceBlockedError(
      'This mint cannot be completed because the wallet or request did not pass compliance screening.',
      complianceDecision,
    );
  }

  if (complianceDecision.decision === 'REVIEW') {
    throw new ComplianceReviewRequiredError(
      `This mint requires compliance review before it can be completed. Please contact legal@wardrobeforge.app with review ID ${complianceDecision.reviewId}.`,
      complianceDecision,
    );
  }

  return complianceDecision;
};

export const readComplianceReviewEvents = async () => {
  const logPath = getComplianceLogPath();
  let contents = '';

  try {
    contents = await readFile(logPath, 'utf8');
  } catch (error) {
    if (logPath !== DEFAULT_LOG_PATH) {
      contents = await readFile(DEFAULT_LOG_PATH, 'utf8').catch(() => '');
    }
  }

  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter((entry) => entry?.decision === 'REVIEW')
    .sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
};

export const getComplianceModuleDirectory = () => dirname(fileURLToPath(import.meta.url));
