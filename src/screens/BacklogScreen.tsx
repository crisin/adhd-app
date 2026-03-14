import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useTodayTasks } from '../hooks/useTodayTasks';
import { useBacklogTasks } from '../hooks/useBacklogTasks';
import { updateTaskStatus, deleteTask, updateTaskTitle } from '../db/actions';
import { Task } from '../db/models/Task';
import { RootStackParamList } from '../navigation';
import { colors, spacing, radius } from '../theme/tokens';

// TODO(phase2): subtasks — show subtask count badge on each task row

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type RowAction = 'move-today' | 'move-backlog' | 'done' | 'delete' | 'edit';

interface TaskRowProps {
  task: Task;
  section: 'today' | 'backlog';
  onAction: (action: RowAction) => void;
}

function TaskRow({ task, section, onAction }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showActions, setShowActions] = useState(false);

  const handleEditDone = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed.length > 0 && trimmed !== task.title) {
      await updateTaskTitle(task, trimmed);
    } else {
      setEditValue(task.title);
    }
    setEditing(false);
  }, [editValue, task]);

  const startEditing = useCallback(() => {
    setShowActions(false);
    setEditing(true);
  }, []);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => setShowActions((v) => !v)}
        activeOpacity={0.75}
      >
        {/* Status dot */}
        <View style={[styles.dot, section === 'today' ? styles.dotToday : styles.dotBacklog]} />

        <View style={styles.rowContent}>
          {editing ? (
            <TextInput
              autoFocus
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              onBlur={handleEditDone}
              onSubmitEditing={handleEditDone}
            />
          ) : (
            <Text style={styles.rowTitle} numberOfLines={2}>{task.title}</Text>
          )}
          <View style={styles.rowMeta}>
            {task.estimatedMinutes ? (
              <Text style={styles.metaText}>⏱ {task.estimatedMinutes}m</Text>
            ) : null}
            {section === 'today' && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Today</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Inline action strip — shown on tap */}
      {showActions && !editing && (
        <View style={styles.actionStrip}>
          {section === 'backlog' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => { setShowActions(false); onAction('move-today'); }}
            >
              <Text style={styles.actionPrimaryText}>→ Today</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSuccess]}
                onPress={() => { setShowActions(false); onAction('done'); }}
              >
                <Text style={styles.actionSuccessText}>✓ Done</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionMuted]}
                onPress={() => { setShowActions(false); onAction('move-backlog'); }}
              >
                <Text style={styles.actionMutedText}>↓ Later</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionMuted]}
            onPress={startEditing}
          >
            <Text style={styles.actionMutedText}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDanger]}
            onPress={() => { setShowActions(false); onAction('delete'); }}
          >
            <Text style={styles.actionDangerText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── All Tasks Screen ──────────────────────────────────────────────────────────
export function BacklogScreen() {
  const todayTasks = useTodayTasks();
  const backlogTasks = useBacklogTasks();
  const navigation = useNavigation<NavProp>();

  const handleAction = useCallback(async (task: Task, action: RowAction) => {
    switch (action) {
      case 'move-today':
        await updateTaskStatus(task, 'today');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'move-backlog':
        await updateTaskStatus(task, 'backlog');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'done':
        await updateTaskStatus(task, 'done');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'delete':
        await deleteTask(task);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
    }
  }, []);

  const sections = [
    { key: 'today', title: 'Today', data: todayTasks },
    { key: 'backlog', title: 'Backlog', data: backlogTasks },
  ].filter((s) => s.data.length > 0);

  const total = todayTasks.length + backlogTasks.length;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>All Tasks</Text>
        {total > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{total} total</Text>
          </View>
        )}
      </View>

      {total > 0 ? (
        <>
          <Text style={styles.hint}>Tap a task to see actions</Text>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item, section }) => (
              <TaskRow
                task={item}
                section={section.key as 'today' | 'backlog'}
                onAction={(action) => handleAction(item, action)}
              />
            )}
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} count={section.data.length} />
            )}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>Add your first task to get started.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('AddTask')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Add a task</Text>
          </TouchableOpacity>
        </View>
      )}

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
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  totalBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  totalBadgeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  hint: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  dotToday: { backgroundColor: colors.primary },
  dotBacklog: { backgroundColor: colors.border },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 3 },
  editInput: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    padding: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    marginBottom: 3,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: 12, color: colors.textMuted },
  todayPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  todayPillText: { fontSize: 11, fontWeight: '600', color: colors.primaryDark },
  actionStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  actionPrimary: { backgroundColor: colors.primaryLight },
  actionPrimaryText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  actionSuccess: { backgroundColor: '#DCFCE7' },
  actionSuccessText: { fontSize: 13, fontWeight: '700', color: '#166534' },
  actionMuted: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  actionMutedText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  actionDanger: { backgroundColor: '#FEE2E2', marginLeft: 'auto' },
  actionDangerText: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  separator: { height: spacing.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: colors.surface },
  fabContainer: { position: 'absolute', bottom: spacing.xl, right: spacing.lg },
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
