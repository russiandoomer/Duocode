const { fallbackLearningData } = require('../data/javascript-course');

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

const store = {
  users: cloneDeep(fallbackLearningData.users),
  topics: cloneDeep(fallbackLearningData.topics),
  progress: cloneDeep(fallbackLearningData.progress),
  attempts: cloneDeep(fallbackLearningData.attempts),
  authAudit: [],
};

let nextUserId = Math.max(...store.users.map((user) => user.id), 0) + 1;
let nextAttemptId = Math.max(...store.attempts.map((attempt) => attempt.id), 0) + 1;

function getUsers() {
  return store.users;
}

function getTopics() {
  return store.topics;
}

function getProgress() {
  return store.progress;
}

function getAttempts() {
  return store.attempts;
}

function addUser(user) {
  const nextUser = {
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    ...user,
    id: nextUserId++,
  };

  store.users.push(nextUser);
  return nextUser;
}

function addAttempt(attempt) {
  const nextAttempt = {
    ...attempt,
    id: nextAttemptId++,
  };

  store.attempts.push(nextAttempt);
  return nextAttempt;
}

function patchUser(userId, partialUpdate) {
  const index = store.users.findIndex((item) => Number(item.id) === Number(userId));

  if (index === -1) {
    return null;
  }

  store.users[index] = {
    ...store.users[index],
    ...partialUpdate,
  };

  return store.users[index];
}

function addAuthAudit(entry) {
  const nextEntry = {
    id: store.authAudit.length + 1,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  store.authAudit.push(nextEntry);
  return nextEntry;
}

function upsertProgress(progressRecord) {
  const index = store.progress.findIndex(
    (item) => item.userId === progressRecord.userId && item.exerciseId === progressRecord.exerciseId
  );

  if (index === -1) {
    store.progress.push(progressRecord);
    return progressRecord;
  }

  store.progress[index] = {
    ...store.progress[index],
    ...progressRecord,
  };

  return store.progress[index];
}

module.exports = {
  addAttempt,
  addAuthAudit,
  addUser,
  getAttempts,
  getProgress,
  getTopics,
  getUsers,
  patchUser,
  upsertProgress,
};
