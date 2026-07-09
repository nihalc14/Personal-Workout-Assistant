import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db/db';
import { getCurrentSessionSetsForExercise, getLastSessionSetsForExercise } from '../db/queries';
import { getProgressionSuggestion, type TargetScheme } from '../logic/progression';
import { getSubstitutes } from '../logic/substitution';
import { resolveMediaSrc } from '../logic/media';
import type { Exercise, LoggedSet } from '../types';

const DEFAULT_TARGET: TargetScheme = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 };

export default function ActiveWorkoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  // A not-found session legitimately resolves to undefined, indistinguishable
  // from "still loading" - wrap it so the loading gate below can tell them apart.
  const sessionResult = useLiveQuery(
    async () => ({ session: sessionId ? ((await db.sessions.get(sessionId)) ?? null) : null }),
    [sessionId],
    null
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [pickingAdHoc, setPickingAdHoc] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const exerciseById = useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e])),
    [exercises]
  );

  if (!sessionId || sessionResult === null || !exercises) return <p className="muted">Loading…</p>;
  const session = sessionResult.session;
  if (!session) return <p className="muted">Workout not found.</p>;

  const entries: { exerciseId: string; target: TargetScheme; isAdHoc: boolean }[] = [
    ...[...session.plannedExercises]
      .sort((a, b) => a.order - b.order)
      .map((pe) => ({ exerciseId: pe.exerciseId, target: pe, isAdHoc: false })),
    ...session.adHocExerciseIds.map((id) => ({ exerciseId: id, target: DEFAULT_TARGET, isAdHoc: true })),
  ];

  const clampedIndex = Math.min(currentIndex, Math.max(entries.length - 1, 0));
  const current = entries[clampedIndex];
  const currentExercise = current ? exerciseById.get(current.exerciseId) : undefined;

  async function substituteExercise(oldExerciseId: string, newExerciseId: string, replaceInTemplate: boolean) {
    if (!session) return;
    const planned = session.plannedExercises.find((pe) => pe.exerciseId === oldExerciseId);
    if (planned) {
      const updatedPlanned = session.plannedExercises.map((pe) =>
        pe.exerciseId === oldExerciseId ? { ...pe, exerciseId: newExerciseId } : pe
      );
      await db.sessions.update(session.id, { plannedExercises: updatedPlanned });

      if (replaceInTemplate && session.splitDayId) {
        const day = await db.splitDays.get(session.splitDayId);
        if (day) {
          const updatedDayExercises = day.exercises.map((de) =>
            de.exerciseId === oldExerciseId ? { ...de, exerciseId: newExerciseId } : de
          );
          await db.splitDays.update(session.splitDayId, { exercises: updatedDayExercises });
        }
      }
    } else {
      const updatedAdHoc = session.adHocExerciseIds.map((id) => (id === oldExerciseId ? newExerciseId : id));
      await db.sessions.update(session.id, { adHocExerciseIds: updatedAdHoc });
    }
  }

  async function addAdHocExercise(exerciseId: string) {
    if (!session) return;
    await db.sessions.update(session.id, {
      adHocExerciseIds: [...session.adHocExerciseIds, exerciseId],
    });
    setPickingAdHoc(false);
    setCurrentIndex(entries.length); // jump to the newly added exercise
  }

  async function finishWorkout() {
    if (!session) return;
    await db.sessions.update(session.id, { completedAt: new Date().toISOString() });
    navigate('/');
  }

  const usedExerciseIds = new Set(entries.map((e) => e.exerciseId));
  const availableForAdHoc = exercises.filter((e) => !usedExerciseIds.has(e.id));

  return (
    <div>
      <div className="exercise-header">
        <h1>{session.splitDayName}</h1>
        <button className="link-btn" onClick={finishWorkout}>Finish</button>
      </div>

      {entries.length === 0 && <p className="muted">No exercises in this session yet.</p>}

      {current && currentExercise && (
        <>
          <p className="muted" style={{ marginTop: -8, marginBottom: 8 }}>
            Exercise {clampedIndex + 1} of {entries.length}
          </p>
          <ExerciseCard
            key={current.exerciseId}
            sessionId={session.id}
            exercise={currentExercise}
            target={current.target}
            isAdHoc={current.isAdHoc}
            allExercises={exercises}
            onSubstitute={substituteExercise}
          />
          <div className="btn-row">
            <button
              className="btn secondary"
              disabled={clampedIndex === 0}
              onClick={() => setCurrentIndex(clampedIndex - 1)}
            >
              ← Previous
            </button>
            <button
              className="btn secondary"
              disabled={clampedIndex >= entries.length - 1}
              onClick={() => setCurrentIndex(clampedIndex + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      <button className="link-btn" onClick={() => setPickingAdHoc(true)}>
        + Add exercise to this session
      </button>

      {pickingAdHoc && (
        <div className="modal-backdrop" onClick={() => setPickingAdHoc(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <h3>Add exercise</h3>
              <button className="link-btn" onClick={() => setPickingAdHoc(false)}>Close</button>
            </div>
            {availableForAdHoc.map((ex) => (
              <div key={ex.id} className="substitute-item">
                <span>{ex.name}</span>
                <button className="btn secondary" onClick={() => addAdHocExercise(ex.id)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  sessionId,
  exercise,
  target,
  isAdHoc,
  allExercises,
  onSubstitute,
}: {
  sessionId: string;
  exercise: Exercise;
  target: TargetScheme;
  isAdHoc: boolean;
  allExercises: Exercise[];
  onSubstitute: (oldId: string, newId: string, replaceInTemplate: boolean) => void;
}) {
  const currentSets = useLiveQuery(
    () => getCurrentSessionSetsForExercise(sessionId, exercise.id),
    [sessionId, exercise.id],
    []
  );
  const lastSets = useLiveQuery(
    () => getLastSessionSetsForExercise(exercise.id, sessionId),
    [exercise.id, sessionId],
    []
  );
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [weight, setWeight] = useState<string | null>(null);
  const [reps, setReps] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (currentSets === undefined || lastSets === undefined) return null;

  const suggestion =
    currentSets.length === 0 ? getProgressionSuggestion(lastSets, target, exercise.incrementKg) : null;

  const lastCurrentSet = currentSets[currentSets.length - 1];
  const lastPriorSet = lastSets[lastSets.length - 1];
  const prefillWeight =
    weight ?? (lastCurrentSet?.weightKg ?? lastPriorSet?.weightKg ?? '').toString();
  const prefillReps = reps ?? (lastCurrentSet?.reps ?? lastPriorSet?.reps ?? '').toString();

  function applySuggestion() {
    if (!suggestion || suggestion.suggestedWeightKg === null) return;
    setWeight(String(suggestion.suggestedWeightKg));
  }

  async function logSet() {
    const w = Number(prefillWeight);
    const r = Number(prefillReps);
    if (!Number.isFinite(w) || w <= 0 || Math.round(w * 2) !== w * 2) {
      setError('Weight must be a positive number in 0.5 kg increments');
      return;
    }
    if (!Number.isInteger(r) || r < 1 || r > 100) {
      setError('Reps must be a whole number between 1 and 100');
      return;
    }
    setError('');
    const set: LoggedSet = {
      id: uuid(),
      sessionId,
      exerciseId: exercise.id,
      setIndex: currentSets.length,
      weightKg: w,
      reps: r,
      loggedAt: new Date().toISOString(),
    };
    await db.sets.add(set);
    setWeight(null);
    setReps(null);
  }

  async function deleteSet(setId: string) {
    await db.sets.delete(setId);
    // Renumber remaining sets so setIndex stays contiguous - otherwise a
    // newly logged set could collide with a surviving set's index.
    const remaining = currentSets.filter((s) => s.id !== setId).sort((a, b) => a.setIndex - b.setIndex);
    await Promise.all(remaining.map((s, i) => db.sets.update(s.id, { setIndex: i })));
  }

  async function updateSet(setId: string, patch: Partial<LoggedSet>) {
    await db.sets.update(setId, patch);
  }

  return (
    <div className="card">
      <div className="demo-media">
        {exercise.mediaFile ? (
          <img src={resolveMediaSrc(exercise.mediaFile)} alt={`${exercise.name} form demonstration`} />
        ) : (
          'No demo media yet'
        )}
      </div>
      {exercise.mediaLicense && (
        <p className="muted" style={{ marginTop: -4 }}>{exercise.mediaLicense}</p>
      )}

      <div className="exercise-header">
        <h3>{exercise.name}</h3>
        <button className="link-btn" onClick={() => setShowSubstitute(true)}>Substitute</button>
      </div>

      {exercise.cues.length > 0 && (
        <ul className="cues-list">
          {exercise.cues.map((cue, i) => (
            <li key={i}>{cue}</li>
          ))}
        </ul>
      )}

      <p className="muted">
        Target {target.targetSets} x {target.targetRepsMin}-{target.targetRepsMax}
        {isAdHoc ? ' (ad hoc)' : ''}
      </p>

      {lastSets.length > 0 && (
        <p className="muted">
          Last time: {lastSets.map((s) => `${s.weightKg}x${s.reps}`).join(', ')}
        </p>
      )}

      {suggestion && suggestion.type !== 'none' && (
        <button
          className={`pill ${suggestion.type === 'increase_weight' ? 'increase' : 'repeat'}`}
          onClick={applySuggestion}
          style={{ border: 'none', cursor: 'pointer', marginBottom: 8 }}
        >
          {suggestion.message}
        </button>
      )}

      {currentSets.map((s, i) => (
        <div className="set-row" key={s.id}>
          <span className="muted">Set {i + 1}</span>
          <input
            type="number"
            step={0.5}
            value={s.weightKg}
            onChange={(e) => updateSet(s.id, { weightKg: Number(e.target.value) })}
          />
          <span className="muted">kg x</span>
          <input
            type="number"
            value={s.reps}
            onChange={(e) => updateSet(s.id, { reps: Number(e.target.value) })}
          />
          <button className="link-btn" onClick={() => deleteSet(s.id)}>✕</button>
        </div>
      ))}

      <div className="field-row" style={{ marginTop: 8 }}>
        <input
          type="number"
          step={0.5}
          value={prefillWeight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="kg"
        />
        <span className="muted">kg x</span>
        <input
          type="number"
          value={prefillReps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
        />
        <button className="btn" onClick={logSet}>Log set</button>
      </div>
      {error && <p className="error-text">{error}</p>}

      {showSubstitute && (
        <SubstituteSheet
          exercise={exercise}
          allExercises={allExercises}
          onClose={() => setShowSubstitute(false)}
          onPick={(newId, replaceInTemplate) => {
            onSubstitute(exercise.id, newId, replaceInTemplate);
            setShowSubstitute(false);
          }}
        />
      )}
    </div>
  );
}

function SubstituteSheet({
  exercise,
  allExercises,
  onClose,
  onPick,
}: {
  exercise: Exercise;
  allExercises: Exercise[];
  onClose: () => void;
  onPick: (newExerciseId: string, replaceInTemplate: boolean) => void;
}) {
  const [replaceInTemplate, setReplaceInTemplate] = useState(false);
  const grouped = getSubstitutes(exercise, allExercises);
  const equipmentOrder: (keyof typeof grouped)[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <h3>Substitute {exercise.name}</h3>
          <button className="link-btn" onClick={onClose}>Close</button>
        </div>
        <label className="muted">
          <input
            type="checkbox"
            checked={replaceInTemplate}
            onChange={(e) => setReplaceInTemplate(e.target.checked)}
            style={{ width: 'auto', marginRight: 6 }}
          />
          Also replace in split template
        </label>

        {equipmentOrder.map((eq) => {
          const items = grouped[eq];
          if (!items || items.length === 0) return null;
          return (
            <div className="substitute-group" key={eq}>
              <h4>{eq}</h4>
              {items.map((candidate) => (
                <div className="substitute-item" key={candidate.id}>
                  <span>{candidate.name}</span>
                  <button className="btn secondary" onClick={() => onPick(candidate.id, replaceInTemplate)}>
                    Use
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <p className="muted">No substitutes found sharing a muscle group.</p>
        )}
      </div>
    </div>
  );
}
