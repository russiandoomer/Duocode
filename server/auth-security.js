const LOGIN_IP_LIMIT = 20;
const LOGIN_EMAIL_LIMIT = 10;
const REGISTER_IP_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

const buckets = new Map();

function normalizeClientIp(rawIp) {
  const value = String(rawIp || '').trim();

  if (!value) {
    return 'unknown';
  }

  if (value.startsWith('::ffff:')) {
    return value.slice('::ffff:'.length);
  }

  return value;
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return normalizeClientIp(forwarded.split(',')[0]);
  }

  return normalizeClientIp(request.socket?.remoteAddress || '');
}

function takeRateLimitToken(scope, key, limit, windowMs = RATE_WINDOW_MS) {
  const bucketKey = `${scope}:${key}`;
  const now = Date.now();
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      blocked: false,
      remaining: Math.max(limit - 1, 0),
      resetAt: now + windowMs,
    };
  }

  current.count += 1;

  if (current.count > limit) {
    return {
      blocked: true,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  return {
    blocked: false,
    remaining: Math.max(limit - current.count, 0),
    resetAt: current.resetAt,
  };
}

function clearRateLimit(scope, key) {
  buckets.delete(`${scope}:${key}`);
}

function getUserAgent(request) {
  return String(request.headers['user-agent'] || '').slice(0, 255);
}

function isUserLocked(user) {
  const lockedUntil = user?.locked_until || user?.lockedUntil;

  if (!lockedUntil) {
    return false;
  }

  const lockTime = new Date(lockedUntil).getTime();

  if (Number.isNaN(lockTime)) {
    return false;
  }

  return lockTime > Date.now();
}

function getLockMessage(user) {
  const lockedUntil = user?.locked_until || user?.lockedUntil;

  if (!lockedUntil) {
    return 'Cuenta bloqueada temporalmente.';
  }

  const date = new Date(lockedUntil);
  return `Cuenta bloqueada temporalmente hasta ${date.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  })}.`;
}

module.exports = {
  ACCOUNT_LOCK_MINUTES,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  MAX_FAILED_LOGIN_ATTEMPTS,
  REGISTER_IP_LIMIT,
  clearRateLimit,
  getClientIp,
  getLockMessage,
  getUserAgent,
  isUserLocked,
  takeRateLimitToken,
};
