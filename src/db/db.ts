import Dexie, { type Table } from 'dexie';
import type { Exercise, SplitDay, WorkoutSession, LoggedSet } from '../types';

export class WorkoutDb extends Dexie {
  exercises!: Table<Exercise, string>;
  splitDays!: Table<SplitDay, string>;
  sessions!: Table<WorkoutSession, string>;
  sets!: Table<LoggedSet, string>;

  constructor() {
    super('workout-tracker');
    this.version(1).stores({
      exercises: 'id, name, equipment, isCustom',
      splitDays: 'id, order',
      sessions: 'id, splitDayId, startedAt, completedAt',
      sets: 'id, sessionId, exerciseId, [sessionId+exerciseId], loggedAt',
    });
  }
}

export const db = new WorkoutDb();
