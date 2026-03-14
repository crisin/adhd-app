import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRooms } from '../hooks/useRooms';
import { getRoomPath } from '../db/actions';
import { Room } from '../db/models/Room';
import { colors, spacing, radius } from '../theme/tokens';

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

function PickerNode({
  room,
  tree,
  depth,
  selectedId,
  onSelect,
}: {
  room: Room;
  tree: Map<string | null, Room[]>;
  depth: number;
  selectedId: string | null;
  onSelect: (room: Room) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = tree.get(room.id) ?? [];
  const hasChildren = children.length > 0;
  const isSelected = room.id === selectedId;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.node,
          { paddingLeft: spacing.md + depth * 24 },
          isSelected && styles.nodeSelected,
        ]}
        onPress={() => onSelect(room)}
        activeOpacity={0.7}
      >
        {hasChildren ? (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8}>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.leafDot} />
        )}
        <Text style={styles.nodeEmoji}>{room.emoji || '📍'}</Text>
        <Text style={styles.nodeName} numberOfLines={1}>{room.name}</Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />
        )}
      </TouchableOpacity>

      {expanded && children.map((child) => (
        <PickerNode
          key={child.id}
          room={child}
          tree={tree}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

// ─── LocationPicker ──────────────────────────────────────────────────────────

export function LocationPicker({
  selectedRoomId,
  onSelect,
  placeholder = 'Select location',
}: {
  selectedRoomId: string | null;
  onSelect: (roomId: string | null) => void;
  placeholder?: string;
}) {
  const rooms = useRooms();
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null;
  const displayText = selectedRoom ? getRoomPath(selectedRoom, rooms) : placeholder;

  const tree = buildTree(rooms);
  const topLevel = tree.get(null) ?? [];

  const handleSelect = (room: Room) => {
    onSelect(room.id);
    setVisible(false);
  };

  const handleClear = () => {
    onSelect(null);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={16} color={selectedRoom ? colors.primaryDark : colors.textMuted} />
        <Text
          style={[styles.triggerText, !selectedRoom && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.scrim} onPress={() => setVisible(false)}>
          <Pressable onPress={() => {}}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Location</Text>
                {selectedRoomId && (
                  <TouchableOpacity onPress={handleClear}>
                    <Text style={styles.clearBtn}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {rooms.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No locations yet. Create some in the Locations tab.</Text>
                </View>
              ) : (
                <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
                  {topLevel.map((room) => (
                    <PickerNode
                      key={room.id}
                      room={room}
                      tree={tree}
                      depth={0}
                      selectedId={selectedRoomId}
                      onSelect={handleSelect}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  triggerText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  triggerPlaceholder: { color: colors.textMuted, fontWeight: '500' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  clearBtn: { fontSize: 14, fontWeight: '600', color: colors.danger },

  treeScroll: { maxHeight: 400 },

  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nodeSelected: { backgroundColor: colors.primaryLight },
  leafDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  nodeEmoji: { fontSize: 18 },
  nodeName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },

  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
