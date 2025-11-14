module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: '../coverage',
  collectCoverageFrom: ['../routes/**/*.js', '../models/**/*.js', '../middleware/**/*.js', '../utils/**/*.js'],
  moduleFileExtensions: ['js', 'json'],
  setupFilesAfterEnv: ['../tests/setupTests.js'],
  testTimeout: 30000,
  verbose: true
};