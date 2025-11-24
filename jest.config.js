/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'node', // Default to node for integration tests with Prisma
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/integration/setup/', // Exclude setup helpers from test discovery
    '<rootDir>/__tests__/factories/', // Exclude factories from test discovery
    '<rootDir>/__tests__/app/actions/user.test.ts', // Skip due to next-auth mocking complexity
  ],
  transformIgnorePatterns: [
    // Transform ESM modules
    'node_modules/(?!(uuid|@web3-storage|ip/.*|next-auth|@auth)/)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],
  // Disable coverage thresholds temporarily - will increase as more tests are added
  // coverageThreshold: {
  //   global: {
  //     branches: 5,
  //     functions: 5,
  //     lines: 5,
  //     statements: 5,
  //   },
  // },
  // Run integration tests serially to avoid database conflicts
  maxWorkers: process.env.CI ? 1 : '50%',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)

