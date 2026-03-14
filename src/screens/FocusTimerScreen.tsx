import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useDatabase } from '@nozbe/watermelondb/react';
import { startFocusSession, endFocusSession } from '../db/actions';
import { Task } from '../db/models/Task';
import { FocusSession } from '../db/models/FocusSession';
import { RootStackParamList } from '../navigation';
import { colors, spacing, radius } from '../theme/tokens';
import { useSettingsStore } from '../store/useSettingsStore';

// TODO(phase2): sound — play transition warning chime at T-3min
// TODO(phase2): sound — play completion chime here when timer hits zero

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'FocusTimer'>;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function barColor(progress: number): string {
  if (progress > 0.5) return colors.timerHigh;
  if (progress > 0.25) return colors.timerMid;
  return colors.timerLow;
}

export function FocusTimerScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { taskId, taskTitle, plannedMinutes } = route.params;
  const db = useDatabase();
  const { transitionWarning } = useSettingsStore();

  const totalSeconds = useRef(plannedMinutes * 60).current;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [barContainerWidth, setBarContainerWidth] = useState(0);

  const taskRef = useRef<Task | null>(null);
  const sessionRef = useRef<FocusSession | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);

  // Animated bar width
  const progressAnim = useRef(new Animated.Value(1)).current;
  // Celebration scale
  const celebScale = useRef(new Animated.Value(0)).current;

  // Setup: fetch task, create session, start timer
  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      const t = await db.get<Task>('tasks').find(taskId);
      const s = await startFocusSession(t, plannedMinutes);
      if (mounted) {
        taskRef.current = t;
        sessionRef.current = s;
        setIsRunning(true);
      }
    };
    setup();
    return () => { mounted = false; };
  }, []);

  // Countdown
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isPaused]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: secondsLeft / totalSeconds,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft]);

  // Transition warning + completion
  useEffect(() => {
    const warningSeconds = transitionWarning * 60;
    if (!warningFiredRef.current && secondsLeft === warningSeconds && secondsLeft > 0) {
      warningFiredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // TODO(phase2): sound — play transition warning chime
    }
    if (secondsLeft === 0 && isRunning) {
      handleComplete();
    }
  }, [secondsLeft]);

  const handleComplete = useCallback(async () => {
    const t = taskRef.current;
    const s = sessionRef.current;
    if (!t || !s) return;
    await endFocusSession(s, t, true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO(phase2): sound — play completion chime here
    setShowCelebration(true);
    Animated.spring(celebScale, { toValue: 1, tension: 40, friction: 6, useNativeDriver: true }).start();
    setTimeout(() => navigation.goBack(), 3000);
  }, []);

  const handlePauseResume = useCallback(() => {
    setIsPaused((p) => !p);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEndEarly = useCallback(() => {
    setIsPaused(true);
    setShowEndConfirm(true);
  }, []);

  const confirmEndEarly = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const t = taskRef.current;
    const s = sessionRef.current;
    if (t && s) await endFocusSession(s, t, false);
    navigation.goBack();
  }, []);

  const animatedBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barContainerWidth],
  });
  const progress = secondsLeft / totalSeconds;
  const currentBarColor = barColor(progress);

  return (
    <SafeAreaView style={styles.root}>
      {/* Task title */}
      <View style={styles.titleArea}>
        <Text style={styles.taskTitle} numberOfLines={3}>{taskTitle}</Text>
        <Text style={styles.sessionLabel}>Focus session</Text>
      </View>

      {/* Timer bar */}
      <View style={styles.barSection}>
        <View
          style={styles.barTrack}
          onLayout={(e) => setBarContainerWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[styles.barFill, { width: animatedBarWidth, backgroundColor: currentBarColor }]}
          />
        </View>
        <Text style={[styles.countdown, { color: currentBarColor }]}>{formatTime(secondsLeft)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseResume} activeOpacity={0.85}>
          <Text style={styles.pauseBtnText}>{isPaused ? '▶  Resume' : '⏸  Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndEarly} activeOpacity={0.85}>
          <Text style={styles.endBtnText}>End early</Text>
        </TouchableOpacity>
      </View>

      {/* End early confirmation */}
      {showEndConfirm && (
        <View style={StyleSheet.absoluteFill as object}>
          <View style={styles.celebBg} />
          <View style={styles.celebContent}>
            <Text style={styles.confirmTitle}>End session?</Text>
            <Text style={styles.confirmBody}>The task will stay on your Today list.</Text>
            <TouchableOpacity style={styles.confirmEndBtn} onPress={confirmEndEarly} activeOpacity={0.85}>
              <Text style={styles.confirmEndText}>End session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmKeepBtn}
              onPress={() => { setShowEndConfirm(false); setIsPaused(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmKeepText}>Keep going</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <View style={StyleSheet.absoluteFill as object}>
          <View style={styles.celebBg} />
          <View style={styles.celebContent}>
            <Animated.Text style={[styles.celebEmoji, { transform: [{ scale: celebScale }] }]}>
              🎉
            </Animated.Text>
            <Text style={styles.celebTitle}>Nailed it!</Text>
            <Text style={styles.celebSub}>{taskTitle}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  taskTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 42,
    marginBottom: spacing.sm,
  },
  sessionLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  barSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  barTrack: {
    height: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pauseBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pauseBtnText: { fontSize: 17, fontWeight: '700', color: colors.text },
  endBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endBtnText: { fontSize: 17, fontWeight: '600', color: colors.textMuted },
  celebBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.97,
  },
  celebContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  celebEmoji: { fontSize: 96, marginBottom: spacing.lg },
  celebTitle: { fontSize: 36, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  celebSub: { fontSize: 18, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  confirmTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  confirmBody: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  confirmEndBtn: {
    width: '100%',
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  confirmEndText: { fontSize: 17, fontWeight: '700', color: colors.surface },
  confirmKeepBtn: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmKeepText: { fontSize: 17, fontWeight: '600', color: colors.text },
});
