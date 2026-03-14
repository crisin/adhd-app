import { TaskCategory } from '../db/models/Task';

export const CATEGORIES: {
  value: TaskCategory;
  label: string;
  emoji: string;
  color: string;
  light: string;
}[] = [
  { value: 'private',  label: 'Private',  emoji: '🏠', color: '#6366F1', light: '#EEF2FF' },
  { value: 'work',     label: 'Work',     emoji: '💼', color: '#0EA5E9', light: '#E0F2FE' },
  { value: 'school',   label: 'School',   emoji: '📚', color: '#F59E0B', light: '#FEF3C7' },
  { value: 'health',   label: 'Health',   emoji: '💚', color: '#10B981', light: '#D1FAE5' },
  { value: 'finance',  label: 'Finance',  emoji: '💰', color: '#8B5CF6', light: '#EDE9FE' },
  { value: 'other',    label: 'Other',    emoji: '📌', color: '#94A3B8', light: '#F1F5F9' },
];

export function getCategoryMeta(value: TaskCategory | null | undefined) {
  return CATEGORIES.find((c) => c.value === value) ?? null;
}
