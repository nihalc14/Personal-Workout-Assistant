export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: Equipment;
  cues: string[];
  mediaFile?: string; // bundled filename under /public/exercises, or a data: URL for user-supplied media
  mediaLicense?: string;
  incrementKg: number; // weight step suggested on progression (default 2.5 upper / 5 lower)
  isCustom: boolean;
}

export interface SplitDayExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface SplitDay {
  id: string;
  name: string;
  order: number; // position in the split sequence
  exercises: SplitDayExercise[];
}

export interface WorkoutSession {
  id: string;
  splitDayId: string | null; // null for a fully ad hoc session
  splitDayName: string; // snapshot at start time, template edits don't affect active/past sessions
  plannedExercises: SplitDayExercise[]; // snapshot of the day's template at start time
  adHocExerciseIds: string[]; // exercises added mid-session, not part of the template
  startedAt: string; // ISO
  completedAt: string | null;
}

export interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number; // order within this exercise in this session
  weightKg: number;
  reps: number;
  loggedAt: string; // ISO
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  splitDays: SplitDay[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
}
