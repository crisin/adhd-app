import { api } from '../api/client';
import { toTask, toGoal, toIdea, toSubtask, toLabel, toTaskLabel, toInventoryItem, toPlant, toCalendarEvent, toFocusSession, toReminder, toRoom } from '../api/mappers';
import { TaskObj, TaskStatus, TaskCategory, TaskPriority, TaskSource, GoalObj, GoalType, GoalStatus, IdeaObj, SubtaskObj, LabelObj, TaskLabelObj, InventoryItemObj, InventoryRoom, PlantObj, CalendarEventObj, CalendarEventSource, FocusSessionObj, ReminderObj, RoomObj } from '../api/types';

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(
  title: string,
  estimatedMinutes: number | null,
  status: TaskStatus = 'today',
  category: TaskCategory | null = null,
  goalId: string | null = null,
  opts: {
    priority?: TaskPriority;
    dueAt?: number | null;
    source?: TaskSource;
    plantId?: string | null;
    recurrenceRule?: string | null;
  } = {}
): Promise<TaskObj> {
  return api.post<any>('/tasks', {
    title,
    estimatedMinutes,
    status,
    category,
    goalId,
    priority: opts.priority ?? 'medium',
    dueAt: opts.dueAt ?? null,
    source: opts.source ?? 'manual',
    plantId: opts.plantId ?? null,
    recurrenceRule: opts.recurrenceRule ?? null,
  }).then(toTask);
}

export async function updateTaskStatus(task: { id: string }, status: TaskStatus): Promise<void> {
  await api.patch<any>('/tasks/' + task.id, { status });
}

export async function updateTask(
  task: { id: string },
  fields: {
    title?: string;
    notes?: string | null;
    status?: TaskStatus;
    category?: TaskCategory | null;
    priority?: TaskPriority;
    dueAt?: number | null;
    goalId?: string | null;
    estimatedMinutes?: number | null;
    recurrenceRule?: string | null;
  }
): Promise<void> {
  await api.patch<any>('/tasks/' + task.id, fields);
}

export async function updateTaskTitle(task: { id: string }, title: string): Promise<void> {
  await api.patch<any>('/tasks/' + task.id, { title });
}

export async function deleteTask(task: { id: string }): Promise<void> {
  await api.delete<any>('/tasks/' + task.id);
}

export async function archiveTask(task: { id: string }): Promise<void> {
  await api.post<any>('/tasks/' + task.id + '/archive', {});
}

export async function startFocusSession(task: { id: string }, plannedMinutes: number): Promise<FocusSessionObj> {
  const result = await api.post<any>('/tasks/' + task.id + '/focus-start', { plannedMinutes });
  return toFocusSession(result.session);
}

