import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class Subtask extends Model {
  static table = 'subtasks';

  @field('task_id') taskId!: string;
  @text('title') title!: string;
  @field('done') done!: boolean;
  @field('sort_order') sortOrder!: number;
}
