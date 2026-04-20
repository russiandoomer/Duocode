const { queryRows, hasMysqlConfig } = require('./mysql');
const fallbackStore = require('./fallback-store');
const { hashPassword } = require('./passwords');

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    track: user.track || user.track_label,
    focus: user.focus || user.focus_text,
    dailyGoalMinutes: Number(user.dailyGoalMinutes ?? user.daily_goal_minutes ?? 0),
    createdAt: user.createdAt || user.created_at,
  };
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (hasMysqlConfig()) {
    const rows = await queryRows('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    return rows[0] || null;
  }

  return fallbackStore.getUsers().find((user) => user.email.toLowerCase() === normalizedEmail) || null;
}

async function getUserById(id) {
  if (hasMysqlConfig()) {
    const rows = await queryRows('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  return fallbackStore.getUsers().find((user) => Number(user.id) === Number(id)) || null;
}

async function getAllUsers() {
  if (hasMysqlConfig()) {
    return await queryRows('SELECT * FROM users ORDER BY created_at ASC');
  }

  return fallbackStore.getUsers();
}

async function createUser({ name, email, password }) {
  const passwordHash = hashPassword(password);
  const normalizedEmail = normalizeEmail(email);
  const defaults = {
    role: 'student',
    track: 'Frontend Engineer Path',
    focus: 'Empieza por JavaScript foundations y avanza por retos escritos.',
    dailyGoalMinutes: 30,
  };

  if (hasMysqlConfig()) {
    await queryRows(
      'INSERT INTO users (name, email, password_hash, role, track_label, focus_text, daily_goal_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, normalizedEmail, passwordHash, defaults.role, defaults.track, defaults.focus, defaults.dailyGoalMinutes]
    );

    return await getUserByEmail(normalizedEmail);
  }

  return fallbackStore.addUser({
    name,
    email: normalizedEmail,
    passwordHash,
    role: defaults.role,
    track: defaults.track,
    focus: defaults.focus,
    dailyGoalMinutes: defaults.dailyGoalMinutes,
    createdAt: new Date().toISOString(),
  });
}

async function markLoginFailure(userId, maxAttempts, lockMinutes) {
  if (hasMysqlConfig()) {
    try {
      await queryRows(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = IF(failed_login_attempts + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), locked_until)
         WHERE id = ?`,
        [maxAttempts, lockMinutes, userId]
      );

      return await getUserById(userId);
    } catch {
      return await getUserById(userId);
    }
  }

  const currentUser = await getUserById(userId);

  if (!currentUser) {
    return null;
  }

  const failedLoginAttempts = Number(currentUser.failedLoginAttempts || 0) + 1;
  const lockedUntil =
    failedLoginAttempts >= maxAttempts
      ? new Date(Date.now() + lockMinutes * 60 * 1000).toISOString()
      : currentUser.lockedUntil || null;

  return fallbackStore.patchUser(userId, {
    failedLoginAttempts,
    lockedUntil,
  });
}

async function markLoginSuccess(userId) {
  if (hasMysqlConfig()) {
    try {
      await queryRows(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = NOW()
         WHERE id = ?`,
        [userId]
      );
    } catch {
      return await getUserById(userId);
    }

    return await getUserById(userId);
  }

  return fallbackStore.patchUser(userId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
  });
}

async function recordAuthAudit({ userId = null, email = '', eventType, ipAddress = '', userAgent = '', details = {} }) {
  const normalizedEmail = normalizeEmail(email);

  if (hasMysqlConfig()) {
    try {
      await queryRows(
        'INSERT INTO auth_audit_log (user_id, email, event_type, ip_address, user_agent, details_json) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, normalizedEmail, eventType, ipAddress, userAgent.slice(0, 255), JSON.stringify(details)]
      );
    } catch {
      return;
    }

    return;
  }

  fallbackStore.addAuthAudit({
    userId,
    email: normalizedEmail,
    eventType,
    ipAddress,
    userAgent,
    details,
  });
}

module.exports = {
  createUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  markLoginFailure,
  markLoginSuccess,
  normalizeEmail,
  recordAuthAudit,
  sanitizeUser,
};
