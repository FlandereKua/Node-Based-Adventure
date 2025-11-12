export default {
  roots: ['<rootDir>/src'],
  testEnvironment: 'happy-dom',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: '<rootDir>/babel.config.mjs' }]
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@engine/(.*)$': '<rootDir>/../../src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testRegex: '.*\\.test\\.(ts|tsx)$'
};
