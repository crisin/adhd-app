import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useInventoryItems } from '../hooks/useInventoryItems';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../db/actions';
import { InventoryItem, InventoryRoom } from '../db/models/InventoryItem';
import { colors, spacing, radius } from '../theme/tokens';

// ─── Room config ──────────────────────────────────────────────────────────────

const ROOMS: { value: InventoryRoom; label: string; emoji: string; color: string }[] = [
  { value: 'kitchen',     label: 'Kitchen',      emoji: '🍳', color: '#F59E0B' },
  { value: 'bathroom',    label: 'Bathroom',     emoji: '🚿', color: '#06B6D4' },
  { value: 'bedroom',     label: 'Bedroom',      emoji: '🛏',  color: '#8B5CF6' },
  { value: 'living_room', label: 'Living Room',  emoji: '🛋',  color: '#10B981' },
  { value: 'office',      label: 'Office',       emoji: '💻', color: '#3B82F6' },
  { value: 'garage',      label: 'Garage',       emoji: '🔧', color: '#6B7280' },
  { value: 'garden',      label: 'Garden',       emoji: '🌿', color: '#22C55E' },
  { value: 'other',       label: 'Other',        emoji: '📦', color: '#94A3B8' },
];

function getRoomMeta(value: InventoryRoom) {
  return ROOMS.find((r) => r.value === value) ?? ROOMS[ROOMS.length - 1];
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, onEdit, onDelete }: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const room = getRoomMeta(item.room);

  return (
    <View style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemMain}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.itemEmoji}>{room.emoji}</Text>
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.location ? (
            <Text style={styles.itemLocation}>📍 {item.location}</Text>
          ) : null}
          {item.notes ? (
            <Text style={styles.itemNotes} numberOfLines={expanded ? undefined : 1}>{item.notes}</Text>
          ) : null}
        </View>
        <View style={styles.itemQtyBadge}>
          <Text style={styles.itemQtyText}>×{item.quantity}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itemActions}>
          <TouchableOpacity style={[styles.actionChip, styles.actionEdit]} onPress={() => { setExpanded(false); onEdit(); }}>
            <Text style={[styles.actionChipText, { color: colors.primaryDark }]}>✏ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionChip, styles.actionDelete]} onPress={() => { setExpanded(false); onDelete(); }}>
            <Text style={[styles.actionChipText, { color: '#991B1B' }]}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type ItemFormState = {
  name: string;
  room: InventoryRoom;
  location: string;
  quantity: string;
  notes: string;
};

const EMPTY_FORM: ItemFormState = {
  name: '',
  room: 'kitchen',
  location: '',
  quantity: '1',
  notes: '',
};

