const crypto = require('crypto');

const DEFAULT_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

function getTokenSecret() {
  return process.env.AUTH_SECRET || 'duocode-dev-secret';
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function sign(value) {
  return crypto.createHmac('sha256', getTokenSecret()).update(value).digest('base64url');
}

function createToken(payload) {
  const enrichedPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + DEFAULT_EXPIRATION_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(enrichedPayload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [payloadPart, signaturePart] = token.split('.');

  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = sign(payloadPart);

  if (signaturePart !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  createToken,
  verifyToken,
};
