import React from 'react';
import { View, Text } from 'react-native';

// TODO(phase2): subtasks — show subtask count badge on each task row

export function BacklogScreen() {
  return (
    <View className="flex-1 bg-background px-lg pt-xl">
      <Text className="text-text text-xl font-bold">Backlog</Text>
      <Text className="text-text-muted text-md mt-sm">Tasks waiting for later.</Text>
    </View>
  );
}
