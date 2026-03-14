import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, nochange } from '@nozbe/watermelondb/decorators';

export type TaskStatus = 'backlog' | 'today' | 'active' | 'done' | 'skipped';

export class Task extends Model {
  static table = 'tasks';

  @text('title') title!: string;
  @text('notes') notes!: string | null;
  @field('status') status!: TaskStatus;
  @field('estimated_minutes') estimatedMinutes!: number | null;
  @field('actual_minutes') actualMinutes!: number | null;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('completed_at') completedAt!: Date | null;

  // TODO(phase2): subtasks — add associations and parentId field
  // static associations = {
  //   tasks: { type: 'belongs_to', key: 'parent_id' },
  // };
  // @field('parent_id') parentId!: string | null;
}
