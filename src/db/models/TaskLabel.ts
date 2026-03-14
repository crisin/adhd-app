import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class TaskLabel extends Model {
  static table = 'task_labels';

  @field('task_id') taskId!: string;
  @field('label_id') labelId!: string;
}
