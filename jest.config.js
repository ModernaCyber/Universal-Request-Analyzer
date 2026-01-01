module.exports = {
  testEnvironment: "jsdom",
  
  // Use new top-level test directory
  testMatch: [
    "<rootDir>/test/**/*.test.js",
    "<rootDir>/src/tests/**/*.test.js", // Keep old tests during migration
  ],
  
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/test/mocks/styleMock.js",
    "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/test/mocks/fileMock.js",
  },
  
  setupFilesAfterEnv: ["<rootDir>/test/setupTests.js"],
  
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  
  transformIgnorePatterns: ["/node_modules/(?!(chart\\.js|sql\\.js|msw)/)"],
  
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/tests/**",
    "!test/**",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!**/dist/**",
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
  
  moduleDirectories: ["node_modules", "src"],
  
  // Verbose output for better debugging
  verbose: true,
  
  // Timeout for async tests
  testTimeout: 10000,
};
