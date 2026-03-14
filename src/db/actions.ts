import { database } from './index';
import { Task, TaskStatus, TaskCategory } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Goal, GoalType, GoalStatus } from './models/Goal';
import { Idea } from './models/Idea';
import { InventoryItem, InventoryRoom } from './models/InventoryItem';
import { Plant } from './models/Plant';

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTask(
  title: string,
  estimatedMinutes: number | null,
  status: TaskStatus = 'today',
  category: TaskCategory | null = null,
  goalId: string | null = null
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
  });
}

export async function updateTaskTitle(task: Task, title: string): Promise<void> {
  await database.write(async () => {
    await task.update((t) => { t.title = title.trim(); });
  });
}

export async function deleteTask(task: Task): Promise<void> {
  await database.write(async () => { await task.destroyPermanently(); });
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
    });
    await idea.update((i) => { i.processed = true; });
  });
  return task;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function createInventoryItem(
  name: string,
  room: InventoryRoom,
  location: string | null = null,
  quantity: number = 1,
  notes: string | null = null
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
  }
): Promise<void> {
  await database.write(async () => {
    await item.update((i) => {
      if (fields.name !== undefined) i.name = fields.name.trim();
      if (fields.room !== undefined) i.room = fields.room;
      if (fields.location !== undefined) i.location = fields.location;
      if (fields.quantity !== undefined) i.quantity = fields.quantity;
      if (fields.notes !== undefined) i.notes = fields.notes;
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
  notes: string | null = null
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
  }
): Promise<void> {
  await database.write(async () => {
    await plant.update((p) => {
      if (fields.name !== undefined) p.name = fields.name.trim();
      if (fields.species !== undefined) p.species = fields.species;
      if (fields.wateringIntervalDays !== undefined) p.wateringIntervalDays = fields.wateringIntervalDays;
      if (fields.location !== undefined) p.location = fields.location;
      if (fields.notes !== undefined) p.notes = fields.notes;
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

export async function deletePlant(plant: Plant): Promise<void> {
  await database.write(async () => { await plant.destroyPermanently(); });
}
