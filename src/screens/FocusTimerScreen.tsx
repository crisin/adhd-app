import React from 'react';
import { View, Text } from 'react-native';

// Timer bar color logic (applied via tokens):
// > 50% remaining  → colors.timerHigh (primary green)
// 25–50% remaining → colors.timerMid  (accent amber)
// < 25% remaining  → colors.timerLow  (danger red)

// TODO(phase2): sound — play transition warning chime at T-3min
// TODO(phase2): sound — play completion chime here when timer hits zero

export function FocusTimerScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-lg">
      <Text className="text-text text-xl font-bold">Focus Timer</Text>
      {/* Timer bar placeholder */}
      <View className="w-full h-4 bg-surface-muted rounded-full mt-lg overflow-hidden">
        <View className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
      </View>
    </View>
  );
}
