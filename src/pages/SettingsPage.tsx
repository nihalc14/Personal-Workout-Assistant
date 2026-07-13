import { useRef, useState } from 'react';
import { exportAll, importAll } from '../db/queries';
import { loadProfile, saveProfile } from '../logic/profile';
import type { ExportBundle, ExperienceLevel, FitnessGoal, Sex, UserProfile } from '../types';

const GOAL_LABELS: Record<FitnessGoal, string> = {
  'build-strength': 'Build Strength',
  'lose-fat': 'Lose Fat',
  'stay-consistent': 'Stay Consistent',
  'general-fitness': 'General Fitness',
};

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [profileMessage, setProfileMessage] = useState('');

  function updateProfile(patch: Partial<UserProfile>) {
    if (!profile) return;
    setProfile({ ...profile, ...patch });
    setProfileMessage('');
  }

  function handleProfileSave() {
    if (!profile) return;
    if (profile.name.trim() === '' || profile.age < 10 || profile.age > 100 || Number.isNaN(profile.age)) {
      setProfileMessage('Enter a name and a valid age (10–100).');
      return;
    }
    saveProfile({ ...profile, name: profile.name.trim() });
    setProfileMessage('Profile saved.');
  }

  async function handleExport() {
    const bundle = await exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `workout-tracker-export-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Export downloaded.');
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as ExportBundle;
      if (bundle.version !== 1 || !Array.isArray(bundle.exercises)) {
        setMessage('This file does not look like a valid export.');
        return;
      }
      if (!confirm('Importing will replace all current data on this device. Continue?')) return;
      await importAll(bundle);
      setMessage('Import complete.');
    } catch {
      setMessage('Could not read that file as a valid export.');
    }
  }

  return (
    <div>
      <h1>Settings</h1>

      {profile && (
        <div className="card">
          <h3>Profile</h3>
          <div className="field-row">
            <label className="muted" style={{ width: 90 }}>Name</label>
            <input
              type="text"
              style={{ width: 'auto', flex: 1, textAlign: 'left' }}
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </div>
          <div className="field-row">
            <label className="muted" style={{ width: 90 }}>Age</label>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={100}
              value={Number.isNaN(profile.age) ? '' : profile.age}
              onChange={(e) => updateProfile({ age: Number(e.target.value) })}
            />
          </div>
          <div className="field-row">
            <label className="muted" style={{ width: 90 }}>Sex</label>
            <select
              value={profile.sex}
              onChange={(e) => updateProfile({ sex: e.target.value as Sex })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="field-row">
            <label className="muted" style={{ width: 90 }}>Goal</label>
            <select
              value={profile.goal}
              onChange={(e) => updateProfile({ goal: e.target.value as FitnessGoal })}
            >
              {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map((g) => (
                <option key={g} value={g}>{GOAL_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label className="muted" style={{ width: 90 }}>Experience</label>
            <select
              value={profile.experience}
              onChange={(e) => updateProfile({ experience: e.target.value as ExperienceLevel })}
            >
              {(Object.keys(LEVEL_LABELS) as ExperienceLevel[]).map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn" onClick={handleProfileSave}>Save profile</button>
          </div>
          {profileMessage && <p className="muted" style={{ marginTop: 8 }}>{profileMessage}</p>}
        </div>
      )}

      <div className="card">
        <h3>Backup</h3>
        <p className="muted">
          All history is stored only on this device. Export regularly, since browser storage can be
          evicted by the OS.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={handleExport}>Export history (JSON)</button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = '';
          }}
        />
        {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
      </div>
    </div>
  );
}
