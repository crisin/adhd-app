import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useSettingsStore } from '../store/useSettingsStore';
import { colors, spacing, radius } from '../theme/tokens';
import { Task } from '../db/models/Task';

// TODO(phase2): sound — add sound preference settings here

const WORK_OPTIONS = [10, 15, 20, 25, 30, 45, 60] as const;
const WARNING_OPTIONS = [1, 2, 3, 5] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function Chip({
  value,
  label,
  active,
  onPress,
}: {
  value: number;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const { workDuration, transitionWarning, setWorkDuration, setTransitionWarning } = useSettingsStore();
  const db = useDatabase();

  const handleExport = async () => {
    try {
      const tasks = await db.get<Task>('tasks').query(Q.sortBy('created_at', Q.desc)).fetch();
      const data = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        status: t.status,
        estimatedMinutes: t.estimatedMinutes,
        actualMinutes: t.actualMinutes,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }));
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch (e) {
      Alert.alert('Export failed', 'Could not export data.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Timer defaults</Text>

        <Row label="Work duration">
          <View style={styles.chipRow}>
            {WORK_OPTIONS.map((min) => (
              <Chip
                key={min}
                value={min}
                label={`${min}m`}
                active={workDuration === min}
                onPress={() => setWorkDuration(min)}
              />
            ))}
          </View>
        </Row>

        <Row label="Transition warning">
          <View style={styles.chipRow}>
            {WARNING_OPTIONS.map((min) => (
              <Chip
                key={min}
                value={min}
                label={`${min}m`}
                active={transitionWarning === min}
                onPress={() => setTransitionWarning(min)}
              />
            ))}
          </View>
        </Row>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Data</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>Export tasks as JSON</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>tADiHD v1.0 · All data stays on device</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: spacing.sm },
  rowRight: {},
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  exportBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  exportBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  version: { fontSize: 12, color: colors.textMuted },
});
