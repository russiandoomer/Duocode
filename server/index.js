const http = require('http');
const { URL } = require('url');

const {
  createUser,
  getUserByEmail,
  getUserById,
  markLoginFailure,
  markLoginSuccess,
  normalizeEmail,
  recordAuthAudit,
  sanitizeUser,
} = require('./auth-repository');
const {
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
} = require('./auth-security');
const { getContent, getDataSource } = require('./content-repository');
const { buildAdminDashboard, buildLearnerDashboard, evaluateExerciseForUser } = require('./learning-repository');
const { verifyPassword } = require('./passwords');
const { createToken, verifyToken } = require('./tokens');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  response.end(JSON.stringify(payload));
}

function getBearerToken(request) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

async function parseBody(request) {
  return await new Promise((resolve, reject) => {
    let rawData = '';

    request.on('data', (chunk) => {
      rawData += chunk;
    });

    request.on('end', () => {
      if (!rawData) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawData));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

async function authenticateRequest(request) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload?.userId) {
    return null;
  }

  const user = await getUserById(payload.userId);

  if (!user) {
    return null;
  }

  return user;
}

function issueAuthPayload(user) {
  const safeUser = sanitizeUser(user);
  return {
    token: createToken({
      userId: safeUser.id,
      role: safeUser.role,
      email: safeUser.email,
    }),
    user: safeUser,
  };
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function validateName(value) {
  const normalized = String(value || '').trim();
  return normalized.length >= 3 && normalized.length <= 80;
}

function validatePassword(value) {
  const password = String(value || '');

  if (password.length < 8 || password.length > 72) {
    return 'El password debe tener entre 8 y 72 caracteres.';
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter || !hasNumber) {
    return 'El password debe incluir letras y numeros.';
  }

  return null;
}

function isUserActive(user) {
  const value = user?.is_active ?? user?.isActive;
  return value == null ? true : Boolean(value);
}

function getAuthThrottleMessage(resetAt) {
  const waitSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return `Demasiados intentos. Espera ${waitSeconds} segundos antes de volver a intentar.`;
}

function createAppServer() {
  return http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
      response.end();
      return;
    }

    const parsedUrl = new URL(request.url, 'http://localhost');
    const { pathname } = parsedUrl;

    try {
      if (pathname === '/' || pathname === '/api') {
        sendJson(response, 200, {
          name: 'duocode-api',
          status: 'ok',
          endpoints: [
            '/api/health',
            '/api/content',
            '/api/auth/register',
            '/api/auth/login',
            '/api/auth/me',
            '/api/learner/dashboard',
            '/api/exercises/:id/evaluate',
            '/api/admin/dashboard',
          ],
        });
        return;
      }

      if (pathname === '/api/health') {
        const dataSource = await getDataSource();
        sendJson(response, 200, {
          status: 'ok',
          uptime: process.uptime(),
          dataSource,
        });
        return;
      }

      if (pathname === '/api/content' && request.method === 'GET') {
        const content = await getContent();
        sendJson(response, 200, content);
        return;
      }

      if (pathname === '/api/auth/register' && request.method === 'POST') {
        const clientIp = getClientIp(request);
        const userAgent = getUserAgent(request);
        const registerThrottle = takeRateLimitToken('register-ip', clientIp, REGISTER_IP_LIMIT);

        if (registerThrottle.blocked) {
          sendJson(response, 429, {
            error: getAuthThrottleMessage(registerThrottle.resetAt),
          });
          return;
        }

        const body = await parseBody(request);
        const name = String(body.name || '').trim();
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        const confirmPassword = String(body.confirmPassword || '');
        const passwordError = validatePassword(password);

        if (!validateName(name) || !validateEmail(email) || passwordError) {
          await recordAuthAudit({
            email,
            eventType: 'register_failed',
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'validation_failed',
            },
          });

          sendJson(response, 400, {
            error: passwordError || 'Datos invalidos. Revisa nombre y email.',
          });
          return;
        }

        if (confirmPassword && confirmPassword !== password) {
          sendJson(response, 400, {
            error: 'La confirmacion del password no coincide.',
          });
          return;
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
          await recordAuthAudit({
            userId: existingUser.id,
            email,
            eventType: 'register_failed',
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: 'email_exists',
            },
          });

          sendJson(response, 409, {
            error: 'Ese email ya esta registrado.',
          });
          return;
        }

        const createdUser = await createUser({ name, email, password });
        await recordAuthAudit({
          userId: createdUser?.id,
          email,
          eventType: 'register_success',
          ipAddress: clientIp,
          userAgent,
        });
        sendJson(response, 201, issueAuthPayload(createdUser));
        return;
      }

      if (pathname === '/api/auth/login' && request.method === 'POST') {
        const clientIp = getClientIp(request);
        const userAgent = getUserAgent(request);
        const body = await parseBody(request);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');

        const ipThrottle = takeRateLimitToken('login-ip', clientIp, LOGIN_IP_LIMIT);
        const emailThrottle = takeRateLimitToken('login-email', email, LOGIN_EMAIL_LIMIT);

        if (ipThrottle.blocked || emailThrottle.blocked) {
          sendJson(response, 429, {
            error: getAuthThrottleMessage(Math.min(ipThrottle.resetAt, emailThrottle.resetAt)),
          });
          return;
        }

        const user = await getUserByEmail(email);

        if (user && !isUserActive(user)) {
          sendJson(response, 403, {
            error: 'Tu cuenta no esta activa. Contacta al administrador.',
          });
          return;
        }

        if (user && isUserLocked(user)) {
          sendJson(response, 423, {
            error: getLockMessage(user),
          });
          return;
        }

        if (!user || !verifyPassword(password, user.passwordHash || user.password_hash)) {
          let lockMessage = null;

          if (user) {
            const updatedUser = await markLoginFailure(
              user.id,
              MAX_FAILED_LOGIN_ATTEMPTS,
              ACCOUNT_LOCK_MINUTES
            );

            if (updatedUser && isUserLocked(updatedUser)) {
              lockMessage = getLockMessage(updatedUser);
            }
          }

          await recordAuthAudit({
            userId: user?.id,
            email,
            eventType: 'login_failed',
            ipAddress: clientIp,
            userAgent,
            details: {
              reason: user ? 'invalid_password' : 'unknown_email',
            },
          });

          sendJson(response, 401, {
            error: lockMessage || 'Email o password incorrectos.',
          });
          return;
        }

        await markLoginSuccess(user.id);
        await recordAuthAudit({
          userId: user.id,
          email,
          eventType: 'login_success',
          ipAddress: clientIp,
          userAgent,
        });
        clearRateLimit('login-email', email);
        sendJson(response, 200, issueAuthPayload(user));
        return;
      }

      if (pathname === '/api/auth/me' && request.method === 'GET') {
        const user = await authenticateRequest(request);

        if (!user) {
          sendJson(response, 401, {
            error: 'No autenticado.',
          });
          return;
        }

        if (!isUserActive(user)) {
          sendJson(response, 403, {
            error: 'Tu cuenta no esta activa.',
          });
          return;
        }

        sendJson(response, 200, {
          user: sanitizeUser(user),
        });
        return;
      }

      if (pathname === '/api/learner/dashboard' && request.method === 'GET') {
        const user = await authenticateRequest(request);

        if (!user) {
          sendJson(response, 401, {
            error: 'No autenticado.',
          });
          return;
        }

        if (!isUserActive(user)) {
          sendJson(response, 403, {
            error: 'Tu cuenta no esta activa.',
          });
          return;
        }

        if ((user.role || '').toLowerCase() !== 'student') {
          sendJson(response, 403, {
            error: 'Solo los estudiantes pueden ver este dashboard.',
          });
          return;
        }

        const dashboard = await buildLearnerDashboard(user.id);
        sendJson(response, 200, dashboard);
        return;
      }

      const exerciseMatch = pathname.match(/^\/api\/exercises\/([^/]+)\/evaluate$/);

      if (exerciseMatch && request.method === 'POST') {
        const user = await authenticateRequest(request);

        if (!user) {
          sendJson(response, 401, {
            error: 'No autenticado.',
          });
          return;
        }

        if (!isUserActive(user)) {
          sendJson(response, 403, {
            error: 'Tu cuenta no esta activa.',
          });
          return;
        }

        if ((user.role || '').toLowerCase() !== 'student') {
          sendJson(response, 403, {
            error: 'Solo los estudiantes pueden enviar ejercicios.',
          });
          return;
        }

        const body = await parseBody(request);
        const evaluation = await evaluateExerciseForUser(user.id, exerciseMatch[1], {
          code: body.code,
          selectedOptionId: body.selectedOptionId,
          answerText: body.answerText,
        });
        sendJson(response, 200, evaluation);
        return;
      }

      if (pathname === '/api/admin/dashboard' && request.method === 'GET') {
        const user = await authenticateRequest(request);

        if (!user) {
          sendJson(response, 401, {
            error: 'No autenticado.',
          });
          return;
        }

        if (!isUserActive(user)) {
          sendJson(response, 403, {
            error: 'Tu cuenta no esta activa.',
          });
          return;
        }

        if ((user.role || '').toLowerCase() !== 'admin') {
          sendJson(response, 403, {
            error: 'Solo el admin puede ver estas metricas.',
          });
          return;
        }

        const dashboard = await buildAdminDashboard(user.id);
        sendJson(response, 200, dashboard);
        return;
      }

      sendJson(response, 404, {
        error: 'Ruta no encontrada.',
        path: pathname,
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      });
    }
  });
}

function startServer(port = process.env.PORT || 3001) {
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`duocode api listening on http://localhost:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createAppServer,
  startServer,
};
