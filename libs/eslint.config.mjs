import nx from '@nx/eslint-plugin';
import rootConfig from '../eslint.config.mjs';

// Use relevant configurations from root config
const baseConfigs = rootConfig.filter(
  (config) => !config.rules || !config.rules['@nx/enforce-module-boundaries']
);

// We'll use the nx configs directly instead of the filtered baseConfigs for simplicity

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
