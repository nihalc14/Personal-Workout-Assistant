import type { Equipment, Exercise } from '../types';

export type SubstitutesByEquipment = Partial<Record<Equipment, Exercise[]>>;

/**
 * Substitutes share at least one primary muscle group with the target exercise,
 * excluding the exercise itself, grouped by equipment type (PRD Story 4).
 */
export function getSubstitutes(
  exercise: Exercise,
  catalog: Exercise[]
): SubstitutesByEquipment {
  const targetMuscles = new Set(exercise.primaryMuscles);

  const matches = catalog.filter(
    (candidate) =>
      candidate.id !== exercise.id &&
      candidate.primaryMuscles.some((m) => targetMuscles.has(m))
  );

  const grouped: SubstitutesByEquipment = {};
  for (const candidate of matches) {
    const bucket = grouped[candidate.equipment] ?? [];
    bucket.push(candidate);
    grouped[candidate.equipment] = bucket;
  }
  return grouped;
}