export async function endFocusSession(
  session: { id: string },
  task: { id: string },
  completed: boolean
): Promise<void> {
  await api.post<any>('/tasks/' + task.id + '/focus-end', { sessionId: session.id, completed });
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function createSubtask(taskId: string, title: string): Promise<SubtaskObj> {
  return api.post<any>('/subtasks', { taskId, title }).then(toSubtask);
}

export async function toggleSubtask(subtask: { id: string; done: boolean }): Promise<void> {
  await api.patch<any>('/subtasks/' + subtask.id, { done: !subtask.done });
}

export async function updateSubtaskTitle(subtask: { id: string }, title: string): Promise<void> {
  await api.patch<any>('/subtasks/' + subtask.id, { title });
}

export async function deleteSubtask(subtask: { id: string }): Promise<void> {
  await api.delete<any>('/subtasks/' + subtask.id);
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function createLabel(name: string, color: string): Promise<LabelObj> {
  return api.post<any>('/labels', { name, color }).then(toLabel);
}

export async function updateLabel(label: { id: string }, fields: { name?: string; color?: string }): Promise<void> {
  await api.patch<any>('/labels/' + label.id, fields);
}

export async function deleteLabel(label: { id: string }): Promise<void> {
  await api.delete<any>('/labels/' + label.id);
}

export async function addLabelToTask(taskId: string, labelId: string): Promise<TaskLabelObj> {
  return api.post<any>('/task-labels', { taskId, labelId }).then(toTaskLabel);
}

export async function removeLabelFromTask(taskId: string, labelId: string): Promise<void> {
  await api.delete<any>(`/task-labels?task_id=${encodeURIComponent(taskId)}&label_id=${encodeURIComponent(labelId)}`);
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(
  title: string,
  type: GoalType,
  description: string | null = null,
  category: TaskCategory | null = null,
  targetDate: Date | null = null
): Promise<GoalObj> {
  return api.post<any>('/goals', {
    title,
    type,
    description,
    category,
    targetDate: targetDate ? targetDate.getTime() : null,
  }).then(toGoal);
}

export async function updateGoalStatus(goal: { id: string }, status: GoalStatus): Promise<void> {
  await api.patch<any>('/goals/' + goal.id, { status });
}

export async function deleteGoal(goal: { id: string }): Promise<void> {
  await api.delete<any>('/goals/' + goal.id);
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function createIdea(content: string): Promise<IdeaObj> {
  return api.post<any>('/ideas', { content }).then(toIdea);
}

export async function markIdeaProcessed(idea: { id: string }): Promise<void> {
  await api.patch<any>('/ideas/' + idea.id, { processed: true });
}

export async function deleteIdea(idea: { id: string }): Promise<void> {
  await api.delete<any>('/ideas/' + idea.id);
}

export async function ideaToTask(
  idea: { id: string },
  status: TaskStatus = 'today',
  category: TaskCategory | null = null
): Promise<TaskObj> {
  return api.post<any>('/ideas/' + idea.id + '/to-task', { status, category }).then(toTask);
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(
  name: string,
  emoji: string | null = null,
  color: string | null = null,
  parentId: string | null = null
): Promise<RoomObj> {
  return api.post<any>('/rooms', { name, emoji, color, parentId }).then(toRoom);
}

export async function updateRoom(room: { id: string }, fields: { name?: string; emoji?: string | null; color?: string | null; parentId?: string | null }): Promise<void> {
  await api.patch<any>('/rooms/' + room.id, fields);
}

/** Build breadcrumb path for a room: "Home > Living Room > Shelf" */
export function getRoomPath(room: RoomObj, allRooms: RoomObj[]): string {
  const parts: string[] = [];
  const roomMap = new Map(allRooms.map((r) => [r.id, r]));
  let current: RoomObj | undefined = room;
  while (current) {
    parts.unshift(current.emoji ? `${current.emoji} ${current.name}` : current.name);
    current = current.parentId ? roomMap.get(current.parentId) : undefined;
  }
  return parts.join(' > ');
}

export async function deleteRoom(room: { id: string }): Promise<void> {
  await api.delete<any>('/rooms/' + room.id);
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function createInventoryItem(
  name: string,
  room: InventoryRoom,
  location: string | null = null,
  quantity: number = 1,
  notes: string | null = null,
  roomId: string | null = null
): Promise<InventoryItemObj> {
  return api.post<any>('/inventory', { name, room, location, quantity, notes, roomId }).then(toInventoryItem);
}

export async function updateInventoryItem(
  item: { id: string },
  fields: {
    name?: string;
    room?: InventoryRoom;
    location?: string | null;
    quantity?: number;
    notes?: string | null;
    roomId?: string | null;
  }
): Promise<void> {
  await api.patch<any>('/inventory/' + item.id, fields);
}

export async function deleteInventoryItem(item: { id: string }): Promise<void> {
  await api.delete<any>('/inventory/' + item.id);
}

// ─── Plants ───────────────────────────────────────────────────────────────────

export async function createPlant(
  name: string,
  wateringIntervalDays: number,
  species: string | null = null,
  location: string | null = null,
  notes: string | null = null,
  roomId: string | null = null
): Promise<PlantObj> {
  return api.post<any>('/plants', { name, wateringIntervalDays, species, location, notes, roomId }).then(toPlant);
}

export async function updatePlant(
  plant: { id: string },
  fields: {
    name?: string;
    species?: string | null;
    wateringIntervalDays?: number;
    location?: string | null;
    notes?: string | null;
    roomId?: string | null;
  }
): Promise<void> {
  await api.patch<any>('/plants/' + plant.id, fields);
}

export async function waterPlant(plant: { id: string }): Promise<void> {
  await api.post<any>('/plants/' + plant.id + '/water', {});
}

export async function waterPlantAndSchedule(plant: { id: string }): Promise<void> {
  await api.post<any>('/plants/' + plant.id + '/water-schedule', {});
}

export async function deletePlant(plant: { id: string }): Promise<void> {
  await api.delete<any>('/plants/' + plant.id);
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function createCalendarEvent(
  title: string,
  startAt: number,
  opts: {
    description?: string | null;
    endAt?: number | null;
    allDay?: boolean;
    recurrenceRule?: string | null;
    source?: CalendarEventSource;
    taskId?: string | null;
    plantId?: string | null;
    deviceEventId?: string | null;
  } = {}
): Promise<CalendarEventObj> {
  return api.post<any>('/calendar', {
    title,
    startAt,
    description: opts.description ?? null,
    endAt: opts.endAt ?? null,
    allDay: opts.allDay ?? false,
    recurrenceRule: opts.recurrenceRule ?? null,
    source: opts.source ?? 'manual',
    taskId: opts.taskId ?? null,
    plantId: opts.plantId ?? null,
    deviceEventId: opts.deviceEventId ?? null,
  }).then(toCalendarEvent);
}

export async function updateCalendarEvent(
  event: { id: string },
  fields: {
    title?: string;
    description?: string | null;
    startAt?: number;
    endAt?: number | null;
    allDay?: boolean;
    recurrenceRule?: string | null;
  }
): Promise<void> {
  await api.patch<any>('/calendar/' + event.id, fields);
}

export async function deleteCalendarEvent(event: { id: string }): Promise<void> {
  await api.delete<any>('/calendar/' + event.id);
}
