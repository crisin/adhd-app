import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTodayTasks } from '../hooks/useTodayTasks';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { updateTaskStatus } from '../db/actions';
import { useStreak } from '../hooks/useStreak';
import { RootStackParamList } from '../navigation';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { useSettingsStore, CalendarSourceKey, CALENDAR_SOURCE_LABELS } from '../store/useSettingsStore';
import { Task } from '../db/models/Task';
import { CalendarEvent } from '../db/models/CalendarEvent';
import { getCategoryMeta } from '../theme/categories';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const SWIPE_THRESHOLD = 100;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function relativeDay(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return `${WEEKDAY_NAMES[date.getDay()]}, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

// ─── Swipeable focus card (top task) ─────────────────────────────────────────

interface FocusCardProps {
  task: Task;
  onDone: () => void;
  onSkip: () => void;
  onStartFocus: () => void;
  onQuickStart: () => void;
}

function FocusCard({ task, onDone, onSkip, onStartFocus, onQuickStart }: FocusCardProps) {
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

  const cat = getCategoryMeta(task.category);

  return (
    <View style={styles.focusArea}>
      <View style={styles.hintRow}>
        <Animated.Text style={[styles.hintSkip, { opacity: skipOpacity }]}>← skip</Animated.Text>
        <Animated.Text style={[styles.hintDone, { opacity: doneOpacity }]}>done ✓</Animated.Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.focusCard, { opacity, transform: [{ translateX: pan.x }, { rotate }] }]}
      >
        <Text style={styles.focusCardTitle}>{task.title}</Text>
        {task.notes ? (
          <Text style={styles.focusCardNotes} numberOfLines={3}>{task.notes}</Text>
        ) : null}
        <View style={styles.focusCardMeta}>
          {task.estimatedMinutes ? (
            <Text style={styles.metaChip}>⏱ {task.estimatedMinutes}m</Text>
          ) : null}
          {cat ? (
            <Text style={[styles.metaChip, { color: cat.color }]}>{cat.emoji} {cat.label}</Text>
          ) : null}
          {(task.priority === 'high' || task.priority === 'low') ? (
            <Text style={[styles.metaChip, { color: task.priority === 'high' ? colors.danger : colors.textMuted }]}>
              {task.priority === 'high' ? '⬆ High' : '⬇ Low'}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.focusBtn} onPress={onStartFocus} activeOpacity={0.85}>
        <Text style={styles.focusBtnText}>Start Focus</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickStartBtn} onPress={onQuickStart} activeOpacity={0.85}>
        <Text style={styles.quickStartText}>⚡ Just start for 2 minutes</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Task row (for list below) ───────────────────────────────────────────────

function TaskRow({ task, onDone, onFocus }: { task: Task; onDone: () => void; onFocus: () => void }) {
  const cat = getCategoryMeta(task.category);
  return (
    <View style={styles.taskRow}>
      <TouchableOpacity onPress={onDone} style={styles.taskCheck} activeOpacity={0.6}>
        <Ionicons name="ellipse-outline" size={22} color={colors.primaryDark} />
      </TouchableOpacity>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        <View style={styles.taskMeta}>
          {task.estimatedMinutes ? <Text style={styles.taskMetaText}>⏱ {task.estimatedMinutes}m</Text> : null}
          {cat ? <Text style={[styles.taskMetaText, { color: cat.color }]}>{cat.emoji}</Text> : null}
          {task.dueAt ? (
            <Text style={[styles.taskMetaText, task.isOverdue ? { color: colors.danger } : undefined]}>
              📅 {new Date(task.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity onPress={onFocus} style={styles.taskFocusBtn} activeOpacity={0.7}>
        <Ionicons name="play-circle-outline" size={24} color={colors.primaryDark} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Calendar event row ──────────────────────────────────────────────────────

function EventRow({ event }: { event: CalendarEvent }) {
  const calendarColors = useSettingsStore((s) => s.calendarColors);
  const color = calendarColors[event.source as CalendarSourceKey] ?? colors.primaryDark;

  return (
    <View style={[styles.eventRow, { borderLeftColor: color }]}>
      <View style={[styles.eventDot, { backgroundColor: color }]} />
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventTime}>
          {event.allDay ? 'All day' : formatTime(event.startAt)}
          {event.endAt && !event.allDay ? ` – ${formatTime(event.endAt)}` : ''}
        </Text>
      </View>
      <Text style={[styles.eventSource, { color }]}>{CALENDAR_SOURCE_LABELS[event.source as CalendarSourceKey] ?? event.source}</Text>
    </View>
  );
}

// ─── Today Screen ────────────────────────────────────────────────────────────

export function TodayScreen() {
  const tasks = useTodayTasks();
  const navigation = useNavigation<NavProp>();
  const { workDuration } = useSettingsStore();
  const { streak, todayCount } = useStreak();

  // Get events for today + rest of the week
  const { weekStart, weekEnd, todayStart, todayEnd } = useMemo(() => {
    const now = new Date();
    const ts = new Date(now); ts.setHours(0, 0, 0, 0);
    const te = new Date(now); te.setHours(23, 59, 59, 999);
    // End of week (Sunday)
    const we = new Date(ts);
    we.setDate(we.getDate() + (7 - we.getDay()));
    we.setHours(23, 59, 59, 999);
    return { weekStart: ts.getTime(), weekEnd: we.getTime(), todayStart: ts.getTime(), todayEnd: te.getTime() };
  }, []);

  const weekEvents = useCalendarEvents(weekStart, weekEnd);

  const todayEvents = useMemo(
    () => weekEvents.filter((e) => e.startAt >= todayStart && e.startAt <= todayEnd),
    [weekEvents, todayStart, todayEnd]
  );

  // Group upcoming events by day (excluding today)
  const upcomingByDay = useMemo(() => {
    const upcoming = weekEvents.filter((e) => e.startAt > todayEnd);
    const groups: { day: Date; label: string; events: CalendarEvent[] }[] = [];
    for (const event of upcoming) {
      const eventDate = new Date(event.startAt);
      eventDate.setHours(0, 0, 0, 0);
      const existing = groups.find((g) => g.day.getTime() === eventDate.getTime());
      if (existing) {
        existing.events.push(event);
      } else {
        groups.push({ day: eventDate, label: relativeDay(eventDate), events: [event] });
      }
    }
    return groups;
  }, [weekEvents, todayEnd]);

  const task = tasks[0] ?? null;
  const remainingTasks = tasks.slice(1);

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

  const handleStartFocus = useCallback((t: Task) => {
    navigation.navigate('FocusTimer', {
      taskId: t.id,
      taskTitle: t.title,
      plannedMinutes: t.estimatedMinutes ?? workDuration,
    });
  }, [workDuration, navigation]);

  const handleQuickStart = useCallback(() => {
    if (!task) return;
    navigation.navigate('FocusTimer', {
      taskId: task.id,
      taskTitle: task.title,
      plannedMinutes: 2,
    });
  }, [task, navigation]);

  const handleTaskDone = useCallback(async (t: Task) => {
    await updateTaskStatus(t, 'done');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>tADiHD</Text>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {streak}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily summary */}
        {todayCount > 0 && (
          <View style={styles.summaryStrip}>
            <Text style={styles.summaryText}>
              {todayCount === 1 ? 'You finished 1 task today' : `You finished ${todayCount} tasks today`} ✨
            </Text>
          </View>
        )}

        {/* Focus card — top task */}
        {task ? (
          <FocusCard
            key={task.id}
            task={task}
            onDone={handleDone}
            onSkip={handleSkip}
            onStartFocus={() => handleStartFocus(task)}
            onQuickStart={handleQuickStart}
          />
        ) : (
          <View style={styles.emptyFocus}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptyBody}>
              {todayCount > 0
                ? `You finished ${todayCount} task${todayCount > 1 ? 's' : ''} today. Great work.`
                : "No tasks for today. Add one when you're ready."}
            </Text>
          </View>
        )}

        {/* ── Today's Calendar Events ── */}
        {todayEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={16} color={colors.primaryDark} />
              <Text style={styles.sectionTitle}>Today's Events</Text>
              <Text style={styles.sectionCount}>{todayEvents.length}</Text>
            </View>
            {todayEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </View>
        )}

        {/* ── Remaining tasks for today ── */}
        {remainingTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={16} color={colors.primaryDark} />
              <Text style={styles.sectionTitle}>Up Next</Text>
              <Text style={styles.sectionCount}>{remainingTasks.length}</Text>
            </View>
            {remainingTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onDone={() => handleTaskDone(t)}
                onFocus={() => handleStartFocus(t)}
              />
            ))}
          </View>
        )}

        {/* ── This Week ── */}
        {upcomingByDay.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>This Week</Text>
            </View>
            {upcomingByDay.map((group) => (
              <View key={group.day.toISOString()} style={styles.weekGroup}>
                <Text style={styles.weekGroupLabel}>{group.label}</Text>
                {group.events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.lg },

  // Header
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
  summaryStrip: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: { fontSize: 14, fontWeight: '500', color: colors.primaryDark },

  // Focus card
  focusArea: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  hintSkip: { fontSize: 13, color: colors.textMuted },
  hintDone: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  focusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  focusCardTitle: { fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 36, marginBottom: spacing.sm },
  focusCardNotes: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.md },
  focusCardMeta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaChip: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  focusBtn: {
    marginTop: spacing.lg,
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

  // Empty state
  emptyFocus: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.full,
  },

  // Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  taskCheck: { padding: 2 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  taskMetaText: { fontSize: 12, color: colors.textMuted },
  taskFocusBtn: { padding: spacing.xs },

  // Event row
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  eventTime: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  eventSource: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },

  // Week groups
  weekGroup: { marginBottom: spacing.sm },
  weekGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
  },
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
