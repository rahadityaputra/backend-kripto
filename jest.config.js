export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ['**/__tests__/**/*.test.ts'];
export const moduleNameMapper = {
    '^@/(.*)$': '<rootDir>/src/$1',
};
export const setupFilesAfterEnv = ['<rootDir>/src/__tests__/setup.ts'];
export const verbose = true;
export const forceExit = true;
export const clearMocks = true;
export const resetMocks = true;
export const restoreMocks = true;