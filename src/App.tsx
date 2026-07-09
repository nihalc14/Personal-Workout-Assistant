import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { seedOnce } from './data/seed';
import TodayPage from './pages/TodayPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import SplitEditorPage from './pages/SplitEditorPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedOnce().then(() => setReady(true));
  }, []);

  if (!ready) return <div className="loading-screen">Loading…</div>;

  return (
    <HashRouter>
      <div className="app-shell">
        <main className="app-content">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/workout/:sessionId" element={<ActiveWorkoutPage />} />
            <Route path="/split" element={<SplitEditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <nav className="bottom-nav">
          <NavLink to="/" end>
            Today
          </NavLink>
          <NavLink to="/split">Split</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </div>
    </HashRouter>
  );
}

export default App;
