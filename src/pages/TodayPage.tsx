import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db/db';
import { getNextSplitDay } from '../db/queries';
import type { SplitDay, WorkoutSession } from '../types';

export default function TodayPage() {
  const navigate = useNavigate();
  // `undefined` is only ever the "still loading" sentinel here, since
  // toArray() itself never resolves to undefined.
  const days = useLiveQuery(() => db.splitDays.orderBy('order').toArray(), []);
  const [suggestedDay, setSuggestedDay] = useState<SplitDay | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // "No session in progress" legitimately resolves to undefined, which is
  // indistinguishable from the library's loading sentinel - so wrap the
  // result to tell "still loading" apart from "loaded, found nothing".
  const inProgressResult = useLiveQuery(
    async () => ({ session: (await db.sessions.filter((s) => s.completedAt === null).first()) ?? null }),
    [],
    null
  );
  const inProgress = inProgressResult?.session;
  const inProgressLoading = inProgressResult === null;

  useEffect(() => {
    getNextSplitDay().then(setSuggestedDay);
  }, [days]);

  async function startSession(day: SplitDay | null) {
    const session: WorkoutSession = {
      id: uuid(),
      splitDayId: day?.id ?? null,
      splitDayName: day?.name ?? 'Ad hoc workout',
      plannedExercises: day?.exercises ?? [],
      adHocExerciseIds: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    await db.sessions.add(session);
    navigate(`/workout/${session.id}`);
  }

  if (days === undefined || inProgressLoading) {
    return <p className="muted">Loading…</p>;
  }

  if (inProgress) {
    return (
      <div>
        <h1>Workout in progress</h1>
        <div className="card">
          <p>{inProgress.splitDayName}</p>
          <button className="btn" onClick={() => navigate(`/workout/${inProgress.id}`)}>
            Resume workout
          </button>
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div>
        <h1>Today</h1>
        <p className="muted">No split defined yet. Head to the Split tab to set up your days.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Today</h1>
      <div className="card">
        <p className="muted">Next up</p>
        <h2>{suggestedDay?.name ?? days[0].name}</h2>
        <button className="btn" onClick={() => startSession(suggestedDay ?? days[0])}>
          Start {suggestedDay?.name ?? days[0].name}
        </button>
        <div className="btn-row">
          <button className="link-btn" onClick={() => setShowPicker(true)}>
            Choose a different day
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="modal-backdrop" onClick={() => setShowPicker(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <h3>Pick a day</h3>
              <button className="link-btn" onClick={() => setShowPicker(false)}>Close</button>
            </div>
            {days.map((day) => (
              <button
                key={day.id}
                className="btn secondary"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => startSession(day)}
              >
                {day.name}
              </button>
            ))}
            <button className="btn secondary" style={{ width: '100%' }} onClick={() => startSession(null)}>
              Ad hoc workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
