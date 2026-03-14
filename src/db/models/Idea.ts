import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, text } from '@nozbe/watermelondb/decorators';

export class Idea extends Model {
  static table = 'ideas';

  @text('content') content!: string;
  @field('processed') processed!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
