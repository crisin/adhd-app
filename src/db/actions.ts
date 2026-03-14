import { database } from './index';
import { Task, TaskStatus, TaskCategory, TaskPriority, TaskSource } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Goal, GoalType, GoalStatus } from './models/Goal';
import { Idea } from './models/Idea';
import { InventoryItem, InventoryRoom } from './models/InventoryItem';
import { Plant } from './models/Plant';
import { Subtask } from './models/Subtask';
import { Label } from './models/Label';
import { TaskLabel } from './models/TaskLabel';
import { Room } from './models/Room';
import { CalendarEvent, CalendarEventSource } from './models/CalendarEvent';
import { Q } from '@nozbe/watermelondb';

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
): Promise<Task> {
  let newTask!: Task;
  await database.write(async () => {
    newTask = await database.get<Task>('tasks').create((task) => {
      task.title = title.trim();
      task.status = status;
      task.estimatedMinutes = estimatedMinutes;
      task.category = category;
      task.goalId = goalId;
      task.sortOrder = Date.now();
      task.priority = opts.priority ?? 'medium';
      task.dueAt = opts.dueAt ?? null;
      task.source = opts.source ?? 'manual';
      task.plantId = opts.plantId ?? null;
      task.recurrenceRule = opts.recurrenceRule ?? null;
    });
  });
  return newTask;
}

export async function updateTaskStatus(task: Task, status: TaskStatus): Promise<void> {
  await database.write(async () => {
    await task.update((t) => {
      t.status = status;
      if (status === 'done') t.completedAt = new Date();
    });

    // If this is a plant-reminder task being completed, auto-water the plant
    if (status === 'done' && task.source === 'plant-reminder' && task.plantId) {
      const plant = await database.get<Plant>('plants').find(task.plantId);
      await plant.update((p) => {
        p.lastWateredAt = Date.now();
      });
    }
  });
}

export async function updateTask(
  task: Task,
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
  await database.write(async () => {
    await task.update((t) => {
      if (fields.title !== undefined) t.title = fields.title.trim();
      if (fields.notes !== undefined) t.notes = fields.notes;
      if (fields.status !== undefined) {
        t.status = fields.status;
        if (fields.status === 'done') t.completedAt = new Date();
      }
      if (fields.category !== undefined) t.category = fields.category;
      if (fields.priority !== undefined) t.priority = fields.priority;
      if (fields.dueAt !== undefined) t.dueAt = fields.dueAt;
      if (fields.goalId !== undefined) t.goalId = fields.goalId;
      if (fields.estimatedMinutes !== undefined) t.estimatedMinutes = fields.estimatedMinutes;
      if (fields.recurrenceRule !== undefined) t.recurrenceRule = fields.recurrenceRule;
    });
  });
}

export async function updateTaskTitle(task: Task, title: string): Promise<void> {
  await database.write(async () => {
    await task.update((t) => { t.title = title.trim(); });
  });
}

export async function deleteTask(task: Task): Promise<void> {
  await database.write(async () => {
    // Delete associated subtasks and task-labels
    const subtasks = await database.get<Subtask>('subtasks').query(Q.where('task_id', task.id)).fetch();
    const taskLabels = await database.get<TaskLabel>('task_labels').query(Q.where('task_id', task.id)).fetch();
    const batch: any[] = [
      ...subtasks.map((s) => s.prepareDestroyPermanently()),
      ...taskLabels.map((tl) => tl.prepareDestroyPermanently()),
      task.prepareDestroyPermanently(),
    ];
    await database.batch(...batch);
  });
}

export async function archiveTask(task: Task): Promise<void> {
  await database.write(async () => {
    await task.update((t) => {
      t.archivedAt = new Date();
    });
  });
}

export async function startFocusSession(task: Task, plannedMinutes: number): Promise<FocusSession> {
  let session!: FocusSession;
  await database.write(async () => {
    await task.update((t) => { t.status = 'active'; });
    session = await database.get<FocusSession>('focus_sessions').create((s) => {
      (s as any)._raw.task_id = task.id;
      s.plannedMinutes = plannedMinutes;
      s.completed = false;
    });
  });
  return session;
}

