import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { createTask, createSubtask } from '../db/actions';
import { colors, spacing, radius } from '../theme/tokens';
import { TaskStatus, TaskCategory, TaskPriority } from '../db/models/Task';
import { CATEGORIES } from '../theme/categories';
import { RootStackParamList } from '../navigation';
import { useAI } from '../hooks/useAI';

type RouteType = RouteProp<RootStackParamList, 'AddTask'>;
const TIME_PRESETS = [5, 15, 30, 60] as const;

const PRIORITIES: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 'high', label: 'High', icon: '\u2B06', color: colors.danger },
  { value: 'medium', label: 'Medium', icon: '\u2014', color: colors.accentDark },
  { value: 'low', label: 'Low', icon: '\u2B07', color: colors.textMuted },
];

interface SubtaskDraft {
  title: string;
  estimatedMinutes: number | null;
}

export function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const prefilledGoalId = route.params?.goalId ?? null;

  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [destination, setDestination] = useState<TaskStatus>('today');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ai = useAI();
  const canSave = title.trim().length > 0;
  const canDecompose = title.trim().length > 3;

  const handleDecompose = async () => {
    if (!canDecompose || ai.isGenerating) return;
    setAiError(null);
    Keyboard.dismiss();

    try {
      const result = await ai.decompose(title);
      // Auto-fill form with AI suggestions
      setTitle(result.title);
      if (result.category) setCategory(result.category);
      setPriority(result.priority);
      if (result.estimatedMinutes) setEstimatedMinutes(result.estimatedMinutes);
      setSubtasks(result.subtasks);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setAiError(err?.message ?? 'AI failed');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    Keyboard.dismiss();

    let dueAt: number | null = null;
    if (dueDate.trim()) {
      const parsed = new Date(dueDate.trim());
      if (!isNaN(parsed.getTime())) dueAt = parsed.getTime();
    }

    const task = await createTask(title, estimatedMinutes, destination, category, prefilledGoalId, {
      priority,
      dueAt,
    });

    // Create subtasks if any
    for (const st of subtasks) {
      if (st.title.trim()) {
        await createSubtask(task.id, st.title);
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const updateSubtask = (index: number, newTitle: string) => {
    setSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, title: newTitle } : s)));
  };

  const removeSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addSubtask = () => {
    setSubtasks((prev) => [...prev, { title: '', estimatedMinutes: null }]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Brain Dump</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {prefilledGoalId && (
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>🎯 Linked to goal</Text>
          </View>
        )}

        {/* Title input + AI button */}
        <View style={styles.titleRow}>
          <TextInput
            autoFocus
            multiline
            style={styles.titleInput}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            blurOnSubmit={false}
          />
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[
                styles.aiBtn,
                !canDecompose && styles.aiBtnDisabled,
                ai.isGenerating && styles.aiBtnActive,
              ]}
              onPress={handleDecompose}
              disabled={!canDecompose || ai.isGenerating}
              activeOpacity={0.7}
            >
              {ai.isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.aiBtnText}>AI</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* AI status panel — always visible when AI is doing something */}
        {Platform.OS === 'web' && (ai.isLoading || ai.isGenerating || ai.status === 'error' || aiError) && (
          <View style={styles.aiPanel}>
            {/* Status dot + message */}
            <View style={styles.aiPanelHeader}>
              <View style={[
                styles.aiDot,
                ai.isLoading && styles.aiDotLoading,
                ai.isGenerating && styles.aiDotGenerating,
                (ai.status === 'error' || aiError) && styles.aiDotError,
              ]} />
              <Text style={styles.aiPanelMessage} numberOfLines={2}>
                {aiError ?? ai.statusMessage}
              </Text>
            </View>

            {/* Progress bar for loading */}
            {ai.isLoading && (
              <View style={styles.aiProgressBar}>
                <View style={[styles.aiProgressFill, { width: `${Math.round(ai.loadProgress * 100)}%` }]} />
              </View>
            )}

            {/* Token counter + live preview during generation */}
            {ai.isGenerating && (
              <>
                <View style={styles.aiTokenRow}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={styles.aiTokenCount}>
                    {ai.tokensGenerated} tokens generated
                  </Text>
                </View>
                {ai.partialOutput ? (
                  <View style={styles.aiPreviewBox}>
                    <Text style={styles.aiPreviewText} numberOfLines={4}>
                      {ai.partialOutput}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}

        {/* Subtasks (from AI or manual) */}
        {subtasks.length > 0 && (
          <View style={styles.subtasksSection}>
            <Text style={styles.sectionLabel}>Subtasks</Text>
            {subtasks.map((st, i) => (
              <View key={i} style={styles.subtaskRow}>
                <View style={styles.subtaskBullet} />
                <TextInput
                  style={styles.subtaskInput}
                  value={st.title}
                  onChangeText={(text) => updateSubtask(i, text)}
                  placeholder="Subtask..."
                  placeholderTextColor={colors.textMuted}
                />
                {st.estimatedMinutes ? (
                  <Text style={styles.subtaskTime}>{st.estimatedMinutes}m</Text>
                ) : null}
                <TouchableOpacity onPress={() => removeSubtask(i)} style={styles.subtaskRemove}>
                  <Text style={styles.subtaskRemoveText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSubtaskBtn} onPress={addSubtask}>
              <Text style={styles.addSubtaskText}>+ Add subtask</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Priority */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[styles.priorityChip, active && { borderColor: p.color, backgroundColor: p.color + '18' }]}
                onPress={() => setPriority(p.value)}
              >
                <Text style={[styles.priorityIcon, { color: p.color }]}>{p.icon}</Text>
                <Text style={[styles.priorityLabel, active && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category */}
        <Text style={styles.sectionLabel}>Category (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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
                  <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Due date */}
        <Text style={styles.sectionLabel}>Due date (optional)</Text>
        <TextInput
          style={styles.dueDateInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          value={dueDate}
          onChangeText={setDueDate}
          keyboardType="default"
        />

        {/* Time estimate */}
        <Text style={styles.sectionLabel}>How long? (optional)</Text>
        <View style={styles.presetRow}>
          {TIME_PRESETS.map((min) => (
            <TouchableOpacity
              key={min}
              style={[styles.preset, estimatedMinutes === min && styles.presetActive]}
              onPress={() => setEstimatedMinutes(estimatedMinutes === min ? null : min)}
            >
              <Text style={[styles.presetText, estimatedMinutes === min && styles.presetTextActive]}>
                {min}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Destination */}
        <Text style={styles.sectionLabel}>Add to</Text>
        <View style={styles.toggleRow}>
          {(['today', 'backlog'] as TaskStatus[]).map((dest) => (
            <TouchableOpacity
              key={dest}
              style={[styles.toggle, destination === dest && styles.toggleActive]}
              onPress={() => setDestination(dest)}
            >
              <Text style={[styles.toggleText, destination === dest && styles.toggleTextActive]}>
                {dest === 'today' ? 'Next Up' : 'Backlog'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manual subtask add (when no AI subtasks yet) */}
        {subtasks.length === 0 && (
          <TouchableOpacity style={styles.addSubtaskBtnStandalone} onPress={addSubtask}>
            <Text style={styles.addSubtaskText}>+ Add subtasks</Text>
          </TouchableOpacity>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving\u2026' : 'Save task'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  cancelBtn: { padding: spacing.sm },
  cancelText: { fontSize: 16, color: colors.textMuted },
  goalPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  goalPillText: { fontSize: 13, fontWeight: '600', color: '#6D28D9' },
  // Title + AI
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  titleInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 0,
  },
  aiBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  aiBtnDisabled: { opacity: 0.35 },
  aiBtnActive: { backgroundColor: '#6D28D9' },
  aiBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  // AI status panel
  aiPanel: {
    backgroundColor: '#F5F3FF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  aiPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  aiDotLoading: { backgroundColor: '#7C3AED' },
  aiDotGenerating: { backgroundColor: '#F59E0B' },
  aiDotError: { backgroundColor: colors.danger },
  aiPanelMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },
  aiProgressBar: {
    height: 4,
    backgroundColor: '#DDD6FE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  aiProgressFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 2 },
  aiTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiTokenCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6D28D9',
  },
  aiPreviewBox: {
    backgroundColor: '#EDE9FE',
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  aiPreviewText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4C1D95',
    lineHeight: 16,
  },
  // Subtasks
  subtasksSection: { marginBottom: spacing.lg },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtaskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 4,
  },
  subtaskTime: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  subtaskRemove: { padding: 4 },
  subtaskRemoveText: { fontSize: 12, color: colors.textMuted },
  addSubtaskBtn: { paddingVertical: spacing.xs },
  addSubtaskText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  addSubtaskBtnStandalone: { marginBottom: spacing.lg, paddingVertical: spacing.xs },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  // Priority
  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  priorityIcon: { fontSize: 14 },
  priorityLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  // Category
  categoryScroll: { marginBottom: spacing.lg, marginHorizontal: -spacing.lg },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  catLabelActive: { color: '#fff' },
  // Due date
  dueDateInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  // Time
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  preset: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  presetActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  presetTextActive: { color: colors.primaryDark },
  // Destination
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  toggleText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.primaryDark },
  // Save
  saveBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.surface },
});