function ItemModal({ visible, editing, onClose }: {
  visible: boolean;
  editing: InventoryItem | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  React.useEffect(() => {
    if (visible) {
      if (editing) {
        setForm({
          name: editing.name,
          room: editing.room,
          location: editing.location ?? '',
          quantity: String(editing.quantity),
          notes: editing.notes ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, editing]);

  const canSave = form.name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const qty = parseInt(form.quantity, 10);
    const quantity = isNaN(qty) || qty < 1 ? 1 : qty;
    if (editing) {
      await updateInventoryItem(editing, {
        name: form.name,
        room: form.room,
        location: form.location.trim() || null,
        quantity,
        notes: form.notes.trim() || null,
      });
    } else {
      await createInventoryItem(
        form.name,
        form.room,
        form.location.trim() || null,
        quantity,
        form.notes.trim() || null,
      );
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    onClose();
  };

  const set = (key: keyof ItemFormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

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
              <Text style={styles.modalTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <TextInput
              autoFocus
              style={styles.nameInput}
              placeholder="What is it?"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={set('name')}
            />

            {/* Room */}
            <Text style={styles.sectionLabel}>Room</Text>
            <View style={styles.roomGrid}>
              {ROOMS.map((r) => {
                const active = form.room === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roomChip, active && { backgroundColor: r.color, borderColor: r.color }]}
                    onPress={() => set('room')(r.value)}
                  >
                    <Text style={styles.roomChipEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roomChipLabel, active && { color: '#fff' }]}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location */}
            <Text style={styles.sectionLabel}>Specific location (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. top shelf, junk drawer…"
              placeholderTextColor={colors.textMuted}
              value={form.location}
              onChangeText={set('location')}
            />

            {/* Quantity */}
            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  const v = Math.max(1, parseInt(form.quantity, 10) - 1);
                  set('quantity')(String(v));
                }}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                keyboardType="number-pad"
                value={form.quantity}
                onChangeText={set('quantity')}
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  const v = (parseInt(form.quantity, 10) || 0) + 1;
                  set('quantity')(String(v));
                }}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              placeholder="Brand, size, expiry, anything useful…"
              placeholderTextColor={colors.textMuted}
              value={form.notes}
              onChangeText={set('notes')}
              multiline
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add item'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────────────────

export function InventoryScreen() {
  const allItems = useInventoryItems();
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<InventoryRoom | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const handleDelete = useCallback(async (item: InventoryItem) => {
    await deleteInventoryItem(item);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((item: InventoryItem) => {
    setEditing(item);
    setShowModal(true);
  }, []);

  // Filter + group by room
  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = allItems.filter((item) => {
      const matchRoom = roomFilter ? item.room === roomFilter : true;
      const matchSearch = query
        ? item.name.toLowerCase().includes(query) ||
          (item.location ?? '').toLowerCase().includes(query) ||
          (item.notes ?? '').toLowerCase().includes(query)
        : true;
      return matchRoom && matchSearch;
    });

    // Group by room
    const map = new Map<InventoryRoom, InventoryItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.room) ?? [];
      arr.push(item);
      map.set(item.room, arr);
    }

    // Sort sections by ROOMS order
    return ROOMS
      .filter((r) => map.has(r.value))
      .map((r) => ({
        room: r,
        data: map.get(r.value)!,
      }));
  }, [allItems, search, roomFilter]);

  const totalCount = allItems.length;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.heading}>Inventory</Text>
          {totalCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Room filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !roomFilter && styles.filterChipActive]}
            onPress={() => setRoomFilter(null)}
          >
            <Text style={[styles.filterChipText, !roomFilter && styles.filterChipTextActive]}>All rooms</Text>
          </TouchableOpacity>
          {ROOMS.map((r) => {
            const active = roomFilter === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.filterChip, active && { backgroundColor: r.color, borderColor: r.color }]}
                onPress={() => setRoomFilter(active ? null : r.value)}
              >
                <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{r.emoji} {r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{search ? '🔍' : '📦'}</Text>
          <Text style={styles.emptyTitle}>{search ? 'Nothing found' : 'House is empty?'}</Text>
          <Text style={styles.emptyBody}>
            {search
              ? `No items match "${search}"`
              : 'Start adding things around the house so you always know what you have and where it is.'}
          </Text>
          {!search && (
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.85}>
              <Text style={styles.emptyAddBtnText}>+ Add first item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { borderLeftColor: section.room.color }]}>
              <Text style={styles.sectionEmoji}>{section.room.emoji}</Text>
              <Text style={[styles.sectionTitle, { color: section.room.color }]}>{section.room.label}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      <ItemModal
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
  badge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  addBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.surface },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  searchClear: { padding: 4 },
  searchClearText: { fontSize: 12, color: colors.textMuted },

  filterScroll: { maxHeight: 44, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, alignItems: 'center' },
  filterChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryDark },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.xs },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  sectionBadge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.full },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemMain: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.sm, gap: spacing.sm },
  itemEmoji: { fontSize: 20, marginTop: 2 },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  itemLocation: { fontSize: 12, color: colors.textMuted, marginBottom: 1 },
  itemNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  itemQtyBadge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start' },
  itemQtyText: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  actionChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actionEdit: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  actionDelete: { backgroundColor: '#FEE2E2', borderColor: '#FECACA', marginLeft: 'auto' },
  actionChipText: { fontSize: 12, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
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
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  roomChip: {
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
  roomChipEmoji: { fontSize: 14 },
  roomChipLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
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
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 22, fontWeight: '600', color: colors.text, lineHeight: 26 },
  qtyInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  saveBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: colors.surface },
});
