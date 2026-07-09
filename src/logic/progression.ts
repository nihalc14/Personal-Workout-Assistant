import type { LoggedSet } from '../types';

export interface TargetScheme {
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export type SuggestionType = 'none' | 'increase_weight' | 'repeat_weight';

export interface ProgressionSuggestion {
  type: SuggestionType;
  suggestedWeightKg: number | null;
  message: string;
}

/**
 * Deterministic progressive-overload rule (PRD Story 3):
 * - No prior session for this exercise -> no suggestion.
 * - All target sets hit the top of the rep range -> suggest weight + increment.
 * - Otherwise -> suggest repeating the same weight, with a rep-gap readout.
 */
export function getProgressionSuggestion(
  lastSessionSets: LoggedSet[],
  target: TargetScheme,
  incrementKg: number
): ProgressionSuggestion {
  if (lastSessionSets.length === 0) {
    return { type: 'none', suggestedWeightKg: null, message: '' };
  }

  const sorted = [...lastSessionSets].sort((a, b) => a.setIndex - b.setIndex);
  const consideredSets = sorted.slice(0, target.targetSets);
  const lastWeight = consideredSets[0].weightKg;

  const allMetTop =
    consideredSets.length >= target.targetSets &&
    consideredSets.every((s) => s.reps >= target.targetRepsMax);

  if (allMetTop) {
    const suggestedWeightKg = lastWeight + incrementKg;
    return {
      type: 'increase_weight',
      suggestedWeightKg,
      message: `Hit ${target.targetRepsMax} on every set last time — try ${suggestedWeightKg} kg`,
    };
  }

  const actualReps = consideredSets.map((s) => s.reps);
  const aimReps = consideredSets.map((s) =>
    s.reps >= target.targetRepsMax ? s.reps : s.reps + 1
  );
  const aimDisplay = consideredSets.map((s, i) =>
    s.reps >= target.targetRepsMax ? `${aimReps[i]}` : `${aimReps[i]}+`
  );

  return {
    type: 'repeat_weight',
    suggestedWeightKg: lastWeight,
    message: `${actualReps.join('/')} last time — aim for ${aimDisplay.join('/')}`,
  };
}
