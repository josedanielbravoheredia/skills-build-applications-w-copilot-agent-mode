import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard').then((result) => {
      if (active) setEntries(result.leaderboard ?? []);
    }).catch((reason: unknown) => {
      if (active) setError(`Leaderboard could not be loaded: ${reason instanceof Error ? reason.message : 'Unknown error'}`);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="leaderboard-heading">
      <div className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">Points standings</p>
        <h2 id="leaderboard-heading" className="h3">Leaderboard</h2>
        <p className="text-secondary mb-0">Team totals update from recorded activity.</p>
      </div>
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {loading ? <p role="status">Loading leaderboard...</p> : entries.length === 0 ? <p className="text-secondary">No leaderboard rankings yet.</p> : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <caption className="visually-hidden">Teams ranked by total points</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col" className="text-end">Points</th></tr></thead>
            <tbody>{entries.map((entry, index) => <tr key={`${entry.rank}-${entry.teamName}`}>
              <th scope="row">{entry.rank || index + 1}</th>
              <td>{entry.teamName}</td>
              <td className="text-end fw-semibold">{entry.totalPoints}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
