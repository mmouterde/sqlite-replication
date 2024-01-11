import type { Config } from 'jest';

const config: Config = {
    moduleNameMapper: {
        '^boot/(.*)': '<rootDir>/src/boot/$1',
    },
};

export default config;
