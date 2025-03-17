// jest.config.js
module.exports = {
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/models/",
    "/src/repositories/",
    "/src/services/",
    "/src/middleware/",
    "/src/config/",
    "/src/utils/",
    "/src/routes/"
  ],
  // Only include controllers in coverage report
  collectCoverageFrom: [
    "src/controllers/**/*.js"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testEnvironment: "node",
  // Adding this to handle potential teardown issues
  testTimeout: 10000,
  forceExit: true
};