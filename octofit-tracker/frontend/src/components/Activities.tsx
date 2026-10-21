import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJson, postJson } from '../api/client.js';

type User = { _id?: string; id?: string; name: string; email: string };
type Team = { _id?: string; id?: string; name: string };
type Reference = string | { _id?: string; id?: string; name?: string } | undefined;
type Activity = { _id?: string; type: string; minutes: number; points?: number; user?: Reference; team?: Reference };

function referenceName(reference: Reference, options: Array<User | Team>) {
  if (typeof reference === 'object' && reference?.name) return reference.name;
  const referenceId = typeof reference === 'string' ? reference : reference?._id ?? reference?.id;
  return options.find((option) => (option._id ?? option.id) === referenceId)?.name ?? referenceId ?? 'Unassigned';
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [type, setType] = useState('walking');
  const [minutes, setMinutes] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getJson<{ activities: Activity[] }>('/api/activities'),
      getJson<{ users: User[] }>('/api/users'),
      getJson<{ teams: Team[] }>('/api/teams'),
    ]).then((results) => {
      if (!active) return;
      const nextErrors: string[] = [];
      if (results[0].status === 'fulfilled') setActivities(results[0].value.activities ?? []);
      else nextErrors.push(`Activities could not be loaded: ${results[0].reason instanceof Error ? results[0].reason.message : 'Unknown error'}`);
      if (results[1].status === 'fulfilled') setUsers(results[1].value.users ?? []);
      else nextErrors.push(`Profiles could not be loaded: ${results[1].reason instanceof Error ? results[1].reason.message : 'Unknown error'}`);
      if (results[2].status === 'fulfilled') setTeams(results[2].value.teams ?? []);
      else nextErrors.push(`Teams could not be loaded: ${results[2].reason instanceof Error ? results[2].reason.message : 'Unknown error'}`);
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setErrors([]);
    try {
      const result = await postJson<{ activity: Activity }>('/api/activities', {
        userId,
        teamId,
        type: type.trim(),
        minutes: Number(minutes),
      });
      setActivities((current) => [result.activity, ...current]);
      setSuccess('Activity recorded successfully.');
      setMinutes('30');
    } catch (error) {
      setErrors([`Activity could not be recorded: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="activities-heading">
      <div className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">Movement log</p>
        <h2 id="activities-heading" className="h3">Activities</h2>
        <p className="text-secondary mb-0">Record minutes completed by a student or team.</p>
      </div>
      {errors.length > 0 && <p className="alert alert-danger" role="alert">{errors.join(' ')}</p>}
      {success && <p className="alert alert-success" role="status">{success}</p>}

      <div className="row g-4 align-items-start">
        <div className="col-lg-5">
          <form className="border rounded p-3" onSubmit={submitActivity}>
            <h3 className="h5 mb-3">Record activity</h3>
            <div className="mb-3">
              <label className="form-label" htmlFor="activity-user">Student</label>
              <select className="form-select" id="activity-user" value={userId} onChange={(event) => setUserId(event.target.value)} required>
                <option value="">Choose a profile</option>
                {users.map((user, index) => <option key={user._id ?? user.id ?? user.email ?? index} value={user._id ?? user.id ?? ''}>{user.name} ({user.email})</option>)}
              </select>
              {users.length === 0 && <div className="form-text"><Link to="/profiles">Create a profile</Link> before recording an activity.</div>}
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="activity-team">Team</label>
              <select className="form-select" id="activity-team" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
                <option value="">Choose a team</option>
                {teams.map((team, index) => <option key={team._id ?? team.id ?? index} value={team._id ?? team.id ?? ''}>{team.name}</option>)}
              </select>
              {teams.length === 0 && <div className="form-text"><Link to="/teams">Create a team</Link> before recording an activity.</div>}
            </div>
            <div className="row g-3 mb-3">
              <div className="col-sm-7">
                <label className="form-label" htmlFor="activity-type">Activity type</label>
                <input className="form-control" id="activity-type" value={type} onChange={(event) => setType(event.target.value)} required maxLength={60} />
              </div>
              <div className="col-sm-5">
                <label className="form-label" htmlFor="activity-minutes">Minutes</label>
                <input className="form-control" id="activity-minutes" type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving || users.length === 0 || teams.length === 0}>
              {saving ? 'Recording...' : 'Record activity'}
            </button>
          </form>
        </div>
        <div className="col-lg-7">
          <h3 className="h5">Activity history</h3>
          {loading ? <p role="status">Loading activities...</p> : activities.length === 0 ? <p className="text-secondary">No activities have been recorded yet.</p> : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <caption className="visually-hidden">Recorded activities, students, teams, duration, and points</caption>
                <thead><tr><th scope="col">Activity</th><th scope="col">Student</th><th scope="col">Team</th><th scope="col">Minutes</th><th scope="col">Points</th></tr></thead>
                <tbody>{activities.map((activity, index) => <tr key={activity._id ?? `${activity.type}-${index}`}>
                  <th scope="row" className="text-capitalize">{activity.type}</th>
                  <td>{referenceName(activity.user, users)}</td>
                  <td>{referenceName(activity.team, teams)}</td>
                  <td>{activity.minutes}</td>
                  <td>{activity.points ?? '—'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
