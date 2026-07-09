import { describe, it, expect } from 'vitest';
import { getProgressionSuggestion, type TargetScheme } from './progression';
import type { LoggedSet } from '../types';

const target: TargetScheme = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 };

function makeSet(setIndex: number, weightKg: number, reps: number): LoggedSet {
  return {
    id: `s${setIndex}`,
    sessionId: 'prev-session',
    exerciseId: 'bench-press',
    setIndex,
    weightKg,
    reps,
    loggedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getProgressionSuggestion', () => {
  it('gives no suggestion with zero prior sessions', () => {
    const result = getProgressionSuggestion([], target, 2.5);
    expect(result.type).toBe('none');
    expect(result.suggestedWeightKg).toBeNull();
  });

  it('suggests a weight increase when all sets hit the top of the rep range', () => {
    const lastSets = [makeSet(0, 60, 12), makeSet(1, 60, 12), makeSet(2, 60, 12)];
    const result = getProgressionSuggestion(lastSets, target, 2.5);
    expect(result.type).toBe('increase_weight');
    expect(result.suggestedWeightKg).toBe(62.5);
  });

  it('suggests repeating the weight and shows the rep gap when targets are not fully met', () => {
    const lastSets = [makeSet(0, 60, 12), makeSet(1, 60, 12), makeSet(2, 60, 9)];
    const result = getProgressionSuggestion(lastSets, target, 2.5);
    expect(result.type).toBe('repeat_weight');
    expect(result.suggestedWeightKg).toBe(60);
    expect(result.message).toBe('12/12/9 last time — aim for 12/12/10+');
  });

  it('is deterministic: same history always produces the same suggestion', () => {
    const lastSets = [makeSet(0, 100, 8), makeSet(1, 100, 8), makeSet(2, 100, 7)];
    const a = getProgressionSuggestion(lastSets, target, 5);
    const b = getProgressionSuggestion(lastSets, target, 5);
    expect(a).toEqual(b);
  });

  it('uses the lower-body increment when configured', () => {
    const lastSets = [makeSet(0, 100, 12), makeSet(1, 100, 12), makeSet(2, 100, 12)];
    const result = getProgressionSuggestion(lastSets, target, 5);
    expect(result.suggestedWeightKg).toBe(105);
  });

  it('does not treat a session with fewer logged sets than the target as fully met', () => {
    const lastSets = [makeSet(0, 60, 12), makeSet(1, 60, 12)];
    const result = getProgressionSuggestion(lastSets, target, 2.5);
    expect(result.type).toBe('repeat_weight');
  });
});
