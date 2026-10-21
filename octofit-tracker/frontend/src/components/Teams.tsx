import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJson, postJson } from '../api/client.js';

type User = { _id?: string; id?: string; name: string; email: string };
type Team = { _id?: string; id?: string; name: string; mascot?: string; members?: Array<string | User> };

function memberNames(members: Team['members'], users: User[]) {
  return (members ?? []).map((member) => {
    if (typeof member !== 'string') return member.name ?? member.email ?? 'Member';
    return users.find((user) => (user._id ?? user.id) === member)?.name ?? member;
  });
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [mascot, setMascot] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getJson<{ teams: Team[] }>('/api/teams'), getJson<{ users: User[] }>('/api/users')]).then((results) => {
      if (!active) return;
      const nextErrors: string[] = [];
      if (results[0].status === 'fulfilled') setTeams(results[0].value.teams ?? []);
      else nextErrors.push(`Teams could not be loaded: ${results[0].reason instanceof Error ? results[0].reason.message : 'Unknown error'}`);
      if (results[1].status === 'fulfilled') setUsers(results[1].value.users ?? []);
      else nextErrors.push(`Profiles could not be loaded: ${results[1].reason instanceof Error ? results[1].reason.message : 'Unknown error'}`);
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setErrors([]);
    try {
      const result = await postJson<{ team: Team }>('/api/teams', { name: name.trim(), mascot: mascot.trim(), members });
      setTeams((current) => [...current, result.team]);
      setSuccess('Team created successfully.');
      setName('');
      setMascot('');
      setMembers([]);
    } catch (error) {
      setErrors([`Team could not be created: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setSaving(false);
    }
  }

  function updateMembers(select: HTMLSelectElement) {
    setMembers(Array.from(select.selectedOptions, (option) => option.value));
  }

  return (
    <section aria-labelledby="teams-heading">
      <div className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">Together in motion</p>
        <h2 id="teams-heading" className="h3">Teams</h2>
        <p className="text-secondary mb-0">Create a team and choose its student members.</p>
      </div>
      {errors.length > 0 && <p className="alert alert-danger" role="alert">{errors.join(' ')}</p>}
      {success && <p className="alert alert-success" role="status">{success}</p>}
      <div className="row g-4 align-items-start">
        <div className="col-lg-5">
          <form className="border rounded p-3" onSubmit={createTeam}>
            <h3 className="h5 mb-3">Create a team</h3>
            <div className="mb-3">
              <label className="form-label" htmlFor="team-name">Team name</label>
              <input className="form-control" id="team-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="team-mascot">Mascot</label>
              <input className="form-control" id="team-mascot" value={mascot} onChange={(event) => setMascot(event.target.value)} required maxLength={80} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="team-members">Members</label>
              <select className="form-select" id="team-members" multiple size={Math.min(Math.max(users.length, 3), 6)} value={members} onChange={(event) => updateMembers(event.currentTarget)}>
                {users.map((user, index) => <option key={user._id ?? user.id ?? user.email ?? index} value={user._id ?? user.id ?? ''}>{user.name} ({user.email})</option>)}
              </select>
              {users.length === 0 && <div className="form-text"><Link to="/profiles">Create profiles</Link> to add members.</div>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create team'}</button>
          </form>
        </div>
        <div className="col-lg-7">
          <h3 className="h5">Team directory</h3>
          {loading ? <p role="status">Loading teams...</p> : teams.length === 0 ? <p className="text-secondary">No teams have been created yet.</p> : (
            <ul className="list-group list-group-flush">
              {teams.map((team, index) => <li className="list-group-item px-0" key={team._id ?? team.id ?? `${team.name}-${index}`}>
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <div><h4 className="h6 mb-1">{team.name}</h4><p className="small text-secondary mb-1">{team.mascot || 'No mascot'}</p></div>
                  <span className="badge text-bg-light align-self-start">{team.members?.length ?? 0} members</span>
                </div>
                <p className="small mb-0">{memberNames(team.members, users).join(', ') || 'No members assigned'}</p>
              </li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
