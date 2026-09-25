const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const defaults = getDefaultConfig(__dirname);
const generatedFolders = ['artifacts', '.tools', 'server/.wrangler', 'server/dist', 'android/.gradle', 'android/build', 'android/app/build', 'ios/build'];
const pathPattern = value => value.split(/[/\\]/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[/\\\\]');
// Metro's Windows watcher normalizes paths to '/', while the crawler can use '\\'.
const generatedPaths = generatedFolders.map(folder => new RegExp('^(?:' + pathPattern(__dirname) + '[/\\\\])?' + pathPattern(folder) + '(?:[/\\\\]|$)'));
generatedPaths.push(/(?:^|[/\\])\.wrangler(?:[/\\]|$)/);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    platforms: ['ios', 'android'],
    // QA screenshots, database writes and build output must not invalidate Metro.
    blockList: [...[defaults.resolver.blockList ?? []].flat(), ...generatedPaths],
  },
  // Changing a public URL must invalidate Metro's persisted transform cache.
  cacheVersion: JSON.stringify(require('./scripts/public-config.cjs')()),
};

module.exports = mergeConfig(defaults, config);
