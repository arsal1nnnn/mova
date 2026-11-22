// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const path = require('path');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@/assets', path.resolve(__dirname, './assets')],
            ['@', path.resolve(__dirname, './src')],
          ],
          extensions: ['.js', '.jsx', '.json'],
        },
      },
    },
  },
]);
