import { FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';

type User = { _id?: string; id?: string; name: string; email: string; role: 'student' | 'teacher'; fitnessGoal?: string };

export default function Profiles() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<User['role']>('student');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ users: User[] }>('/api/users').then((result) => {
      if (active) setUsers(result.users ?? []);
    }).catch((reason: unknown) => {
      if (active) setLoadError(`Profiles could not be loaded: ${reason instanceof Error ? reason.message : 'Unknown error'}`);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSubmitError('');
    setSuccess('');
    try {
      const result = await postJson<{ user: User }>('/api/users', {
        name: name.trim(),
        email: email.trim(),
        role,
        fitnessGoal: fitnessGoal.trim(),
      });
      setUsers((current) => [...current, result.user]);
      setSuccess('Profile created successfully.');
      setName('');
      setEmail('');
      setFitnessGoal('');
      setRole('student');
    } catch (error) {
      setSubmitError(`Profile could not be created: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="profiles-heading">
      <div className="mb-4">
        <p className="text-uppercase small fw-semibold text-primary mb-1">People</p>
        <h2 id="profiles-heading" className="h3">Profiles</h2>
        <p className="text-secondary mb-0">Manage student and physical education teacher profiles.</p>
      </div>
      {loadError && <p className="alert alert-danger" role="alert">{loadError}</p>}
      {submitError && <p className="alert alert-danger" role="alert">{submitError}</p>}
      {success && <p className="alert alert-success" role="status">{success}</p>}
      <div className="row g-4 align-items-start">
        <div className="col-lg-5">
          <form className="border rounded p-3" onSubmit={createProfile}>
            <h3 className="h5 mb-3">Create profile</h3>
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-name">Name</label>
              <input className="form-control" id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-email">Email</label>
              <input className="form-control" id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-role">Role</label>
              <select className="form-select" id="profile-role" value={role} onChange={(event) => setRole(event.target.value as User['role'])}>
                <option value="student">Student</option>
                <option value="teacher">Physical education teacher</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="profile-goal">Fitness goal</label>
              <input className="form-control" id="profile-goal" value={fitnessGoal} onChange={(event) => setFitnessGoal(event.target.value)} maxLength={200} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create profile'}</button>
          </form>
        </div>
        <div className="col-lg-7">
          <h3 className="h5">Profile directory</h3>
          {loading ? <p role="status">Loading profiles...</p> : users.length === 0 ? <p className="text-secondary">No profiles have been created yet.</p> : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <caption className="visually-hidden">Students and teachers with their fitness goals</caption>
                <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Fitness goal</th></tr></thead>
                <tbody>{users.map((user, index) => <tr key={user._id ?? user.id ?? user.email ?? index}>
                  <th scope="row">{user.name}</th><td>{user.email}</td><td className="text-capitalize">{user.role}</td><td>{user.fitnessGoal || 'Not set'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}