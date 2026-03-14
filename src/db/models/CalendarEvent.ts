import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export type CalendarEventSource = 'manual' | 'task-due' | 'plant-reminder' | 'device';

export class CalendarEvent extends Model {
  static table = 'calendar_events';

  @text('title') title!: string;
  @text('description') description!: string | null;
  @field('start_at') startAt!: number;
  @field('end_at') endAt!: number | null;
  @field('all_day') allDay!: boolean;
  @text('recurrence_rule') recurrenceRule!: string | null;
  @field('source') source!: CalendarEventSource;
  @field('task_id') taskId!: string | null;
  @field('plant_id') plantId!: string | null;
  @field('device_event_id') deviceEventId!: string | null;
  @readonly @date('created_at') createdAt!: Date;

  get startDate(): Date {
    return new Date(this.startAt);
  }

  get endDate(): Date | null {
    return this.endAt ? new Date(this.endAt) : null;
  }

  get isMultiDay(): boolean {
    if (!this.endAt) return false;
    const start = new Date(this.startAt);
    const end = new Date(this.endAt);
    return start.toDateString() !== end.toDateString();
  }
}
