const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '../shared')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
