/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  // The integration suites (src/__tests__/{assignments,recurring,templates,points,users}.test.ts,
  // src/routes/__tests__/*) share one real SQLite dev.db. Parallel workers race on the same file
  // (SQLITE_BUSY / unique-constraint violations in generateOccurrences), so the suite must be serial.
  maxWorkers: 1,
};
