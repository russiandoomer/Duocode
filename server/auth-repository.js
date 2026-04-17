const { queryRows, hasMysqlConfig } = require('./mysql');
const fallbackStore = require('./fallback-store');
const { hashPassword } = require('./passwords');

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
  if (hasMysqlConfig()) {
    const rows = await queryRows('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }

  return fallbackStore.getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
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
  const defaults = {
    role: 'student',
    track: 'Frontend Engineer Path',
    focus: 'Empieza por JavaScript foundations y avanza por retos escritos.',
    dailyGoalMinutes: 30,
  };

  if (hasMysqlConfig()) {
    await queryRows(
      'INSERT INTO users (name, email, password_hash, role, track_label, focus_text, daily_goal_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, defaults.role, defaults.track, defaults.focus, defaults.dailyGoalMinutes]
    );

    return await getUserByEmail(email);
  }

  return fallbackStore.addUser({
    name,
    email,
    passwordHash,
    role: defaults.role,
    track: defaults.track,
    focus: defaults.focus,
    dailyGoalMinutes: defaults.dailyGoalMinutes,
    createdAt: new Date().toISOString(),
  });
}

module.exports = {
  createUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  sanitizeUser,
};