export async function endFocusSession(
  session: FocusSession,
  task: Task,
  completed: boolean
): Promise<void> {
  await database.write(async () => {
    await session.update((s) => {
      s.endedAt = new Date();
      s.completed = completed;
    });
    await task.update((t) => {
      t.status = completed ? 'done' : 'today';
      if (completed) t.completedAt = new Date();
    });
  });
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  let subtask!: Subtask;
  await database.write(async () => {
    subtask = await database.get<Subtask>('subtasks').create((s) => {
      s.taskId = taskId;
      s.title = title.trim();
      s.done = false;
      s.sortOrder = Date.now();
    });
  });
  return subtask;
}

export async function toggleSubtask(subtask: Subtask): Promise<void> {
  await database.write(async () => {
    await subtask.update((s) => { s.done = !s.done; });
  });
}

export async function updateSubtaskTitle(subtask: Subtask, title: string): Promise<void> {
  await database.write(async () => {
    await subtask.update((s) => { s.title = title.trim(); });
  });
}

export async function deleteSubtask(subtask: Subtask): Promise<void> {
  await database.write(async () => { await subtask.destroyPermanently(); });
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function createLabel(name: string, color: string): Promise<Label> {
  let label!: Label;
  await database.write(async () => {
    label = await database.get<Label>('labels').create((l) => {
      l.name = name.trim();
      l.color = color;
    });
  });
  return label;
}

export async function updateLabel(label: Label, fields: { name?: string; color?: string }): Promise<void> {
  await database.write(async () => {
    await label.update((l) => {
      if (fields.name !== undefined) l.name = fields.name.trim();
      if (fields.color !== undefined) l.color = fields.color;
    });
  });
}

export async function deleteLabel(label: Label): Promise<void> {
  await database.write(async () => {
    const taskLabels = await database.get<TaskLabel>('task_labels').query(Q.where('label_id', label.id)).fetch();
    const batch: any[] = [
      ...taskLabels.map((tl) => tl.prepareDestroyPermanently()),
      label.prepareDestroyPermanently(),
    ];
    await database.batch(...batch);
  });
}

export async function addLabelToTask(taskId: string, labelId: string): Promise<TaskLabel> {
  let tl!: TaskLabel;
  await database.write(async () => {
    tl = await database.get<TaskLabel>('task_labels').create((r) => {
      r.taskId = taskId;
      r.labelId = labelId;
    });
  });
  return tl;
}

export async function removeLabelFromTask(taskId: string, labelId: string): Promise<void> {
  await database.write(async () => {
    const tls = await database.get<TaskLabel>('task_labels')
      .query(Q.where('task_id', taskId), Q.where('label_id', labelId))
      .fetch();
    const batch = tls.map((tl) => tl.prepareDestroyPermanently());
    await database.batch(...batch);
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(
  title: string,
  type: GoalType,
  description: string | null = null,
  category: TaskCategory | null = null,
  targetDate: Date | null = null
): Promise<Goal> {
  let goal!: Goal;
  await database.write(async () => {
    goal = await database.get<Goal>('goals').create((g) => {
      g.title = title.trim();
      g.type = type;
      g.description = description;
      g.category = category;
      g.targetDate = targetDate;
      g.status = 'active';
      g.sortOrder = Date.now();
    });
  });
  return goal;
}

export async function updateGoalStatus(goal: Goal, status: GoalStatus): Promise<void> {
  await database.write(async () => {
    await goal.update((g) => {
      g.status = status;
      if (status === 'done') g.completedAt = new Date();
    });
  });
}

export async function deleteGoal(goal: Goal): Promise<void> {
  await database.write(async () => { await goal.destroyPermanently(); });
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export async function createIdea(content: string): Promise<Idea> {
  let idea!: Idea;
  await database.write(async () => {
    idea = await database.get<Idea>('ideas').create((i) => {
      i.content = content.trim();
      i.processed = false;
    });
  });
  return idea;
}

export async function markIdeaProcessed(idea: Idea): Promise<void> {
  await database.write(async () => {
    await idea.update((i) => { i.processed = true; });
  });
}

export async function deleteIdea(idea: Idea): Promise<void> {
  await database.write(async () => { await idea.destroyPermanently(); });
}

export async function ideaToTask(
  idea: Idea,
  status: TaskStatus = 'today',
  category: TaskCategory | null = null
): Promise<Task> {
  let task!: Task;
  await database.write(async () => {
    task = await database.get<Task>('tasks').create((t) => {
      t.title = idea.content.trim();
      t.status = status;
      t.category = category;
      t.sortOrder = Date.now();
      t.priority = 'medium';
      t.source = 'idea-dump';
    });
    await idea.update((i) => { i.processed = true; });
  });
  return task;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(name: string, emoji: string | null = null, color: string | null = null): Promise<Room> {
  let room!: Room;
  await database.write(async () => {
    room = await database.get<Room>('rooms').create((r) => {
      r.name = name.trim();
      r.emoji = emoji;
      r.color = color;
      r.sortOrder = Date.now();
    });
  });
  return room;
}

export async function updateRoom(room: Room, fields: { name?: string; emoji?: string | null; color?: string | null }): Promise<void> {
  await database.write(async () => {
    await room.update((r) => {
      if (fields.name !== undefined) r.name = fields.name.trim();
      if (fields.emoji !== undefined) r.emoji = fields.emoji;
      if (fields.color !== undefined) r.color = fields.color;
    });
  });
}

export async function deleteRoom(room: Room): Promise<void> {
  await database.write(async () => {
    // Move inventory items in this room to unsorted (null room_id)
    const items = await database.get<InventoryItem>('inventory_items').query(Q.where('room_id', room.id)).fetch();
    const plants = await database.get<Plant>('plants').query(Q.where('room_id', room.id)).fetch();
    const batch: any[] = [
      ...items.map((i) => i.prepareUpdate((rec) => { rec.roomId = null; })),
      ...plants.map((p) => p.prepareUpdate((rec) => { rec.roomId = null; })),
      room.prepareDestroyPermanently(),
    ];
    await database.batch(...batch);
  });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function createInventoryItem(
  name: string,
  room: InventoryRoom,
  location: string | null = null,
  quantity: number = 1,
  notes: string | null = null,
  roomId: string | null = null
): Promise<InventoryItem> {
  let item!: InventoryItem;
  await database.write(async () => {
    item = await database.get<InventoryItem>('inventory_items').create((i) => {
      i.name = name.trim();
      i.room = room;
      i.location = location ? location.trim() : null;
      i.quantity = quantity;
      i.notes = notes ? notes.trim() : null;
      i.updatedAt = new Date();
      i.roomId = roomId;
    });
  });
  return item;
}

export async function updateInventoryItem(
  item: InventoryItem,
  fields: {
    name?: string;
    room?: InventoryRoom;
    location?: string | null;
    quantity?: number;
    notes?: string | null;
    roomId?: string | null;
  }
): Promise<void> {
  await database.write(async () => {
    await item.update((i) => {
      if (fields.name !== undefined) i.name = fields.name.trim();
      if (fields.room !== undefined) i.room = fields.room;
      if (fields.location !== undefined) i.location = fields.location;
      if (fields.quantity !== undefined) i.quantity = fields.quantity;
      if (fields.notes !== undefined) i.notes = fields.notes;
      if (fields.roomId !== undefined) i.roomId = fields.roomId;
      i.updatedAt = new Date();
    });
  });
}

export async function deleteInventoryItem(item: InventoryItem): Promise<void> {
  await database.write(async () => { await item.destroyPermanently(); });
}

// ─── Plants ───────────────────────────────────────────────────────────────────

export async function createPlant(
  name: string,
  wateringIntervalDays: number,
  species: string | null = null,
  location: string | null = null,
  notes: string | null = null,
  roomId: string | null = null
): Promise<Plant> {
  let plant!: Plant;
  await database.write(async () => {
    plant = await database.get<Plant>('plants').create((p) => {
      p.name = name.trim();
      p.species = species ? species.trim() : null;
      p.wateringIntervalDays = wateringIntervalDays;
      p.lastWateredAt = null;
      p.location = location ? location.trim() : null;
      p.notes = notes ? notes.trim() : null;
      p.roomId = roomId;
    });
  });
  return plant;
}

export async function updatePlant(
  plant: Plant,
  fields: {
    name?: string;
    species?: string | null;
    wateringIntervalDays?: number;
    location?: string | null;
    notes?: string | null;
    roomId?: string | null;
  }
): Promise<void> {
  await database.write(async () => {
    await plant.update((p) => {
      if (fields.name !== undefined) p.name = fields.name.trim();
      if (fields.species !== undefined) p.species = fields.species;
      if (fields.wateringIntervalDays !== undefined) p.wateringIntervalDays = fields.wateringIntervalDays;
      if (fields.location !== undefined) p.location = fields.location;
      if (fields.notes !== undefined) p.notes = fields.notes;
      if (fields.roomId !== undefined) p.roomId = fields.roomId;
    });
  });
}

export async function waterPlant(plant: Plant): Promise<void> {
  await database.write(async () => {
    await plant.update((p) => {
      p.lastWateredAt = Date.now();
    });
  });
}

export async function waterPlantAndSchedule(plant: Plant): Promise<void> {
  await database.write(async () => {
    const now = Date.now();
    await plant.update((p) => {
      p.lastWateredAt = now;
    });

    // Create calendar event for next watering
    const nextWaterDate = now + plant.wateringIntervalDays * 86400000;
    await database.get<CalendarEvent>('calendar_events').create((e) => {
      e.title = `Water ${plant.name}`;
      e.startAt = nextWaterDate;
      e.allDay = true;
      e.source = 'plant-reminder';
      e.plantId = plant.id;
    });

    // Create a plant-reminder task for next watering
    await database.get<Task>('tasks').create((t) => {
      t.title = `Water ${plant.name}`;
      t.status = 'backlog';
      t.priority = 'medium';
      t.source = 'plant-reminder';
      t.plantId = plant.id;
      t.dueAt = nextWaterDate;
      t.sortOrder = nextWaterDate;
    });
  });
}

export async function deletePlant(plant: Plant): Promise<void> {
  await database.write(async () => {
    // Clean up associated calendar events and tasks
    const events = await database.get<CalendarEvent>('calendar_events').query(Q.where('plant_id', plant.id)).fetch();
    const tasks = await database.get<Task>('tasks')
      .query(Q.where('plant_id', plant.id), Q.where('source', 'plant-reminder'))
      .fetch();
    const batch: any[] = [
      ...events.map((e) => e.prepareDestroyPermanently()),
      ...tasks.map((t) => t.prepareDestroyPermanently()),
      plant.prepareDestroyPermanently(),
    ];
    await database.batch(...batch);
  });
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
): Promise<CalendarEvent> {
  let event!: CalendarEvent;
  await database.write(async () => {
    event = await database.get<CalendarEvent>('calendar_events').create((e) => {
      e.title = title.trim();
      e.startAt = startAt;
      e.description = opts.description ?? null;
      e.endAt = opts.endAt ?? null;
      e.allDay = opts.allDay ?? false;
      e.recurrenceRule = opts.recurrenceRule ?? null;
      e.source = opts.source ?? 'manual';
      e.taskId = opts.taskId ?? null;
      e.plantId = opts.plantId ?? null;
      e.deviceEventId = opts.deviceEventId ?? null;
    });
  });
  return event;
}

export async function updateCalendarEvent(
  event: CalendarEvent,
  fields: {
    title?: string;
    description?: string | null;
    startAt?: number;
    endAt?: number | null;
    allDay?: boolean;
    recurrenceRule?: string | null;
  }
): Promise<void> {
  await database.write(async () => {
    await event.update((e) => {
      if (fields.title !== undefined) e.title = fields.title.trim();
      if (fields.description !== undefined) e.description = fields.description;
      if (fields.startAt !== undefined) e.startAt = fields.startAt;
      if (fields.endAt !== undefined) e.endAt = fields.endAt;
      if (fields.allDay !== undefined) e.allDay = fields.allDay;
      if (fields.recurrenceRule !== undefined) e.recurrenceRule = fields.recurrenceRule;
    });
  });
}

export async function deleteCalendarEvent(event: CalendarEvent): Promise<void> {
  await database.write(async () => { await event.destroyPermanently(); });
}
