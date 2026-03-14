import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { updateTaskStatus, deleteTask } from '../db/actions';
import { Task, TaskCategory } from '../db/models/Task';
import { colors, spacing, radius } from '../theme/tokens';
import { getCategoryMeta, CATEGORIES } from '../theme/categories';
import { RootStackParamList } from '../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function useAllActiveTasks(filterCategory: TaskCategory | null) {
  const database = useDatabase();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const baseQuery = database
      .get<Task>('tasks')
      .query(
        Q.where('status', Q.oneOf(['backlog', 'today', 'active', 'done'])),
        Q.sortBy('sort_order', Q.asc)
      );

    const sub = baseQuery.observe().subscribe((all) => {
      setTasks(
        filterCategory ? all.filter((t) => t.category === filterCategory) : all
      );
    });
    return () => sub.unsubscribe();
  }, [database, filterCategory]);

  return tasks;
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
function KanbanCard({ task, onMove, onDelete, onStartFocus }: {
  task: Task;
  onMove: (status: 'backlog' | 'today' | 'done') => void;
  onDelete: () => void;
  onStartFocus: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = getCategoryMeta(task.category);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
        {cat && (
          <View style={[styles.cardCatStripe, { backgroundColor: cat.color }]} />
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 2}>{task.title}</Text>
          <View style={styles.cardMeta}>
            {cat && <Text style={[styles.catTag, { color: cat.color }]}>{cat.emoji} {cat.label}</Text>}
            {task.estimatedMinutes ? <Text style={styles.metaText}>⏱ {task.estimatedMinutes}m</Text> : null}
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardActions}>
          {task.status !== 'backlog' && (
            <TouchableOpacity style={styles.actionChip} onPress={() => { onMove('backlog'); setExpanded(false); }}>
              <Text style={styles.actionChipText}>↓ Backlog</Text>
            </TouchableOpacity>
          )}
          {task.status !== 'today' && task.status !== 'active' && (
            <TouchableOpacity style={[styles.actionChip, styles.actionToday]} onPress={() => { onMove('today'); setExpanded(false); }}>
              <Text style={[styles.actionChipText, { color: colors.primaryDark }]}>→ Today</Text>
            </TouchableOpacity>
          )}
          {(task.status === 'today' || task.status === 'active') && (
            <TouchableOpacity style={[styles.actionChip, styles.actionFocus]} onPress={() => { setExpanded(false); onStartFocus(); }}>
              <Text style={[styles.actionChipText, { color: '#1D4ED8' }]}>▶ Focus</Text>
            </TouchableOpacity>
          )}
          {task.status !== 'done' && (
            <TouchableOpacity style={[styles.actionChip, styles.actionDone]} onPress={() => { onMove('done'); setExpanded(false); }}>
              <Text style={[styles.actionChipText, { color: '#166534' }]}>✓ Done</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionChip, styles.actionDelete]} onPress={() => { onDelete(); setExpanded(false); }}>
            <Text style={[styles.actionChipText, { color: '#991B1B' }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({ title, color, tasks, onMove, onDelete, onStartFocus, onAdd }: {
  title: string;
  color: string;
  tasks: Task[];
  onMove: (task: Task, status: 'backlog' | 'today' | 'done') => void;
  onDelete: (task: Task) => void;
  onStartFocus: (task: Task) => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.column}>
      <View style={[styles.colHeader, { borderTopColor: color }]}>
        <Text style={styles.colTitle}>{title}</Text>
        <View style={styles.colBadge}>
          <Text style={styles.colBadgeText}>{tasks.length}</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onMove={(status) => onMove(task, status)}
            onDelete={() => onDelete(task)}
            onStartFocus={() => onStartFocus(task)}
          />
        ))}
        <TouchableOpacity style={styles.addCard} onPress={onAdd} activeOpacity={0.7}>
          <Text style={styles.addCardText}>+ Add</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Kanban Screen ────────────────────────────────────────────────────────────
export function KanbanScreen() {
  const navigation = useNavigation<NavProp>();
  const [filterCategory, setFilterCategory] = useState<TaskCategory | null>(null);
  const tasks = useAllActiveTasks(filterCategory);

  const backlog = tasks.filter((t) => t.status === 'backlog');
  const today   = tasks.filter((t) => t.status === 'today' || t.status === 'active');
  const done    = tasks.filter((t) => t.status === 'done');

  const handleMove = useCallback(async (task: Task, status: 'backlog' | 'today' | 'done') => {
    await updateTaskStatus(task, status);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDelete = useCallback(async (task: Task) => {
    await deleteTask(task);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleStartFocus = useCallback((task: Task) => {
    navigation.navigate('FocusTimer', {
      taskId: task.id,
      taskTitle: task.title,
      plannedMinutes: task.estimatedMinutes ?? 25,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Kanban</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddTask')}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Task</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
            onPress={() => setFilterCategory(null)}
          >
            <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => {
            const active = filterCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setFilterCategory(active ? null : cat.value)}
              >
                <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{cat.emoji} {cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Board */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.board}>
        <KanbanColumn
          title="Backlog"
          color={colors.border}
          tasks={backlog}
          onMove={handleMove}
          onDelete={handleDelete}
          onStartFocus={handleStartFocus}
          onAdd={() => navigation.navigate('AddTask')}
        />
        <KanbanColumn
          title="Today"
          color={colors.primary}
          tasks={today}
          onMove={handleMove}
          onDelete={handleDelete}
          onStartFocus={handleStartFocus}
          onAdd={() => navigation.navigate('AddTask')}
        />
        <KanbanColumn
          title="Done"
          color="#10B981"
          tasks={done}
          onMove={handleMove}
          onDelete={handleDelete}
          onStartFocus={handleStartFocus}
          onAdd={() => navigation.navigate('AddTask')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const COLUMN_WIDTH = 280;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.surface },
  filterScroll: { maxHeight: 44, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, alignItems: 'center' },
  filterChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryDark },
  board: { flex: 1 },
  column: { width: COLUMN_WIDTH, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 3, paddingTop: spacing.sm, marginBottom: spacing.sm },
  colTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  colBadge: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 1 },
  colBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  colScroll: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCatStripe: { height: 3 },
  cardBody: { padding: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  catTag: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 11, color: colors.textMuted },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  actionChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionToday: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  actionFocus: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  actionDone: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  actionDelete: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', marginLeft: 'auto' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  addCard: { borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  addCardText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
});
