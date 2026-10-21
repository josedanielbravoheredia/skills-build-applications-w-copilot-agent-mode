import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Activities from './components/Activities.js';
import Teams from './components/Teams.js';
import Leaderboard from './components/Leaderboard.js';
import Workouts from './components/Workouts.js';
import Profiles from './components/Profiles.js';

export default function App() {
  return (
    <div className="container py-4">
      <header className="mb-4 border-bottom pb-3">
        <p className="text-uppercase small fw-semibold text-primary mb-1">School fitness program</p>
        <h1 className="h2 mb-3">OctoFit Tracker</h1>
        <nav aria-label="OctoFit sections" className="nav nav-pills gap-2">
          <NavLink className="nav-link" to="/profiles">Profiles</NavLink>
          <NavLink className="nav-link" to="/activities">Activities</NavLink>
          <NavLink className="nav-link" to="/teams">Teams</NavLink>
          <NavLink className="nav-link" to="/leaderboard">Leaderboard</NavLink>
          <NavLink className="nav-link" to="/workouts">Workout suggestions</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/activities" replace />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/workouts" element={<Workouts />} />
        </Routes>
      </main>
    </div>
  );
}
