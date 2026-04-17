const fallbackLearning = require('../data/duocode-learning.json');

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

const store = {
  users: cloneDeep(fallbackLearning.users),
  topics: cloneDeep(fallbackLearning.topics),
  progress: cloneDeep(fallbackLearning.progress),
  attempts: cloneDeep(fallbackLearning.attempts),
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
  addUser,
  getAttempts,
  getProgress,
  getTopics,
  getUsers,
  upsertProgress,
};
