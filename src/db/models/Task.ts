import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export type TaskStatus = 'backlog' | 'today' | 'active' | 'done' | 'skipped';
export type TaskCategory = 'private' | 'school' | 'work' | 'health' | 'finance' | 'other';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskSource = 'manual' | 'idea-dump' | 'plant-reminder';

export class Task extends Model {
  static table = 'tasks';

  @text('title') title!: string;
  @text('notes') notes!: string | null;
  @field('status') status!: TaskStatus;
  @field('category') category!: TaskCategory | null;
  @field('goal_id') goalId!: string | null;
  @field('estimated_minutes') estimatedMinutes!: number | null;
  @field('actual_minutes') actualMinutes!: number | null;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('completed_at') completedAt!: Date | null;

  // v5: task model expansion
  @field('priority') priority!: TaskPriority;
  @field('due_at') dueAt!: number | null;
  @text('recurrence_rule') recurrenceRule!: string | null;
  @field('source') source!: TaskSource;
  @field('plant_id') plantId!: string | null;
  @date('archived_at') archivedAt!: Date | null;

  get isOverdue(): boolean {
    if (!this.dueAt || this.status === 'done') return false;
    return this.dueAt < Date.now();
  }

  get isDueToday(): boolean {
    if (!this.dueAt || this.status === 'done') return false;
    const now = new Date();
    const due = new Date(this.dueAt);
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  }
}
