import { FormEvent, useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type User = { _id?: string; id?: string; name: string; email: string };
type Suggestion = { title?: string; focus?: string; reason?: string; duration?: number; minutes?: number };

export default function Workouts() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('mona@example.com');
  const [requestedEmail, setRequestedEmail] = useState('mona@example.com');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    getJson<{ users: User[] }>('/api/users').then((result) => {
      if (!active) return;
      const loadedUsers = result.users ?? [];
      setUsers(loadedUsers);
      if (loadedUsers[0]?.email) {
        setEmail(loadedUsers[0].email);
        setRequestedEmail(loadedUsers[0].email);
      }
    }).catch((reason: unknown) => {
      if (active) setErrors([`Profiles could not be loaded: ${reason instanceof Error ? reason.message : 'Unknown error'}`]);
    }).finally(() => { if (active) setLoadingUsers(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(requestedEmail)}`).then((result) => {
      if (active) {
        setSuggestions(result.suggestions ?? []);
        setErrors((current) => current.filter((item) => !item.startsWith('Suggestions could not be loaded:')));
      }
    }).catch((reason: unknown) => {
      if (active) setErrors((current) => [...current.filter((item) => !item.startsWith('Suggestions could not be loaded:')), `Suggestions could not be loaded: ${reason instanceof Error ? reason.message : 'Unknown error'}`]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedEmail]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedEmail(email.trim());
  }

  return (
    <section aria-labelledby="workouts-heading">
      <div className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">Personal training</p>
        <h2 id="workouts-heading" className="h3">Workout suggestions</h2>
        <p className="text-secondary mb-0">Recommendations are tailored to the selected profile.</p>
      </div>
      {errors.length > 0 && <p className="alert alert-danger" role="alert">{errors.join(' ')}</p>}
      <form className="row g-3 align-items-end mb-4" onSubmit={submit}>
        <div className="col-md-8 col-lg-6">
          <label className="form-label" htmlFor="workout-profile">Profile</label>
          {users.length > 0 ? (
            <select className="form-select" id="workout-profile" value={email} onChange={(event) => { setEmail(event.target.value); setRequestedEmail(event.target.value); }} disabled={loadingUsers}>
              {users.map((user, index) => <option key={user._id ?? user.id ?? user.email ?? index} value={user.email}>{user.name} ({user.email})</option>)}
            </select>
          ) : (
            <input className="form-control" id="workout-profile" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          )}
          {loadingUsers && <div className="form-text">Loading profiles...</div>}
        </div>
        {users.length === 0 && <div className="col-md-auto"><button className="btn btn-outline-primary" type="submit">Get suggestions</button></div>}
      </form>
      {loading ? <p role="status">Loading workout suggestions...</p> : suggestions.length === 0 ? <p className="text-secondary">No workout suggestions are available for this profile yet.</p> : (
        <>
          <p role="status" className="visually-hidden">Workout suggestions loaded.</p>
          <ul className="list-group">
            {suggestions.map((suggestion, index) => <li className="list-group-item px-0" key={`${suggestion.title ?? suggestion.focus ?? 'workout'}-${index}`}>
              <h3 className="h5 mb-1">{suggestion.focus ?? suggestion.title ?? 'Recommended workout'}</h3>
              {suggestion.reason && <p className="mb-1">{suggestion.reason}</p>}
              {(suggestion.duration ?? suggestion.minutes) && <p className="small text-secondary mb-0">{suggestion.duration ?? suggestion.minutes} minutes</p>}
            </li>)}
          </ul>
        </>
      )}
    </section>
  );
}
