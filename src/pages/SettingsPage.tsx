import { useRef, useState } from 'react';
import { exportAll, importAll } from '../db/queries';
import type { ExportBundle } from '../types';

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

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
