import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePlants } from '../hooks/usePlants';
import { createPlant, updatePlant, waterPlantAndSchedule, deletePlant } from '../db/actions';
import { Plant } from '../db/models/Plant';
import { colors, spacing, radius } from '../theme/tokens';

// ─── Watering status config ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  never:   { label: 'Never watered',  color: '#94A3B8', bg: '#F1F5F9', emoji: '🌱' },
  overdue: { label: 'Needs water!',   color: '#DC2626', bg: '#FEF2F2', emoji: '🚨' },
  today:   { label: 'Water today',    color: '#D97706', bg: '#FFFBEB', emoji: '💧' },
  soon:    { label: 'Water soon',     color: '#059669', bg: '#F0FDF4', emoji: '🌿' },
  ok:      { label: 'All good',       color: '#10B981', bg: '#ECFDF5', emoji: '✅' },
};

function wateringLabel(plant: Plant): string {
  const due = plant.daysUntilWater;
  const status = plant.wateringStatus;
  if (status === 'never') return 'Never watered yet';
  if (status === 'overdue') {
    const days = Math.abs(due!);
    return days === 0 ? 'Due today!' : `${days}d overdue!`;
  }
  if (status === 'today') return 'Water today';
  return `In ${due} day${due === 1 ? '' : 's'}`;
}

// ─── Watering interval presets ────────────────────────────────────────────────

const INTERVAL_PRESETS = [2, 3, 5, 7, 10, 14, 21, 30] as const;

// ─── Plant card ───────────────────────────────────────────────────────────────

function PlantCard({ plant, onWater, onEdit, onDelete, cardWidth }: {
  plant: Plant;
  onWater: () => void;
  onEdit: () => void;
  onDelete: () => void;
  cardWidth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = plant.wateringStatus;
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={[styles.card, { width: cardWidth }, { borderTopColor: cfg.color, backgroundColor: cfg.bg }]}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <Text style={styles.cardEmoji}>{cfg.emoji}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{plant.name}</Text>
        {plant.species ? (
          <Text style={styles.cardSpecies} numberOfLines={1}>{plant.species}</Text>
        ) : null}
        {plant.location ? (
          <Text style={styles.cardLocation}>📍 {plant.location}</Text>
        ) : null}

        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{wateringLabel(plant)}</Text>
        </View>
      </TouchableOpacity>

      {/* Water button — always visible */}
      <TouchableOpacity
        style={[styles.waterBtn, { borderTopColor: cfg.color + '44' }]}
        onPress={onWater}
        activeOpacity={0.7}
      >
        <Text style={[styles.waterBtnText, { color: cfg.color }]}>💧 Water</Text>
      </TouchableOpacity>

      {/* Expanded actions */}
      {expanded && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => { setExpanded(false); onEdit(); }}
          >
            <Text style={[styles.actionText, { color: colors.primaryDark }]}>✏ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionChip, styles.actionDelete]}
            onPress={() => { setExpanded(false); onDelete(); }}
          >
            <Text style={[styles.actionText, { color: '#991B1B' }]}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type FormState = {
  name: string;
  species: string;
  intervalDays: number;
  customInterval: string;
  useCustom: boolean;
  location: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  species: '',
  intervalDays: 7,
  customInterval: '',
  useCustom: false,
  location: '',
  notes: '',
};

