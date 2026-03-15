import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './src/db';
import { RootNavigator } from './src/navigation';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider database={database}>
        <ThemeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ThemeProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
