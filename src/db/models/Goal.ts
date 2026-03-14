import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';
import { TaskCategory } from './Task';

export type GoalType = 'short' | 'long';
export type GoalStatus = 'active' | 'done' | 'archived';

export class Goal extends Model {
  static table = 'goals';

  @text('title') title!: string;
  @text('description') description!: string | null;
  @field('type') type!: GoalType;
  @field('status') status!: GoalStatus;
  @field('category') category!: TaskCategory | null;
  @date('target_date') targetDate!: Date | null;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('completed_at') completedAt!: Date | null;
}
