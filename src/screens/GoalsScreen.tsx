import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useGoals } from '../hooks/useGoals';
import { useTasksForGoal } from '../hooks/useTasksForGoal';
import { createGoal, updateGoalStatus, deleteGoal } from '../db/actions';
import { Goal, GoalType } from '../db/models/Goal';
import { colors, spacing, radius } from '../theme/tokens';
import { getCategoryMeta, CATEGORIES } from '../theme/categories';
import { TaskCategory } from '../db/models/Task';
import { RootStackParamList } from '../navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onAddTask, onComplete, onDelete }: {
  goal: Goal;
  onAddTask: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const tasks = useTasksForGoal(goal.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const progress = total > 0 ? done / total : 0;
  const cat = getCategoryMeta(goal.category);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.typePill, goal.type === 'long' ? styles.typeLong : styles.typeShort]}>
            <Text style={styles.typeText}>{goal.type === 'long' ? '🌟 Long-term' : '⚡ Short-term'}</Text>
          </View>
          {cat && (
            <View style={[styles.catPill, { backgroundColor: cat.light }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: cat.color }}>{cat.emoji} {cat.label}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle}>{goal.title}</Text>
        {goal.description ? <Text style={styles.cardDesc} numberOfLines={2}>{goal.description}</Text> : null}
      </View>

      {/* Progress */}
      {total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{done}/{total} tasks done</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={onAddTask} activeOpacity={0.8}>
          <Text style={styles.cardActionText}>+ Add task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionSuccess]} onPress={onComplete} activeOpacity={0.8}>
          <Text style={[styles.cardActionText, { color: '#166534' }]}>✓ Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionDanger]} onPress={onDelete} activeOpacity={0.8}>
          <Text style={[styles.cardActionText, { color: '#991B1B' }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create Goal Modal ────────────────────────────────────────────────────────
function CreateGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<GoalType>('short');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(''); setType('short'); setDescription(''); setCategory(null); };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await createGoal(title, type, description || null, category);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>

          <TextInput
            autoFocus
            style={styles.modalInput}
            placeholder="What do you want to achieve?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            multiline
          />

          <TextInput
            style={styles.modalInputSm}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.sectionLabel}>Type</Text>
          <View style={styles.toggleRow}>
            {(['short', 'long'] as GoalType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.toggle, type === t && styles.toggleActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                  {t === 'short' ? '⚡ Short-term' : '🌟 Long-term'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Category (optional)</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setCategory(active ? null : cat.value)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, active && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim() || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Create goal'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Goals Screen ─────────────────────────────────────────────────────────────
export function GoalsScreen() {
  const goals = useGoals();
  const navigation = useNavigation<NavProp>();
  const [showCreate, setShowCreate] = useState(false);

  const handleComplete = useCallback(async (goal: Goal) => {
    await updateGoalStatus(goal, 'done');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleDelete = useCallback(async (goal: Goal) => {
    await deleteGoal(goal);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const shortTermGoals = goals.filter((g) => g.type === 'short');
  const longTermGoals = goals.filter((g) => g.type === 'long');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyBody}>Set a short or long-term goal to give your tasks direction.</Text>
          </View>
        )}

        {shortTermGoals.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>⚡ Short-term</Text>
            {shortTermGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddTask={() => navigation.navigate('AddTask', { goalId: goal.id })}
                onComplete={() => handleComplete(goal)}
                onDelete={() => handleDelete(goal)}
              />
            ))}
          </>
        )}

        {longTermGoals.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>🌟 Long-term</Text>
            {longTermGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddTask={() => navigation.navigate('AddTask', { goalId: goal.id })}
                onComplete={() => handleComplete(goal)}
                onDelete={() => handleDelete(goal)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <CreateGoalModal visible={showCreate} onClose={() => setShowCreate(false)} />
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
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.surface },
  list: { padding: spacing.lg, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { marginBottom: spacing.sm },
  cardTitleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  typeShort: { backgroundColor: '#FEF3C7' },
  typeLong: { backgroundColor: '#EDE9FE' },
  typeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  catPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  progressSection: { marginVertical: spacing.sm },
  progressTrack: { height: 6, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: colors.textMuted },
  cardActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  cardActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActionSuccess: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  cardActionDanger: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', marginLeft: 'auto' },
  cardActionText: { fontSize: 13, fontWeight: '600', color: colors.text },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  cancelText: { fontSize: 16, color: colors.textMuted },
  modalInput: { fontSize: 22, fontWeight: '600', color: colors.text, minHeight: 80, textAlignVertical: 'top', padding: 0, marginBottom: spacing.md },
  modalInputSm: { fontSize: 16, color: colors.text, minHeight: 60, textAlignVertical: 'top', padding: 0, marginBottom: spacing.xl, color: colors.textMuted },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  toggle: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.primaryDark },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.surface },
});
