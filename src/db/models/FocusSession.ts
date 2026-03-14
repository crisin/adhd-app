import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { Task } from './Task';

export class FocusSession extends Model {
  static table = 'focus_sessions';

  static associations = {
    tasks: { type: 'belongs_to' as const, key: 'task_id' },
  };

  @relation('tasks', 'task_id') task!: Task;
  @field('planned_minutes') plannedMinutes!: number;
  @field('completed') completed!: boolean;
  @readonly @date('created_at') startedAt!: Date;
  @date('ended_at') endedAt!: Date | null;
}
