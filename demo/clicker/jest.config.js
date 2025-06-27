'use strict';

const config = {
    preset: "ts-jest",
    transform: {
        "^.+\\.tsx?$": "ts-jest",
        "\\.js$": [
            "babel-jest",
            { "extends": "./babel.config.cjs", "excludeJestPreset": true }
        ],
    },

    // Указываем среду выполнения - Node.js
    testEnvironment: 'node',

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    testMatch: [
        // '<rootDir>/src/**/*.test.{ts,tsx}',
        '<rootDir>/tests/**/*.test.{ts,tsx}',
    ],

    testPathIgnorePatterns: [ '/node_modules/', '/dist/' ],

    // Настройки coverage через V8 (нативный инструмент Node.js)
    collectCoverage: false,
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [ 'src/**/*.{ts,tsx}', '!src/**/*.d.ts' ],
    coverageProvider: 'v8',

    // Опции для модуля преобразования
    transformIgnorePatterns: [
        '/node_modules/',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    moduleDirectories: [ 'node_modules', '<rootDir>' ],

    verbose: true,

    // // Дополнительные настройки для TypeScript
    // globals: {
    //     'tsx': {
    //         // Можно добавить специфичные для tsx опции здесь
    //         // Например, использовать определенный tsconfig
    //         tsconfig: '<rootDir>/tsconfig.json'
    //     },
    // },
};

export default config;
