import { db } from './db';
import type { ExportBundle, LoggedSet, SplitDay } from '../types';

/** Sets from the most recent *other* session that logged this exercise, ordered by setIndex. */
export async function getLastSessionSetsForExercise(
  exerciseId: string,
  currentSessionId: string
): Promise<LoggedSet[]> {
  const allSets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const otherSets = allSets.filter((s) => s.sessionId !== currentSessionId);
  if (otherSets.length === 0) return [];

  const sessionIds = [...new Set(otherSets.map((s) => s.sessionId))];
  const sessions = await db.sessions.bulkGet(sessionIds);
  const startedAtBySession = new Map(
    sessions.filter((s): s is NonNullable<typeof s> => !!s).map((s) => [s.id, s.startedAt])
  );

  let mostRecentSessionId: string | null = null;
  let mostRecentStart = '';
  for (const sid of sessionIds) {
    const startedAt = startedAtBySession.get(sid) ?? '';
    if (startedAt > mostRecentStart) {
      mostRecentStart = startedAt;
      mostRecentSessionId = sid;
    }
  }
  if (!mostRecentSessionId) return [];

  return otherSets
    .filter((s) => s.sessionId === mostRecentSessionId)
    .sort((a, b) => a.setIndex - b.setIndex);
}

/** Sets logged so far in the current session for this exercise, ordered by setIndex. */
export async function getCurrentSessionSetsForExercise(
  sessionId: string,
  exerciseId: string
): Promise<LoggedSet[]> {
  const sets = await db.sets
    .where('[sessionId+exerciseId]')
    .equals([sessionId, exerciseId])
    .toArray();
  return sets.sort((a, b) => a.setIndex - b.setIndex);
}

/** Determine the next split day given the most recently completed session. */
export async function getNextSplitDay(): Promise<SplitDay | null> {
  const days = await db.splitDays.orderBy('order').toArray();
  if (days.length === 0) return null;

  const allSessions = await db.sessions.toArray();
  const lastCompleted = allSessions.filter((s) => s.completedAt !== null);

  if (lastCompleted.length === 0) return days[0];

  lastCompleted.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const lastDayId = lastCompleted[0].splitDayId;
  const lastIndex = days.findIndex((d) => d.id === lastDayId);
  if (lastIndex === -1) return days[0];
  return days[(lastIndex + 1) % days.length];
}

export async function exportAll(): Promise<ExportBundle> {
  const [exercises, splitDays, sessions, sets] = await Promise.all([
    db.exercises.toArray(),
    db.splitDays.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    splitDays,
    sessions,
    sets,
  };
}

export async function importAll(bundle: ExportBundle): Promise<void> {
  await db.transaction('rw', db.exercises, db.splitDays, db.sessions, db.sets, async () => {
    await Promise.all([
      db.exercises.clear(),
      db.splitDays.clear(),
      db.sessions.clear(),
      db.sets.clear(),
    ]);
    await Promise.all([
      db.exercises.bulkAdd(bundle.exercises),
      db.splitDays.bulkAdd(bundle.splitDays),
      db.sessions.bulkAdd(bundle.sessions),
      db.sets.bulkAdd(bundle.sets),
    ]);
  });
}
