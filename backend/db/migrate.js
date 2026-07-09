const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !statement.startsWith('--'));
}

function getSection(sql, marker, nextMarker) {
  const start = sql.indexOf(marker);
  if (start === -1) return '';
  const end = nextMarker ? sql.indexOf(nextMarker, start + marker.length) : -1;
  return sql.slice(start + marker.length, end === -1 ? undefined : end).trim();
}

async function ensureMigrationTable(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS _migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function getExecuted(conn) {
  await ensureMigrationTable(conn);
  const [rows] = await conn.query('SELECT name, executed_at FROM _migrations ORDER BY name');
  return rows;
}

async function runStatements(conn, sql) {
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    await conn.query(statement);
  }
}

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await ensureMigrationTable(conn);
    const executedRows = await getExecuted(conn);
    const executed = new Set(executedRows.map((row) => row.name));
    const files = listMigrationFiles();

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`skip ${file}`);
        continue;
      }

      const fullPath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const upSql = getSection(content, '-- UP', '-- DOWN');
      if (!upSql) throw new Error(`Migration ${file} has no -- UP section`);

      await conn.beginTransaction();
      try {
        await runStatements(conn, upSql);
        await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
        await conn.commit();
        console.log(`executed ${file}`);
      } catch (error) {
        await conn.rollback();
        throw error;
      }
    }
  } finally {
    conn.release();
  }
}

async function status() {
  const conn = await pool.getConnection();
  try {
    const executedRows = await getExecuted(conn);
    const executed = new Map(executedRows.map((row) => [row.name, row.executed_at]));
    const files = listMigrationFiles();
    return files.map((file) => ({
      name: file,
      status: executed.has(file) ? 'executed' : 'pending',
      executed_at: executed.get(file) || null
    }));
  } finally {
    conn.release();
  }
}

async function rollback() {
  const conn = await pool.getConnection();
  try {
    await ensureMigrationTable(conn);
    const [rows] = await conn.query('SELECT name FROM _migrations ORDER BY name DESC LIMIT 1');
    if (rows.length === 0) {
      console.log('no migrations to rollback');
      return;
    }

    const file = rows[0].name;
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const downSql = getSection(content, '-- DOWN');
    if (!downSql) throw new Error(`Migration ${file} has no -- DOWN section`);

    await conn.beginTransaction();
    try {
      await runStatements(conn, downSql);
      await conn.query('DELETE FROM _migrations WHERE name = ?', [file]);
      await conn.commit();
      console.log(`rolled back ${file}`);
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } finally {
    conn.release();
  }
}

async function main() {
  const command = process.argv[2] || 'migrate';
  if (command === 'migrate') {
    await migrate();
  } else if (command === 'status') {
    const rows = await status();
    for (const row of rows) {
      console.log(`${row.name}\t${row.status}${row.executed_at ? `\t${row.executed_at.toISOString()}` : ''}`);
    }
  } else if (command === 'rollback') {
    await rollback();
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
}

if (require.main === module) {
  main()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { migrate, rollback, status };