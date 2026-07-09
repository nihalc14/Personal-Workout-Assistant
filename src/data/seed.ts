import { db } from '../db/db';
import { SEED_EXERCISES } from './exercises';
import type { SplitDay } from '../types';

const DEFAULT_SPLIT: Omit<SplitDay, 'id'>[] = [
  {
    name: 'Push',
    order: 0,
    exercises: [
      { exerciseId: 'barbell-bench-press', order: 0, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'incline-dumbbell-press', order: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'dumbbell-shoulder-press', order: 2, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'lateral-raise', order: 3, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15 },
      { exerciseId: 'triceps-pushdown', order: 4, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Pull',
    order: 1,
    exercises: [
      { exerciseId: 'barbell-row', order: 0, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'lat-pulldown', order: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'seated-cable-row', order: 2, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'face-pull', order: 3, targetSets: 3, targetRepsMin: 12, targetRepsMax: 20 },
      { exerciseId: 'barbell-curl', order: 4, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
    ],
  },
  {
    name: 'Legs',
    order: 2,
    exercises: [
      { exerciseId: 'barbell-back-squat', order: 0, targetSets: 3, targetRepsMin: 6, targetRepsMax: 10 },
      { exerciseId: 'romanian-deadlift', order: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'leg-press', order: 2, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseId: 'leg-curl', order: 3, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15 },
      { exerciseId: 'calf-raise', order: 4, targetSets: 3, targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
];

/**
 * Populates the catalog and a default PPL split on first launch only.
 * Uses bulkPut (not bulkAdd) so concurrent/repeated calls - e.g. React
 * StrictMode double-invoking effects in dev - are idempotent instead of
 * throwing on duplicate keys.
 */
export async function seedIfEmpty(): Promise<void> {
  const exerciseCount = await db.exercises.count();
  if (exerciseCount === 0) {
    await db.exercises.bulkPut(SEED_EXERCISES);
  }

  const splitDayCount = await db.splitDays.count();
  if (splitDayCount === 0) {
    const withIds: SplitDay[] = DEFAULT_SPLIT.map((day, i) => ({ ...day, id: `default-${i}` }));
    await db.splitDays.bulkPut(withIds);
  }
}

let seedPromise: Promise<void> | null = null;

/** Singleton wrapper so StrictMode's double effect invocation only runs the seed once. */
export function seedOnce(): Promise<void> {
  if (!seedPromise) seedPromise = seedIfEmpty();
  return seedPromise;
}
