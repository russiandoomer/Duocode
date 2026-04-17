const mysql = require('mysql2/promise');

let pool = null;

function readMysqlConfig() {
  const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST;
  const port = Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306);
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER;
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;

  if (!host || !database || !user) {
    return null;
  }

  return {
    host,
    port,
    database,
    user,
    password: password || '',
    waitForConnections: true,
    connectionLimit: 10,
  };
}

function hasMysqlConfig() {
  return Boolean(readMysqlConfig());
}

function getMysqlPool() {
  const config = readMysqlConfig();

  if (!config) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool(config);
  }

  return pool;
}

async function queryRows(sql, params = []) {
  const activePool = getMysqlPool();

  if (!activePool) {
    throw new Error('MySQL config not found');
  }

  const [rows] = await activePool.execute(sql, params);
  return rows;
}

async function pingMysql() {
  const activePool = getMysqlPool();

  if (!activePool) {
    return false;
  }

  await activePool.query('SELECT 1');
  return true;
}

module.exports = {
  hasMysqlConfig,
  getMysqlPool,
  queryRows,
  pingMysql,
};
