import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { confirmDelete } from '../utils/confirm';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { CalendarEvent } from '../db/models/CalendarEvent';
import { createCalendarEvent, deleteCalendarEvent } from '../db/actions';
import {
  useSettingsStore,
  CalendarSourceKey,
  CALENDAR_SOURCE_LABELS,
  CALENDAR_SOURCE_ICONS,
} from '../store/useSettingsStore';

type ViewMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ALL_SOURCES: CalendarSourceKey[] = ['manual', 'task-due', 'plant-reminder', 'device'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay();
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sourceColor(source: string, calendarColors: Record<CalendarSourceKey, string>): string {
  return calendarColors[source as CalendarSourceKey] ?? colors.primaryDark;
}

function sourceLabel(source: string): string {
  return CALENDAR_SOURCE_LABELS[source as CalendarSourceKey] ?? source;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const calendarColors = useSettingsStore((s) => s.calendarColors);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<CalendarSourceKey>>(new Set(ALL_SOURCES));

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'month') {
      return { rangeStart: startOfMonth(focusDate).getTime(), rangeEnd: endOfMonth(focusDate).getTime() };
    }
    if (viewMode === 'week') {
      return { rangeStart: startOfWeek(focusDate).getTime(), rangeEnd: endOfWeek(focusDate).getTime() };
    }
    const ds = new Date(focusDate); ds.setHours(0, 0, 0, 0);
    const de = new Date(focusDate); de.setHours(23, 59, 59, 999);
    return { rangeStart: ds.getTime(), rangeEnd: de.getTime() };
  }, [focusDate, viewMode]);

  const allEvents = useCalendarEvents(rangeStart, rangeEnd);

  // Apply source filters
  const events = useMemo(
    () => allEvents.filter((e) => activeFilters.has(e.source as CalendarSourceKey)),
    [allEvents, activeFilters]
  );

  const eventsForDay = useCallback(
    (date: Date) => events.filter((e) => isSameDay(new Date(e.startAt), date)),
    [events]
  );

  const today = new Date();

  const toggleFilter = (source: CalendarSourceKey) => {
    Haptics.selectionAsync();
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        if (next.size > 1) next.delete(source); // don't allow all off
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const allFiltersActive = activeFilters.size === ALL_SOURCES.length;

  const navigatePrev = () => {
    Haptics.selectionAsync();
    const d = new Date(focusDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setFocusDate(d);
  };

  const navigateNext = () => {
    Haptics.selectionAsync();
    const d = new Date(focusDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setFocusDate(d);
  };

  const goToToday = () => {
    Haptics.selectionAsync();
    setFocusDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayPress = (date: Date) => {
    Haptics.selectionAsync();
    setSelectedDate(date);
    if (viewMode === 'month') {
      setViewMode('day');
      setFocusDate(date);
    }
  };

  const headerTitle = viewMode === 'month'
    ? `${MONTHS[focusDate.getMonth()]} ${focusDate.getFullYear()}`
    : viewMode === 'week'
    ? `Week of ${focusDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : focusDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add-circle" size={28} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* Navigation + view toggle */}
        <View style={styles.headerControls}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={navigatePrev} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateNext} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.viewToggle}>
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewBtn, viewMode === mode && styles.viewBtnActive]}
                onPress={() => { setViewMode(mode); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.viewBtnText, viewMode === mode && styles.viewBtnTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Source filters ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {/* All toggle */}
            <TouchableOpacity
              style={[styles.filterChip, allFiltersActive && styles.filterChipAllActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveFilters(new Set(ALL_SOURCES));
              }}
            >
              <Text style={[styles.filterChipText, allFiltersActive && styles.filterChipTextAllActive]}>All</Text>
            </TouchableOpacity>

            {ALL_SOURCES.map((src) => {
              const active = activeFilters.has(src);
              const color = calendarColors[src];
              return (
                <TouchableOpacity
                  key={src}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color + '22', borderColor: color },
                  ]}
                  onPress={() => toggleFilter(src)}
                >
                  <Ionicons
                    name={(CALENDAR_SOURCE_ICONS[src] + (active ? '' : '-outline')) as any}
                    size={14}
                    color={active ? color : colors.textMuted}
                  />
                  <Text style={[styles.filterChipText, active && { color }]}>
                    {CALENDAR_SOURCE_LABELS[src]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {viewMode === 'month' && (
        <MonthView
          year={focusDate.getFullYear()}
          month={focusDate.getMonth()}
          today={today}
          selectedDate={selectedDate}
          eventsForDay={eventsForDay}
          onDayPress={handleDayPress}
          calendarColors={calendarColors}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          focusDate={focusDate}
          today={today}
          selectedDate={selectedDate}
          eventsForDay={eventsForDay}
          onDayPress={handleDayPress}
          calendarColors={calendarColors}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          date={focusDate}
          events={eventsForDay(focusDate)}
          onDelete={deleteCalendarEvent}
          calendarColors={calendarColors}
        />
      )}

      {/* ── Add Event Modal ── */}
      <AddEventModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialDate={selectedDate ?? focusDate}
      />
    </View>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, today, selectedDate, eventsForDay, onDayPress, calendarColors,
}: {
  year: number; month: number; today: Date; selectedDate: Date | null;
  eventsForDay: (d: Date) => CalendarEvent[]; onDayPress: (d: Date) => void;
  calendarColors: Record<CalendarSourceKey, string>;
}) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <ScrollView style={styles.monthContainer} contentContainerStyle={styles.monthContent}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {grid.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={styles.dayCell} />;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const dayEvents = eventsForDay(date);
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => onDayPress(date)}
              activeOpacity={0.7}
            >
              <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                  {date.getDate()}
                </Text>
              </View>
              {dayEvents.length > 0 && (
                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 3).map((e) => (
                    <View
                      key={e.id}
                      style={[styles.dot, { backgroundColor: sourceColor(e.source, calendarColors) }]}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <Text style={styles.dotMore}>+{dayEvents.length - 3}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  focusDate, today, selectedDate, eventsForDay, onDayPress, calendarColors,
}: {
  focusDate: Date; today: Date; selectedDate: Date | null;
  eventsForDay: (d: Date) => CalendarEvent[]; onDayPress: (d: Date) => void;
  calendarColors: Record<CalendarSourceKey, string>;
}) {
  const weekStart = startOfWeek(focusDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <ScrollView style={styles.weekContainer}>
      {days.map((date, idx) => {
        const isToday = isSameDay(date, today);
        const dayEvents = eventsForDay(date);
        return (
          <TouchableOpacity
            key={date.toISOString()}
            style={[styles.weekDay, isToday && styles.weekDayToday]}
            onPress={() => onDayPress(date)}
            activeOpacity={0.7}
          >
            <View style={styles.weekDayHeader}>
              <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                {WEEKDAYS[idx]}
              </Text>
              <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                {date.getDate()}
              </Text>
            </View>
            <View style={styles.weekDayEvents}>
              {dayEvents.length === 0 && (
                <Text style={styles.noEventsText}>No events</Text>
              )}
              {dayEvents.map((e) => (
                <View key={e.id} style={[styles.eventChip, { borderLeftColor: sourceColor(e.source, calendarColors) }]}>
                  <View style={[styles.eventChipDot, { backgroundColor: sourceColor(e.source, calendarColors) }]} />
                  <Text style={styles.eventChipTime}>
                    {e.allDay ? 'All day' : formatTime(e.startAt)}
                  </Text>
                  <Text style={styles.eventChipTitle} numberOfLines={1}>{e.title}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  date, events, onDelete, calendarColors,
}: {
  date: Date; events: CalendarEvent[]; onDelete: (e: CalendarEvent) => void;
  calendarColors: Record<CalendarSourceKey, string>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScrollView style={styles.dayContainer}>
      {events.length === 0 && (
        <View style={styles.emptyDay}>
          <Ionicons name="calendar-outline" size={48} color={colors.border} />
          <Text style={styles.emptyDayText}>No events for this day</Text>
        </View>
      )}
      {events.map((event) => {
        const isExpanded = expandedId === event.id;
        const evtColor = sourceColor(event.source, calendarColors);
        return (
          <TouchableOpacity
            key={event.id}
            style={[styles.dayEventCard, { borderLeftColor: evtColor }]}
            onPress={() => setExpandedId(isExpanded ? null : event.id)}
            activeOpacity={0.7}
          >
            <View style={styles.dayEventHeader}>
              <Text style={styles.dayEventTime}>
                {event.allDay ? 'All day' : formatTime(event.startAt)}
                {event.endAt && !event.allDay ? ` – ${formatTime(event.endAt)}` : ''}
              </Text>
              <View style={[styles.sourceBadge, { backgroundColor: evtColor }]}>
                <Text style={styles.sourceBadgeText}>{sourceLabel(event.source)}</Text>
              </View>
            </View>
            <Text style={styles.dayEventTitle}>{event.title}</Text>
            {event.description && isExpanded ? (
              <Text style={styles.dayEventDesc}>{event.description}</Text>
            ) : null}
            {isExpanded && event.source === 'manual' ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={async () => {
                  const ok = await confirmDelete('Delete Event', `Remove "${event.title}"? This cannot be undone.`);
                  if (!ok) return;
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  onDelete(event);
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

function AddEventModal({
  visible, onClose, initialDate,
}: {
  visible: boolean; onClose: () => void; initialDate: Date;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startHour, setStartHour] = useState('9');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');

  const handleSave = async () => {
    if (!title.trim()) return;
    const start = new Date(initialDate);
    start.setHours(0, 0, 0, 0);

    let startAt: number;
    let endAt: number | undefined;

    if (allDay) {
      startAt = start.getTime();
    } else {
      start.setHours(parseInt(startHour, 10), parseInt(startMinute, 10));
      startAt = start.getTime();
      const end = new Date(initialDate);
      end.setHours(parseInt(endHour, 10), parseInt(endMinute, 10));
      endAt = end.getTime();
    }

    await createCalendarEvent(title, startAt, {
      description: description || null,
      endAt: endAt ?? null,
      allDay,
      source: 'manual',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Event</Text>
            <Text style={styles.modalDate}>
              {initialDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Event title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.modalInputMulti]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity style={styles.allDayRow} onPress={() => setAllDay(!allDay)}>
              <Text style={styles.allDayLabel}>All day</Text>
              <View style={[styles.toggle, allDay && styles.toggleActive]}>
                <View style={[styles.toggleThumb, allDay && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            {!allDay ? (
              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <View style={styles.timeInputs}>
                    <TextInput style={styles.timeInput} value={startHour} onChangeText={setStartHour} keyboardType="number-pad" maxLength={2} />
                    <Text style={styles.timeColon}>:</Text>
                    <TextInput style={styles.timeInput} value={startMinute} onChangeText={setStartMinute} keyboardType="number-pad" maxLength={2} />
                  </View>
                </View>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeLabel}>End</Text>
                  <View style={styles.timeInputs}>
                    <TextInput style={styles.timeInput} value={endHour} onChangeText={setEndHour} keyboardType="number-pad" maxLength={2} />
                    <Text style={styles.timeColon}>:</Text>
                    <TextInput style={styles.timeInput} value={endMinute} onChangeText={setEndMinute} keyboardType="number-pad" maxLength={2} />
                  </View>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={styles.saveBtnText}>Save Event</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md },
  headerTitle: { fontSize: typography.fontSizeLg, fontWeight: '800', color: colors.text },
  addBtn: { padding: spacing.xs },
  headerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navBtn: { padding: spacing.xs },
  todayBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.primaryLight },
  todayBtnText: { fontSize: typography.fontSizeSm, fontWeight: '600', color: colors.primaryDark },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 2 },
  viewBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  viewBtnActive: { backgroundColor: colors.surface },
  viewBtnText: { fontSize: typography.fontSizeXs, fontWeight: '600', color: colors.textMuted },
  viewBtnTextActive: { color: colors.primaryDark },

  // Source filters
  filterScroll: { marginTop: spacing.sm, marginHorizontal: -spacing.lg },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  filterChip: {
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
  filterChipAllActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTextAllActive: { color: colors.primaryDark },

  // Month view
  monthContainer: { flex: 1 },
  monthContent: { padding: spacing.sm },
  weekdayRow: { flexDirection: 'row' },
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  weekdayText: { fontSize: typography.fontSizeXs, fontWeight: '600', color: colors.textMuted },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', minHeight: 60, padding: 2, alignItems: 'center' },
  dayCellSelected: { backgroundColor: colors.primaryLight, borderRadius: radius.sm },
  dayNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumberToday: { backgroundColor: colors.primaryDark },
  dayText: { fontSize: typography.fontSizeSm, fontWeight: '500', color: colors.text },
  dayTextToday: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotMore: { fontSize: 8, color: colors.textMuted },

  // Week view
  weekContainer: { flex: 1, padding: spacing.sm },
  weekDay: { backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.sm, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.border },
  weekDayToday: { borderLeftColor: colors.primaryDark },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  weekDayName: { fontSize: typography.fontSizeSm, fontWeight: '600', color: colors.textMuted },
  weekDayNameToday: { color: colors.primaryDark },
  weekDayNum: { fontSize: typography.fontSizeLg, fontWeight: '800', color: colors.text },
  weekDayNumToday: { color: colors.primaryDark },
  weekDayEvents: { gap: spacing.xs },
  noEventsText: { fontSize: typography.fontSizeXs, color: colors.textMuted, fontStyle: 'italic' },
  eventChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 4, paddingHorizontal: spacing.sm, borderLeftWidth: 3, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  eventChipDot: { width: 6, height: 6, borderRadius: 3 },
  eventChipTime: { fontSize: typography.fontSizeXs, color: colors.textMuted, fontWeight: '500', minWidth: 56 },
  eventChipTitle: { fontSize: typography.fontSizeSm, fontWeight: '600', color: colors.text, flex: 1 },

  // Day view
  dayContainer: { flex: 1, padding: spacing.md },
  emptyDay: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyDayText: { fontSize: typography.fontSizeMd, color: colors.textMuted },
  dayEventCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4 },
  dayEventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  dayEventTime: { fontSize: typography.fontSizeSm, fontWeight: '600', color: colors.textMuted },
  dayEventTitle: { fontSize: typography.fontSizeMd, fontWeight: '700', color: colors.text },
  dayEventDesc: { fontSize: typography.fontSizeSm, color: colors.textMuted, marginTop: spacing.xs },
  sourceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.xs },
  deleteBtnText: { fontSize: typography.fontSizeSm, color: colors.danger, fontWeight: '600' },

  // Modal
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.sm, paddingHorizontal: spacing.lg },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.fontSizeLg, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  modalDate: { fontSize: typography.fontSizeSm, color: colors.textMuted, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, fontSize: typography.fontSizeMd, color: colors.text, marginBottom: spacing.sm },
  modalInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  allDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  allDayLabel: { fontSize: typography.fontSizeMd, fontWeight: '600', color: colors.text },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceMuted, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  timeRow: { flexDirection: 'row', gap: spacing.lg, marginVertical: spacing.sm },
  timeGroup: { flex: 1 },
  timeLabel: { fontSize: typography.fontSizeSm, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  timeInputs: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: spacing.sm, fontSize: typography.fontSizeLg, fontWeight: '700', color: colors.text, width: 48, textAlign: 'center' },
  timeColon: { fontSize: typography.fontSizeLg, fontWeight: '700', color: colors.text, marginHorizontal: 4 },
  saveBtn: { backgroundColor: colors.primaryDark, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: typography.fontSizeMd, fontWeight: '700', color: '#fff' },
});
