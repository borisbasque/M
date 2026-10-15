const fs = require('fs');

// The tsconfig.aliases.json uses JSONC (JSON with comments) — strip line comments before parsing.
const aliasesRaw = fs.readFileSync('./tsconfig.aliases.json', 'utf-8').replace(/\/\/[^\n]*/g, '');
const {compilerOptions} = JSON.parse(aliasesRaw);

// Convert TypeScript path aliases to Jest moduleNameMapper format.
const moduleNameMapper = Object.fromEntries(
    Object.entries(compilerOptions.paths).map(([key, [value]]) => [
        `^${key.replace('/*', '/(.*)$')}`,
        `<rootDir>/${value.replace('/*', '/$1')}`,
    ]),
);

/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    clearMocks: true,
    testMatch: ['**/esm/tests/**/*.test.{ts,tsx}'],
    moduleNameMapper: {
        ...moduleNameMapper,
        // The design system ships ES modules only, so tests that use the real components load its build.
        '^@moodlehq/design-system$': '<rootDir>/node_modules/@moodlehq/design-system/dist/index.js',
    },
    transformIgnorePatterns: ['/node_modules/(?!@moodlehq/design-system/)'],
    transform: {
        '^.+/node_modules/@moodlehq/design-system/.+\\.js$': ['ts-jest', {
            tsconfig: {allowJs: true, module: 'commonjs', jsx: 'react-jsx', esModuleInterop: true},
            isolatedModules: true,
        }],
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: './tsconfig.jest.json',
        }],
    },
    setupFiles: [
        '<rootDir>/.jest/globalM.ts',
    ],
    setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/.jest/globalSetup.ts',
        '<rootDir>/.jest/mockRedirect.ts',
    ],
    collectCoverageFrom: [
        '**/esm/src/**/*.{ts,tsx}',
        '!**/*.d.ts',
    ],
};
