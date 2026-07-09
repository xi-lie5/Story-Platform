const migrations = require('../db/migrate');

describe('migration module', () => {
  it('exports the migration commands used by CLI and server integration', () => {
    expect(typeof migrations.migrate).toBe('function');
    expect(typeof migrations.rollback).toBe('function');
    expect(typeof migrations.status).toBe('function');
  });
});