import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useTodayTasks } from '../hooks/useTodayTasks';
import { updateTaskStatus } from '../db/actions';
import { useStreak } from '../hooks/useStreak';
import { RootStackParamList } from '../navigation';
import { colors, spacing, radius } from '../theme/tokens';
import { useSettingsStore } from '../store/useSettingsStore';
import { Task } from '../db/models/Task';

// TODO(phase2): subtasks — render children tasks here when a task is expanded
// TODO(phase2): sound — play ambient sound when focus session starts

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const SWIPE_THRESHOLD = 100;

// ─── Swipeable task card ──────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task;
  onDone: () => void;
  onSkip: () => void;
  onStartFocus: () => void;
  onQuickStart: () => void;
}

function TaskCard({ task, onDone, onSkip, onStartFocus, onQuickStart }: TaskCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const dismiss = useCallback(
    (direction: 'right' | 'left', callback: () => void) => {
      Animated.parallel([
        Animated.timing(pan, {
          toValue: { x: direction === 'right' ? 500 : -500, y: 0 },
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => callback());
    },
    [pan, opacity]
  );

  const resetCard = useCallback(() => {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 60,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          dismiss('right', onDone);
        } else if (g.dx < -SWIPE_THRESHOLD) {
          dismiss('left', onSkip);
        } else {
          resetCard();
        }
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  });
  const doneOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.cardArea}>
      {/* Hint labels */}
      <View style={styles.hintRow}>
        <Animated.Text style={[styles.hintSkip, { opacity: skipOpacity }]}>← skip</Animated.Text>
        <Animated.Text style={[styles.hintDone, { opacity: doneOpacity }]}>done ✓</Animated.Text>
      </View>

      {/* Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.card, { opacity, transform: [{ translateX: pan.x }, { rotate }] }]}
      >
        <Text style={styles.cardTitle}>{task.title}</Text>
        {task.notes ? (
          <Text style={styles.cardNotes} numberOfLines={3}>{task.notes}</Text>
        ) : null}
        {task.estimatedMinutes ? (
          <Text style={styles.cardMeta}>⏱ {task.estimatedMinutes} min</Text>
        ) : null}
      </Animated.View>

      {/* Action buttons */}
      <TouchableOpacity style={styles.focusBtn} onPress={onStartFocus} activeOpacity={0.85}>
        <Text style={styles.focusBtnText}>Start Focus</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickStartBtn} onPress={onQuickStart} activeOpacity={0.85}>
        <Text style={styles.quickStartText}>⚡ Just start for 2 minutes</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Today Screen ─────────────────────────────────────────────────────────────
export function TodayScreen() {
  const tasks = useTodayTasks();
  const navigation = useNavigation<NavProp>();
  const { workDuration } = useSettingsStore();
  const { streak, todayCount } = useStreak();

  const task = tasks[0] ?? null;
  const remaining = tasks.length;

  const handleDone = useCallback(async () => {
    if (!task) return;
    await updateTaskStatus(task, 'done');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [task]);

  const handleSkip = useCallback(async () => {
    if (!task) return;
    await updateTaskStatus(task, 'backlog');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [task]);

  const handleStartFocus = useCallback(() => {
    if (!task) return;
    navigation.navigate('FocusTimer', {
      taskId: task.id,
      taskTitle: task.title,
      plannedMinutes: task.estimatedMinutes ?? workDuration,
    });
  }, [task, workDuration, navigation]);

  const handleQuickStart = useCallback(() => {
    if (!task) return;
    navigation.navigate('FocusTimer', {
      taskId: task.id,
      taskTitle: task.title,
      plannedMinutes: 2,
    });
  }, [task, navigation]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>tADiHD</Text>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          )}
          {remaining > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{remaining} today</Text>
            </View>
          )}
        </View>
      </View>

      {/* Daily summary strip */}
      {todayCount > 0 && (
        <View style={styles.summaryStrip}>
          <Text style={styles.summaryText}>
            {todayCount === 1 ? 'You finished 1 task today' : `You finished ${todayCount} tasks today`} ✨
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {task ? (
          <TaskCard
            key={task.id}
            task={task}
            onDone={handleDone}
            onSkip={handleSkip}
            onStartFocus={handleStartFocus}
            onQuickStart={handleQuickStart}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptyBody}>
              {todayCount > 0
                ? `You finished ${todayCount} task${todayCount > 1 ? 's' : ''} today. Great work.`
                : "You're on top of things. Add a task when you're ready."}
            </Text>
          </View>
        )}
      </View>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddTask')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  appName: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerRight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 13, fontWeight: '500', color: colors.primaryDark },
  summaryStrip: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: { fontSize: 14, fontWeight: '500', color: colors.primaryDark },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  cardArea: { width: '100%' },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  hintSkip: { fontSize: 13, color: colors.textMuted },
  hintDone: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 32, fontWeight: '700', color: colors.text, lineHeight: 40, marginBottom: spacing.sm },
  cardNotes: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.md },
  cardMeta: { fontSize: 14, color: colors.textMuted },
  focusBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  focusBtnText: { fontSize: 18, fontWeight: '700', color: colors.text },
  quickStartBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  quickStartText: { fontSize: 15, fontWeight: '500', color: colors.textMuted },
  emptyState: { alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  fabContainer: { paddingBottom: spacing.lg, paddingRight: spacing.lg, alignItems: 'flex-end' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { fontSize: 32, color: colors.surface, lineHeight: 36, marginTop: -2 },
});
