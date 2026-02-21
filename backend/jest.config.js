/**
 * Jest Configuration for Unit Tests
 * 
 * This configuration is for unit tests only. Integration tests use a separate
 * configuration (jest.integration.config.js) to avoid conflicts with database
 * setup and to allow parallel execution of unit tests.
 * 
 * For integration tests, use: npm run test:integration
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  // Exclude integration tests from unit test runs
  testPathIgnorePatterns: ['/integration/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**',
    '!src/__tests__/test-helpers.ts',
    '!src/__tests__/integration/**',
    '!src/__tests__/utils/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Standard timeout for unit tests
  testTimeout: 10000,
};
