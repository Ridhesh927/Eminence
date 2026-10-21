const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add WASM to asset extensions so Metro can bundle it for expo-sqlite web
config.resolver.assetExts.push('wasm');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets') {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, 'node_modules/react-native-worklets/lib/module/index.js'),
      platform
    );
  }
  if (moduleName.startsWith('@expo/ui') || moduleName.includes('jetpack-compose')) {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, 'src/shims/expo-ui-shim.js'),
      platform
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
