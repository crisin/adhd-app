import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRooms } from '../hooks/useRooms';
import { createRoom, updateRoom, deleteRoom, getRoomPath } from '../db/actions';
import { Room } from '../db/models/Room';
import { colors, spacing, radius } from '../theme/tokens';

const EMOJI_PRESETS = ['🏠', '🛋', '🍳', '🛏', '💻', '🚿', '🔧', '🌿', '📦', '🚗', '🏢', '🎮'];

// ─── Tree helpers ────────────────────────────────────────────────────────────

function buildTree(rooms: Room[]): Map<string | null, Room[]> {
  const tree = new Map<string | null, Room[]>();
  for (const room of rooms) {
    const parentKey = room.parentId || null;
    if (!tree.has(parentKey)) tree.set(parentKey, []);
    tree.get(parentKey)!.push(room);
  }
  return tree;
}

// ─── Tree Node ───────────────────────────────────────────────────────────────

function LocationNode({
  room,
  tree,
  depth,
  allRooms,
  onEdit,
  onAddChild,
  onDelete,
}: {
  room: Room;
  tree: Map<string | null, Room[]>;
  depth: number;
  allRooms: Room[];
  onEdit: (room: Room) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (room: Room) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = tree.get(room.id) ?? [];
  const hasChildren = children.length > 0;

  return (
    <View>
      <TouchableOpacity
        style={[styles.node, { paddingLeft: spacing.md + depth * 24 }]}
        onPress={() => hasChildren && setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        {hasChildren ? (
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={14}
            color={colors.textMuted}
          />
        ) : (
          <View style={styles.leafDot} />
        )}
        <Text style={styles.nodeEmoji}>{room.emoji || '📍'}</Text>
        <Text style={styles.nodeName} numberOfLines={1}>{room.name}</Text>
        <View style={styles.nodeActions}>
          <TouchableOpacity onPress={() => onAddChild(room.id)} style={styles.nodeBtn}>
            <Ionicons name="add" size={18} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(room)} style={styles.nodeBtn}>
            <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(room)} style={styles.nodeBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {expanded && children.map((child) => (
        <LocationNode
          key={child.id}
          room={child}
          tree={tree}
          depth={depth + 1}
          allRooms={allRooms}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

// ─── Add/Edit Modal ──────────────────────────────────────────────────────────

function LocationModal({
  visible,
  editingRoom,
  parentId,
  allRooms,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingRoom: Room | null;
  parentId: string | null;
  allRooms: Room[];
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(editingRoom?.name ?? '');
  const [emoji, setEmoji] = useState(editingRoom?.emoji ?? '');
  const [saving, setSaving] = useState(false);

  const parentRoom = parentId ? allRooms.find((r) => r.id === parentId) : null;
  const parentPath = parentRoom ? getRoomPath(parentRoom, allRooms) : null;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    if (editingRoom) {
      await updateRoom(editingRoom, { name, emoji: emoji || null });
    } else {
      await createRoom(name, emoji || null, null, parentId);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingRoom ? 'Edit Location' : 'New Location'}</Text>
            {parentPath && (
              <Text style={styles.modalParent}>Inside: {parentPath}</Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Location name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiItem, emoji === e && styles.emojiItemActive]}
                  onPress={() => setEmoji(emoji === e ? '' : e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, !name.trim() && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!name.trim() || saving}
            >
              <Text style={styles.modalSaveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Locations Screen ────────────────────────────────────────────────────────

export function LocationsScreen() {
  const rooms = useRooms();
  const tree = buildTree(rooms);
  const topLevel = tree.get(null) ?? [];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);

  const handleAddRoot = () => {
    setEditingRoom(null);
    setParentIdForNew(null);
    setModalVisible(true);
  };

  const handleAddChild = useCallback((parentId: string) => {
    setEditingRoom(null);
    setParentIdForNew(parentId);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((room: Room) => {
    setEditingRoom(room);
    setParentIdForNew(null);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(async (room: Room) => {
    await deleteRoom(room);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Locations</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddRoot} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Location</Text>
        </TouchableOpacity>
      </View>

      {rooms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No locations yet</Text>
          <Text style={styles.emptyHint}>
            Create locations like Home {'>'} Living Room {'>'} Bookshelf to organize your inventory and plants
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={handleAddRoot}>
            <Text style={styles.emptyBtnText}>Create first location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
          {topLevel.map((room) => (
            <LocationNode
              key={room.id}
              room={room}
              tree={tree}
              depth={0}
              allRooms={rooms}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}

      <LocationModal
        visible={modalVisible}
        editingRoom={editingRoom}
        parentId={parentIdForNew}
        allRooms={rooms}
        onClose={() => setModalVisible(false)}
        onSave={() => {}}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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

  // Tree
  treeScroll: { flex: 1 },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leafDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  nodeEmoji: { fontSize: 18 },
  nodeName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  nodeActions: { flexDirection: 'row', gap: 2 },
  nodeBtn: { padding: 6 },

  // Empty state
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  emptyBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: colors.surface },

  // Modal
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  modalParent: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiItemActive: { borderWidth: 2, borderColor: colors.primaryDark, backgroundColor: colors.primaryLight },
  emojiText: { fontSize: 22 },
  modalSaveBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalSaveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
