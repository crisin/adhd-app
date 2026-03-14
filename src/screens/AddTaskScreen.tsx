import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { createTask } from '../db/actions';
import { colors, spacing, radius } from '../theme/tokens';
import { TaskStatus, TaskCategory } from '../db/models/Task';
import { CATEGORIES } from '../theme/categories';
import { RootStackParamList } from '../navigation';

// TODO(phase2): subtasks — add option to attach subtasks during creation

type RouteType = RouteProp<RootStackParamList, 'AddTask'>;
const TIME_PRESETS = [5, 15, 30, 60] as const;

export function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const prefilledGoalId = route.params?.goalId ?? null;

  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);
  const [destination, setDestination] = useState<TaskStatus>('today');
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    Keyboard.dismiss();
    await createTask(title, estimatedMinutes, destination, category, prefilledGoalId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
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

        {/* Title input */}
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
                {dest === 'today' ? 'Today' : 'Backlog'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save task'}</Text>
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
  titleInput: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
    padding: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  categoryScroll: { marginBottom: spacing.xl, marginHorizontal: -spacing.lg },
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
  presetRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
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
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
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
  saveBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.surface },
});
