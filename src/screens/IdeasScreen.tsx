import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { confirmDelete } from '../utils/confirm';
import { useIdeas } from '../hooks/useIdeas';
import { createIdea, deleteIdea, ideaToTask, markIdeaProcessed } from '../db/actions';
import { Idea } from '../db/models/Idea';
import { colors, spacing, radius } from '../theme/tokens';

// TODO(phase6): AI — process idea with on-device model here

export function IdeasScreen() {
  const ideas = useIdeas();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleCapture = useCallback(async () => {
    if (!input.trim() || saving) return;
    setSaving(true);
    Keyboard.dismiss();
    await createIdea(input.trim());
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setSaving(false);
  }, [input, saving]);

  const handleToTask = useCallback(async (idea: Idea) => {
    await ideaToTask(idea, 'today');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExpandedId(null);
  }, []);

  const handleToBacklog = useCallback(async (idea: Idea) => {
    await ideaToTask(idea, 'backlog');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(null);
  }, []);

  const handleDiscard = useCallback(async (idea: Idea) => {
    const ok = await confirmDelete('Discard Idea', 'Remove this idea? This cannot be undone.');
    if (!ok) return;
    await deleteIdea(idea);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpandedId(null);
  }, []);

  const renderIdea = ({ item }: { item: Idea }) => {
    const expanded = expandedId === item.id;
    const timeAgo = formatTimeAgo(item.createdAt);

    return (
      <View style={styles.ideaCard}>
        <TouchableOpacity
          style={styles.ideaMain}
          onPress={() => setExpandedId(expanded ? null : item.id)}
          activeOpacity={0.75}
        >
          <Text style={styles.ideaBullet}>💡</Text>
          <View style={styles.ideaContent}>
            <Text style={styles.ideaText}>{item.content}</Text>
            <Text style={styles.ideaTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.ideaChevron}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.ideaActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionToday]} onPress={() => handleToTask(item)}>
              <Text style={styles.actionTodayText}>→ Add to Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBacklog]} onPress={() => handleToBacklog(item)}>
              <Text style={styles.actionBacklogText}>↓ Add to Backlog</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionDiscard]} onPress={() => handleDiscard(item)}>
              <Text style={styles.actionDiscardText}>✕ Discard</Text>
            </TouchableOpacity>
            {/* TODO(phase6): AI — "✨ Process with AI" button goes here */}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Idea Dump</Text>
        {ideas.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ideas.length}</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>Capture first, sort later. No judgment.</Text>

      {/* Capture bar */}
      <View style={styles.captureBar}>
        <TextInput
          ref={inputRef}
          style={styles.captureInput}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleCapture}
          returnKeyType="done"
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.captureBtn, !input.trim() && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={!input.trim() || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.captureBtnText}>Dump</Text>
        </TouchableOpacity>
      </View>

      {ideas.length > 0 ? (
        <FlatList
          data={ideas}
          keyExtractor={(item) => item.id}
          renderItem={renderIdea}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧠</Text>
          <Text style={styles.emptyTitle}>Your mind is clear</Text>
          <Text style={styles.emptyBody}>Type anything above — a wild idea, a half-baked plan, a random thought. It's all safe here.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 2,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  badge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  subtitle: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  captureBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  captureInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  captureBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: colors.surface },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  ideaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ideaMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  ideaBullet: { fontSize: 16, marginTop: 1 },
  ideaContent: { flex: 1 },
  ideaText: { fontSize: 15, fontWeight: '500', color: colors.text, lineHeight: 22, marginBottom: 3 },
  ideaTime: { fontSize: 12, color: colors.textMuted },
  ideaChevron: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  ideaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  actionToday: { backgroundColor: colors.primaryLight },
  actionTodayText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  actionBacklog: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  actionBacklogText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  actionDiscard: { backgroundColor: '#FEE2E2', marginLeft: 'auto' },
  actionDiscardText: { fontSize: 13, fontWeight: '600', color: '#991B1B' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
