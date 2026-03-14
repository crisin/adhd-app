import { Model } from '@nozbe/watermelondb';
import { text, field, readonly, date } from '@nozbe/watermelondb/decorators';

export class Room extends Model {
  static table = 'rooms';

  @text('name') name!: string;
  @text('emoji') emoji!: string | null;
  @field('color') color!: string | null;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
}