function PlantModal({ visible, editing, onClose }: {
  visible: boolean;
  editing: Plant | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editing) {
        const isPreset = INTERVAL_PRESETS.includes(editing.wateringIntervalDays as any);
        setForm({
          name: editing.name,
          species: editing.species ?? '',
          intervalDays: editing.wateringIntervalDays,
          customInterval: isPreset ? '' : String(editing.wateringIntervalDays),
          useCustom: !isPreset,
          location: editing.location ?? '',
          notes: editing.notes ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, editing]);

  const set = <K extends keyof FormState>(key: K) => (val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const resolvedInterval = form.useCustom
    ? (parseInt(form.customInterval, 10) || 7)
    : form.intervalDays;

  const canSave = form.name.trim().length > 0 && resolvedInterval > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    if (editing) {
      await updatePlant(editing, {
        name: form.name,
        species: form.species.trim() || null,
        wateringIntervalDays: resolvedInterval,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      });
    } else {
      await createPlant(
        form.name,
        resolvedInterval,
        form.species.trim() || null,
        form.location.trim() || null,
        form.notes.trim() || null,
      );
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Plant' : 'Add Plant'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <TextInput
              autoFocus
              style={styles.nameInput}
              placeholder="Plant name"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={set('name')}
            />

            {/* Species */}
            <Text style={styles.sectionLabel}>Species (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Monstera deliciosa"
              placeholderTextColor={colors.textMuted}
              value={form.species}
              onChangeText={set('species')}
            />

            {/* Watering interval */}
            <Text style={styles.sectionLabel}>Water every</Text>
            <View style={styles.presetsRow}>
              {INTERVAL_PRESETS.map((d) => {
                const active = !form.useCustom && form.intervalDays === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => setForm((f) => ({ ...f, intervalDays: d, useCustom: false, customInterval: '' }))}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {d}d
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.presetChip, form.useCustom && styles.presetChipActive]}
                onPress={() => setForm((f) => ({ ...f, useCustom: true }))}
              >
                <Text style={[styles.presetChipText, form.useCustom && styles.presetChipTextActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {form.useCustom && (
              <View style={styles.customIntervalRow}>
                <TextInput
                  style={styles.customIntervalInput}
                  keyboardType="number-pad"
                  placeholder="e.g. 28"
                  placeholderTextColor={colors.textMuted}
                  value={form.customInterval}
                  onChangeText={set('customInterval')}
                />
                <Text style={styles.customIntervalUnit}>days</Text>
              </View>
            )}

            {/* Location */}
            <Text style={styles.sectionLabel}>Location (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. living room windowsill"
              placeholderTextColor={colors.textMuted}
              value={form.location}
              onChangeText={set('location')}
            />

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              placeholder="Care tips, light preference, pot size…"
              placeholderTextColor={colors.textMuted}
              value={form.notes}
              onChangeText={set('notes')}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add plant'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Plants Screen ────────────────────────────────────────────────────────────

export function PlantsScreen() {
  const plants = usePlants();
  const { width } = useWindowDimensions();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);

  // Responsive: 2 cols on mobile, 3 on tablet, 4 on wide desktop
  const numCols = width >= 1100 ? 4 : width >= 768 ? 3 : 2;
  const GUTTER = spacing.md;
  const cardWidth = (width - GUTTER * (numCols + 1)) / numCols;

  // Sort: overdue + never first, then by name
  const sortedPlants = [...plants].sort((a, b) => {
    const priority = { overdue: 0, never: 1, today: 2, soon: 3, ok: 4 };
    const pa = priority[a.wateringStatus];
    const pb = priority[b.wateringStatus];
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  const handleWater = useCallback(async (plant: Plant) => {
    await waterPlantAndSchedule(plant);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleDelete = useCallback(async (plant: Plant) => {
    await deletePlant(plant);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const openAdd = useCallback(() => { setEditing(null); setShowModal(true); }, []);
  const openEdit = useCallback((p: Plant) => { setEditing(p); setShowModal(true); }, []);

  const needsWaterCount = plants.filter(
    (p) => p.wateringStatus === 'overdue' || p.wateringStatus === 'today' || p.wateringStatus === 'never'
  ).length;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.heading}>Plants</Text>
          {needsWaterCount > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>💧 {needsWaterCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🪴</Text>
          <Text style={styles.emptyTitle}>No plants yet</Text>
          <Text style={styles.emptyBody}>Add your plants and tADiHD will remind you when they need water.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.85}>
            <Text style={styles.emptyAddBtnText}>+ Add first plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedPlants}
          keyExtractor={(item) => item.id}
          numColumns={numCols}
          key={numCols} // force re-render when column count changes
          contentContainerStyle={[styles.grid, { padding: GUTTER }]}
          columnWrapperStyle={numCols > 1 ? { gap: GUTTER } : undefined}
          ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
          renderItem={({ item }) => (
            <PlantCard
              plant={item}
              cardWidth={cardWidth}
              onWater={() => handleWater(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <PlantModal
        visible={showModal}
        editing={editing}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  alertBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  addBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.surface },

  grid: {},

  card: {
    borderRadius: radius.lg,
    borderTopWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMain: { padding: spacing.md, gap: 4 },
  cardEmoji: { fontSize: 32, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSpecies: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  cardLocation: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  waterBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  waterBtnText: { fontSize: 13, fontWeight: '700' },

  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  actionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionDelete: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', marginLeft: 'auto' },
  actionText: { fontSize: 12, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  emptyAddBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  emptyAddBtnText: { fontSize: 16, fontWeight: '700', color: colors.surface },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.lg, paddingBottom: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  cancelText: { fontSize: 16, color: colors.textMuted },
  nameInput: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  presetChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  presetChipTextActive: { color: colors.primaryDark },
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  customIntervalInput: {
    width: 80,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  customIntervalUnit: { fontSize: 15, color: colors.textMuted },
  saveBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.surface },
});
