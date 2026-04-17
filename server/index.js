const http = require('http');
const { URL } = require('url');

const { createUser, getUserByEmail, getUserById, sanitizeUser } = require('./auth-repository');
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
  return typeof value === 'string' && value.includes('@') && value.includes('.');
}

function validatePassword(value) {
  return typeof value === 'string' && value.length >= 8;
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
        const body = await parseBody(request);
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (name.length < 3 || !validateEmail(email) || !validatePassword(password)) {
          sendJson(response, 400, {
            error: 'Datos invalidos. Revisa nombre, email y password.',
          });
          return;
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
          sendJson(response, 409, {
            error: 'Ese email ya esta registrado.',
          });
          return;
        }

        const createdUser = await createUser({ name, email, password });
        sendJson(response, 201, issueAuthPayload(createdUser));
        return;
      }

      if (pathname === '/api/auth/login' && request.method === 'POST') {
        const body = await parseBody(request);
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        const user = await getUserByEmail(email);

        if (!user || !verifyPassword(password, user.passwordHash || user.password_hash)) {
          sendJson(response, 401, {
            error: 'Email o password incorrectos.',
          });
          return;
        }

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

        if ((user.role || '').toLowerCase() !== 'student') {
          sendJson(response, 403, {
            error: 'Solo los estudiantes pueden enviar ejercicios.',
          });
          return;
        }

        const body = await parseBody(request);
        const submittedCode = String(body.code || '');

        if (submittedCode.trim().length === 0) {
          sendJson(response, 400, {
            error: 'Debes escribir codigo antes de evaluar.',
          });
          return;
        }

        const evaluation = await evaluateExerciseForUser(user.id, exerciseMatch[1], submittedCode);
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
