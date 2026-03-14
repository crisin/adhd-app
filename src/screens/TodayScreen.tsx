import React from 'react';
import { View, Text } from 'react-native';

// TODO(phase2): subtasks — render children tasks here when a task is expanded
// TODO(phase2): sound — play ambient sound when focus session starts

export function TodayScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-lg">
      <Text className="text-text text-xl font-bold">Today</Text>
      <Text className="text-text-muted text-md mt-sm">Your focus task will appear here.</Text>
    </View>
  );
}
