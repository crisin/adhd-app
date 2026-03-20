import {
  TaskObj,
  GoalObj,
  IdeaObj,
  SubtaskObj,
  LabelObj,
  TaskLabelObj,
  InventoryItemObj,
  PlantObj,
  RoomObj,
  CalendarEventObj,
  FocusSessionObj,
  ReminderObj,
} from './types';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function toTask(row: any): TaskObj {
  const dueAt = row.dueAt ?? row.due_at ?? null;
  const completedAtMs = row.completedAt ?? row.completed_at ?? null;
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? null,
    status: row.status,
    category: row.category ?? null,
    goalId: row.goalId ?? row.goal_id ?? null,
    estimatedMinutes: row.estimatedMinutes ?? row.estimated_minutes ?? null,
    actualMinutes: row.actualMinutes ?? row.actual_minutes ?? null,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    completedAt: completedAtMs != null ? new Date(completedAtMs) : null,
    priority: row.priority ?? 'medium',
    dueAt: dueAt,
    recurrenceRule: row.recurrenceRule ?? row.recurrence_rule ?? null,
    source: row.source ?? 'manual',
    plantId: row.plantId ?? row.plant_id ?? null,
    archivedAt: row.archivedAt ?? row.archived_at ?? null,
    createdAt: row.createdAt ?? row.created_at ?? Date.now(),
    isOverdue: dueAt != null && dueAt < todayStart && row.status !== 'done',
    isDueToday: dueAt != null && dueAt >= todayStart && dueAt <= todayEnd,
  };
}

export function toGoal(row: any): GoalObj {
  const completedAtMs = row.completedAt ?? row.completed_at ?? null;
  const targetDateMs = row.targetDate ?? row.target_date ?? null;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    type: row.type,
    status: row.status,
    category: row.category ?? null,
    targetDate: targetDateMs != null ? new Date(targetDateMs) : null,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    completedAt: completedAtMs != null ? new Date(completedAtMs) : null,
    createdAt: row.createdAt ?? row.created_at ?? Date.now(),
  };
}

export function toIdea(row: any): IdeaObj {
  return {
    id: row.id,
    content: row.content,
    processed: row.processed,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
  };
}

export function toSubtask(row: any): SubtaskObj {
  return {
    id: row.id,
    taskId: row.taskId ?? row.task_id,
    title: row.title,
    done: row.done,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
  };
}

export function toLabel(row: any): LabelObj {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
  };
}

export function toTaskLabel(row: any): TaskLabelObj {
  return {
    id: row.id,
    taskId: row.taskId ?? row.task_id,
    labelId: row.labelId ?? row.label_id,
  };
}

export function toInventoryItem(row: any): InventoryItemObj {
  return {
    id: row.id,
    name: row.name,
    room: row.room,
    location: row.location ?? null,
    quantity: row.quantity ?? 1,
    notes: row.notes ?? null,
    imageUri: row.imageUri ?? row.image_uri ?? null,
    roomId: row.roomId ?? row.room_id ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
    updatedAt: new Date(row.updatedAt ?? row.updated_at ?? Date.now()),
  };
}

export function toPlant(row: any): PlantObj {
  const lastWateredAt = row.lastWateredAt ?? row.last_watered_at ?? null;
  const wateringIntervalDays = row.wateringIntervalDays ?? row.watering_interval_days ?? 7;

  let daysSinceWatered: number | null = null;
  let daysUntilWater: number | null = null;
  let wateringStatus: PlantObj['wateringStatus'] = 'never';

  if (lastWateredAt != null) {
    daysSinceWatered = Math.floor((Date.now() - lastWateredAt) / 86400000);
    daysUntilWater = wateringIntervalDays - daysSinceWatered;
    if (daysUntilWater <= 0) wateringStatus = 'overdue';
    else if (daysUntilWater === 1) wateringStatus = 'today';
    else if (daysUntilWater <= 3) wateringStatus = 'soon';
    else wateringStatus = 'ok';
  }

  return {
    id: row.id,
    name: row.name,
    species: row.species ?? null,
    wateringIntervalDays,
    lastWateredAt,
    location: row.location ?? null,
    notes: row.notes ?? null,
    imageUri: row.imageUri ?? row.image_uri ?? null,
    roomId: row.roomId ?? row.room_id ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
    daysSinceWatered,
    daysUntilWater,
    wateringStatus,
  };
}

export function toRoom(row: any): RoomObj {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? null,
    color: row.color ?? null,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    parentId: row.parentId ?? row.parent_id ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
  };
}

export function toCalendarEvent(row: any): CalendarEventObj {
  const startAt = row.startAt ?? row.start_at ?? 0;
  const endAt = row.endAt ?? row.end_at ?? null;
  const startDate = new Date(startAt);
  const endDate = endAt != null ? new Date(endAt) : null;
  const isMultiDay = endDate != null
    ? startDate.toDateString() !== endDate.toDateString()
    : false;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    startAt,
    endAt,
    allDay: row.allDay ?? row.all_day ?? false,
    recurrenceRule: row.recurrenceRule ?? row.recurrence_rule ?? null,
    source: row.source ?? 'manual',
    taskId: row.taskId ?? row.task_id ?? null,
    plantId: row.plantId ?? row.plant_id ?? null,
    deviceEventId: row.deviceEventId ?? row.device_event_id ?? null,
    createdAt: new Date(row.createdAt ?? row.created_at ?? Date.now()),
    startDate,
    endDate,
    isMultiDay,
  };
}

export function toFocusSession(row: any): FocusSessionObj {
  return {
    id: row.id,
    taskId: row.taskId ?? row.task_id,
    startedAt: row.startedAt ?? row.started_at ?? Date.now(),
    endedAt: row.endedAt ?? row.ended_at ?? null,
    plannedMinutes: row.plannedMinutes ?? row.planned_minutes,
    completed: row.completed,
  };
}

export function toReminder(row: any): ReminderObj {
  return {
    id: row.id,
    taskId: row.taskId ?? row.task_id ?? null,
    title: row.title,
    scheduledAt: new Date(row.scheduledAt ?? row.scheduled_at ?? Date.now()),
    repeatRule: row.repeatRule ?? row.repeat_rule ?? null,
    escalationLevel: row.escalationLevel ?? row.escalation_level ?? 0,
    dismissed: row.dismissed,
  };
}
