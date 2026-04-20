const crypto = require('crypto');

const DEFAULT_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

function getTokenSecret() {
  return process.env.AUTH_SECRET || 'duocode-dev-secret';
}

function getTokenExpirationSeconds() {
  const configuredValue = Number(process.env.AUTH_TOKEN_TTL_SECONDS || DEFAULT_EXPIRATION_SECONDS);

  if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
    return DEFAULT_EXPIRATION_SECONDS;
  }

  return Math.floor(configuredValue);
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
  const now = Math.floor(Date.now() / 1000);
  const enrichedPayload = {
    ...payload,
    iat: now,
    iss: 'duocode-api',
    exp: now + getTokenExpirationSeconds(),
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

  const providedBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
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
