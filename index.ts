// Polyfill import.meta for web (zustand devtools uses import.meta.env)
if (typeof (globalThis as any).__ExpoImportMetaRegistry === 'undefined') {
  (globalThis as any).__ExpoImportMetaRegistry = {};
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
