const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias WatermelonDB imports to our REST-backed shim so screens that
// call useDatabase() / Q continue to work without modification.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@nozbe/watermelondb': path.resolve(__dirname, 'src/db/watermelon-shim.ts'),
  '@nozbe/watermelondb/react': path.resolve(__dirname, 'src/db/watermelon-shim.ts'),
};

module.exports = config;
