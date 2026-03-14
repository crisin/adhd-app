import { Model } from '@nozbe/watermelondb';
import { text, field, readonly, date } from '@nozbe/watermelondb/decorators';

export class Label extends Model {
  static table = 'labels';

  @text('name') name!: string;
  @field('color') color!: string;
  @readonly @date('created_at') createdAt!: Date;
}
