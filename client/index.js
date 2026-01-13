import { registerRootComponent } from "expo";
import { LogBox, Platform } from "react-native";

// CRITICAL: Suppress update errors BEFORE anything else loads
LogBox.ignoreLogs([
  'Failed to download remote update',
  'java.io.IOException',
  'Network request failed',
  'Updates',
  'failed to download',
  'IOException',
]);

// Wrap entire app startup to catch native errors
if (typeof global !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('Failed to download') || 
        message.includes('IOException') ||
        message.includes('Updates')) {
      return;
    }
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('Failed to download') || 
        message.includes('IOException') ||
        message.includes('Updates')) {
      return;
    }
    originalError(...args);
  };
}

import App from "@/App";

// Additional suppression for mobile platforms
if (Platform.OS !== 'web') {
  // Catch unhandled promise rejections
  if (global.onunhandledrejection) {
    global.onunhandledrejection = (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('Failed to download remote update') ||
          errorMessage.includes('IOException')) {
        event.preventDefault();
        return;
      }
    };
  }
}

registerRootComponent(App);
