module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
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
  // Integration tests need longer timeouts
  testTimeout: 30000,
  // Setup files for integration tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/jest-setup.ts'],
  // Global setup/teardown for integration tests
  globalSetup: '<rootDir>/src/__tests__/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/integration/global-teardown.ts',
};
