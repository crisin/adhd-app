import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export class Plant extends Model {
  static table = 'plants';

  @text('name') name!: string;
  @text('species') species!: string | null;
  @field('watering_interval_days') wateringIntervalDays!: number;
  @field('last_watered_at') lastWateredAt!: number | null; // stored as timestamp ms
  @text('location') location!: string | null;
  @text('notes') notes!: string | null;
  @field('image_uri') imageUri!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @field('room_id') roomId!: string | null;

  /** Days since last watered (null = never watered) */
  get daysSinceWatered(): number | null {
    if (!this.lastWateredAt) return null;
    return Math.floor((Date.now() - this.lastWateredAt) / 86400000);
  }

  /** Days until next watering (negative = overdue) */
  get daysUntilWater(): number | null {
    const days = this.daysSinceWatered;
    if (days === null) return null;
    return this.wateringIntervalDays - days;
  }

  get wateringStatus(): 'never' | 'overdue' | 'today' | 'soon' | 'ok' {
    const due = this.daysUntilWater;
    if (due === null) return 'never';
    if (due <= 0) return 'overdue';
    if (due === 1) return 'today';
    if (due <= 3) return 'soon';
    return 'ok';
  }
}
