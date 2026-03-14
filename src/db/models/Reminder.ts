import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export type EscalationLevel = 0 | 1 | 2;

export class Reminder extends Model {
  static table = 'reminders';

  @field('task_id') taskId!: string | null;  // null = standalone reminder
  @text('title') title!: string;
  @date('scheduled_at') scheduledAt!: Date;
  @text('repeat_rule') repeatRule!: string | null;
  @field('escalation_level') escalationLevel!: EscalationLevel;
  @field('dismissed') dismissed!: boolean;
  @readonly @date('created_at') createdAt!: Date;

  // TODO(phase2): sound — use escalationLevel to pick notification sound
  // level 0 → soft chime, level 1 → standard, level 2 → alarm
}
