import { describe, it, expect } from 'vitest';
import { getSubstitutes } from './substitution';
import type { Exercise } from '../types';

function makeExercise(overrides: Partial<Exercise> & Pick<Exercise, 'id' | 'primaryMuscles' | 'equipment'>): Exercise {
  return {
    name: overrides.id,
    cues: [],
    incrementKg: 2.5,
    isCustom: false,
    ...overrides,
  };
}

const barbellBench = makeExercise({ id: 'barbell-bench', primaryMuscles: ['chest'], equipment: 'barbell' });
const dbBench = makeExercise({ id: 'db-bench', primaryMuscles: ['chest'], equipment: 'dumbbell' });
const cableFly = makeExercise({ id: 'cable-fly', primaryMuscles: ['chest'], equipment: 'cable' });
const legPress = makeExercise({ id: 'leg-press', primaryMuscles: ['quads'], equipment: 'machine' });
const inclineDb = makeExercise({
  id: 'incline-db',
  primaryMuscles: ['chest', 'shoulders'],
  equipment: 'dumbbell',
});

const catalog = [barbellBench, dbBench, cableFly, legPress, inclineDb];

describe('getSubstitutes', () => {
  it('excludes the exercise itself', () => {
    const result = getSubstitutes(barbellBench, catalog);
    const allIds = Object.values(result).flat().map((e) => e.id);
    expect(allIds).not.toContain('barbell-bench');
  });

  it('only includes exercises sharing a primary muscle group', () => {
    const result = getSubstitutes(barbellBench, catalog);
    const allIds = Object.values(result).flat().map((e) => e.id);
    expect(allIds).not.toContain('leg-press');
  });

  it('groups results by equipment type', () => {
    const result = getSubstitutes(barbellBench, catalog);
    expect(result.dumbbell?.map((e) => e.id).sort()).toEqual(['db-bench', 'incline-db']);
    expect(result.cable?.map((e) => e.id)).toEqual(['cable-fly']);
    expect(result.machine).toBeUndefined();
  });

  it('matches on any shared muscle group, not requiring an exact set match', () => {
    const result = getSubstitutes(inclineDb, catalog);
    const allIds = Object.values(result).flat().map((e) => e.id);
    expect(allIds).toContain('barbell-bench');
  });
});
