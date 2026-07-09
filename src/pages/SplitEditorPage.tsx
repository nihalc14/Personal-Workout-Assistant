import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db/db';
import { readExerciseMediaFile, resolveMediaSrc } from '../logic/media';
import type { Equipment, Exercise, SplitDayExercise } from '../types';

const EQUIPMENT_OPTIONS: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

type ExerciseModalState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; exercise: Exercise };

export default function SplitEditorPage() {
  const days = useLiveQuery(() => db.splitDays.orderBy('order').toArray(), [], []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [exerciseModal, setExerciseModal] = useState<ExerciseModalState>({ mode: 'closed' });

  const activeDayId = selectedDayId ?? days?.[0]?.id ?? null;
  const activeDay = days?.find((d) => d.id === activeDayId) ?? null;
  const exerciseById = new Map((exercises ?? []).map((e) => [e.id, e]));

  async function addDay() {
    const name = prompt('Day name (e.g. Push, Pull, Legs)');
    if (!name?.trim()) return;
    const order = days?.length ?? 0;
    const id = uuid();
    await db.splitDays.add({ id, name: name.trim(), order, exercises: [] });
    setSelectedDayId(id);
  }

  async function renameDay(dayId: string) {
    const day = days?.find((d) => d.id === dayId);
    if (!day) return;
    const name = prompt('Rename day', day.name);
    if (!name?.trim()) return;
    await db.splitDays.update(dayId, { name: name.trim() });
  }

  async function deleteDay(dayId: string) {
    if (!confirm('Delete this day from the split?')) return;
    await db.splitDays.delete(dayId);
    const remaining = (days ?? []).filter((d) => d.id !== dayId);
    for (let i = 0; i < remaining.length; i++) {
      await db.splitDays.update(remaining[i].id, { order: i });
    }
    setSelectedDayId(null);
  }

  async function moveDay(dayId: string, direction: -1 | 1) {
    if (!days) return;
    const idx = days.findIndex((d) => d.id === dayId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= days.length) return;
    await db.splitDays.update(days[idx].id, { order: swapIdx });
    await db.splitDays.update(days[swapIdx].id, { order: idx });
  }

  async function addExerciseToDay(exerciseId: string) {
    if (!activeDay) return;
    const entry: SplitDayExercise = {
      exerciseId,
      order: activeDay.exercises.length,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
    };
    await db.splitDays.update(activeDay.id, {
      exercises: [...activeDay.exercises, entry],
    });
  }

  async function updateDayExercise(exerciseId: string, patch: Partial<SplitDayExercise>) {
    if (!activeDay) return;
    const updated = activeDay.exercises.map((e) =>
      e.exerciseId === exerciseId ? { ...e, ...patch } : e
    );
    await db.splitDays.update(activeDay.id, { exercises: updated });
  }

  async function removeDayExercise(exerciseId: string) {
    if (!activeDay) return;
    const updated = activeDay.exercises
      .filter((e) => e.exerciseId !== exerciseId)
      .map((e, i) => ({ ...e, order: i }));
    await db.splitDays.update(activeDay.id, { exercises: updated });
  }

  async function moveDayExercise(exerciseId: string, direction: -1 | 1) {
    if (!activeDay) return;
    const sorted = [...activeDay.exercises].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((e) => e.exerciseId === exerciseId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx].order, sorted[swapIdx].order] = [sorted[swapIdx].order, sorted[idx].order];
    await db.splitDays.update(activeDay.id, { exercises: sorted });
  }

  if (!days || !exercises) return <p className="muted">Loading…</p>;

  const sortedDayExercises = activeDay
    ? [...activeDay.exercises].sort((a, b) => a.order - b.order)
    : [];
  const exerciseIdsInDay = new Set(sortedDayExercises.map((e) => e.exerciseId));
  const availableToAdd = exercises.filter((e) => !exerciseIdsInDay.has(e.id));
  const sortedLibrary = [...exercises].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h1>Split</h1>

      <div className="btn-row" style={{ flexWrap: 'wrap' }}>
        {days.map((day) => (
          <button
            key={day.id}
            className={`btn ${day.id === activeDayId ? '' : 'secondary'}`}
            onClick={() => setSelectedDayId(day.id)}
          >
            {day.name}
          </button>
        ))}
        <button className="btn secondary" onClick={addDay}>
          + Day
        </button>
      </div>

      {activeDay && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="exercise-header">
            <h3>{activeDay.name}</h3>
            <div className="btn-row">
              <button className="link-btn" onClick={() => moveDay(activeDay.id, -1)}>↑</button>
              <button className="link-btn" onClick={() => moveDay(activeDay.id, 1)}>↓</button>
              <button className="link-btn" onClick={() => renameDay(activeDay.id)}>Rename</button>
              <button className="link-btn" onClick={() => deleteDay(activeDay.id)}>Delete</button>
            </div>
          </div>

          {sortedDayExercises.length === 0 && (
            <p className="muted">No exercises yet. Add one below.</p>
          )}

          {sortedDayExercises.map((se) => {
            const exercise = exerciseById.get(se.exerciseId);
            return (
              <div key={se.exerciseId} className="set-row" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <strong>{exercise?.name ?? 'Unknown exercise'}</strong>
                  <div className="field-row" style={{ marginTop: 6 }}>
                    <label className="muted">Sets</label>
                    <input
                      type="number"
                      value={se.targetSets}
                      min={1}
                      onChange={(e) =>
                        updateDayExercise(se.exerciseId, { targetSets: Number(e.target.value) })
                      }
                    />
                    <label className="muted">Reps</label>
                    <input
                      type="number"
                      value={se.targetRepsMin}
                      min={1}
                      onChange={(e) =>
                        updateDayExercise(se.exerciseId, { targetRepsMin: Number(e.target.value) })
                      }
                    />
                    <span className="muted">–</span>
                    <input
                      type="number"
                      value={se.targetRepsMax}
                      min={1}
                      onChange={(e) =>
                        updateDayExercise(se.exerciseId, { targetRepsMax: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="btn-row">
                  <button className="link-btn" onClick={() => moveDayExercise(se.exerciseId, -1)}>↑</button>
                  <button className="link-btn" onClick={() => moveDayExercise(se.exerciseId, 1)}>↓</button>
                  <button className="link-btn" onClick={() => removeDayExercise(se.exerciseId)}>Remove</button>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 12 }}>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addExerciseToDay(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="" disabled>
                Add exercise…
              </option>
              {availableToAdd.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.equipment})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="card">
        <div className="exercise-header">
          <h3>Exercise library</h3>
          <button className="link-btn" onClick={() => setExerciseModal({ mode: 'create' })}>
            + Add exercise
          </button>
        </div>
        {sortedLibrary.map((ex) => (
          <div className="substitute-item" key={ex.id}>
            <span>
              {ex.name} <span className="muted">({ex.equipment}, +{ex.incrementKg}kg)</span>
            </span>
            <button className="link-btn" onClick={() => setExerciseModal({ mode: 'edit', exercise: ex })}>
              Edit
            </button>
          </div>
        ))}
      </div>

      {exerciseModal.mode !== 'closed' && (
        <ExerciseModal
          existing={exerciseModal.mode === 'edit' ? exerciseModal.exercise : undefined}
          onClose={() => setExerciseModal({ mode: 'closed' })}
        />
      )}
    </div>
  );
}

function ExerciseModal({ existing, onClose }: { existing?: Exercise; onClose: () => void }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [muscles, setMuscles] = useState(existing?.primaryMuscles.join(', ') ?? '');
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'barbell');
  const [cues, setCues] = useState(existing?.cues.join('\n') ?? '');
  const [incrementKg, setIncrementKg] = useState(existing?.incrementKg ?? 2.5);
  const [mediaFile, setMediaFile] = useState<string | undefined>(existing?.mediaFile);
  const [mediaLicense, setMediaLicense] = useState<string | undefined>(existing?.mediaLicense);
  const [error, setError] = useState('');

  async function handleMediaChange(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'image/gif' && !file.type.startsWith('image/')) {
      setError('Please choose an image or GIF file');
      return;
    }
    const dataUrl = await readExerciseMediaFile(file);
    setMediaFile(dataUrl);
    setMediaLicense(undefined); // user-supplied media carries no bundled license
  }

  async function save() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const primaryMuscles = muscles
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
    if (primaryMuscles.length === 0) {
      setError('At least one muscle group is required');
      return;
    }
    const exercise: Exercise = {
      id: existing?.id ?? uuid(),
      name: name.trim(),
      primaryMuscles,
      equipment,
      cues: cues.split('\n').map((c) => c.trim()).filter(Boolean),
      incrementKg,
      mediaFile,
      mediaLicense,
      isCustom: existing?.isCustom ?? true,
    };
    await db.exercises.put(exercise);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <h3>{existing ? 'Edit exercise' : 'Add exercise'}</h3>
          <button className="link-btn" onClick={onClose}>Close</button>
        </div>
        <label className="muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label className="muted" style={{ display: 'block', marginTop: 8 }}>
          Muscle groups (comma separated)
        </label>
        <input value={muscles} onChange={(e) => setMuscles(e.target.value)} placeholder="chest, triceps" />
        <label className="muted" style={{ display: 'block', marginTop: 8 }}>Equipment</label>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
          {EQUIPMENT_OPTIONS.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
        <label className="muted" style={{ display: 'block', marginTop: 8 }}>
          Form cues (one per line, optional)
        </label>
        <textarea
          value={cues}
          onChange={(e) => setCues(e.target.value)}
          rows={3}
          style={{ width: '100%', background: '#12141a', color: '#f2f2f2', border: '1px solid #2a2e38', borderRadius: 8, padding: 10 }}
        />
        <label className="muted" style={{ display: 'block', marginTop: 8 }}>
          Weight increment (kg)
        </label>
        <input
          type="number"
          step={0.5}
          value={incrementKg}
          onChange={(e) => setIncrementKg(Number(e.target.value))}
        />
        <label className="muted" style={{ display: 'block', marginTop: 8 }}>
          Demo image or GIF (optional)
        </label>
        {mediaFile && (
          <div className="demo-media" style={{ aspectRatio: '16 / 9', marginBottom: 8 }}>
            <img src={resolveMediaSrc(mediaFile)} alt="" />
          </div>
        )}
        <div className="btn-row">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleMediaChange(e.target.files?.[0])}
          />
          {mediaFile && (
            <button className="link-btn" onClick={() => { setMediaFile(undefined); setMediaLicense(undefined); }}>
              Remove
            </button>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="btn-row">
          <button className="btn" onClick={save}>Save exercise</button>
        </div>
      </div>
    </div>
  );
}
