import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export type InventoryRoom =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'living_room'
  | 'office'
  | 'garage'
  | 'garden'
  | 'other';

export class InventoryItem extends Model {
  static table = 'inventory_items';

  @text('name') name!: string;
  @field('room') room!: InventoryRoom;
  @text('location') location!: string | null;
  @field('quantity') quantity!: number;
  @text('notes') notes!: string | null;
  @field('image_uri') imageUri!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('room_id') roomId!: string | null;
}
