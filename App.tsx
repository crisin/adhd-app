import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './src/db';
import { TodayScreen } from './src/screens/TodayScreen';

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <StatusBar style="dark" />
      {/* Entry point — TodayScreen is the home screen */}
      <TodayScreen />
    </DatabaseProvider>
  );
}
