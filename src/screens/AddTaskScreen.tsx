import React from 'react';
import { View, Text } from 'react-native';

// TODO(phase2): subtasks — add option to attach subtasks during creation

export function AddTaskScreen() {
  return (
    <View className="flex-1 bg-background px-lg pt-xl">
      <Text className="text-text text-xl font-bold">Brain Dump</Text>
      <Text className="text-text-muted text-md mt-sm">What's on your mind?</Text>
    </View>
  );
}
