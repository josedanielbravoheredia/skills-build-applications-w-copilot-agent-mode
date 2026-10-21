import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.js';

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('OctoFit feature interactions', () => {
  it('creates a teacher profile with the selected role', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/api/users') && init?.method === 'POST') {
        return new Response(JSON.stringify({ user: { _id: 'teacher-1', name: 'Coach Lee', email: 'lee@example.com', role: 'teacher', fitnessGoal: 'general' } }), { status: 201 });
      }
      return new Response(JSON.stringify({ users: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/profiles');
    await user.type(screen.getByLabelText('Name'), 'Coach Lee');
    await user.type(screen.getByLabelText('Email'), 'lee@example.com');
    await user.selectOptions(screen.getByLabelText('Role'), 'teacher');
    await user.click(screen.getByRole('button', { name: /create profile/i }));

    expect(await screen.findByText('Coach Lee')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/created successfully/i);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/users', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Coach Lee', email: 'lee@example.com', role: 'teacher', fitnessGoal: '' }),
    }));
  });

  it('submits the selected profile, team, activity, and duration', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities' && init?.method === 'POST') {
        return new Response(JSON.stringify({ activity: { type: 'run', minutes: 45, points: 45 } }), { status: 201 });
      }
      if (url === '/api/activities') return new Response(JSON.stringify({ activities: [] }), { status: 200 });
      if (url === '/api/users') return new Response(JSON.stringify({ users: [{ _id: 'user-1', name: 'Mona', email: 'mona@example.com' }] }), { status: 200 });
      if (url === '/api/teams') return new Response(JSON.stringify({ teams: [{ _id: 'team-1', name: 'Octocats' }] }), { status: 200 });
      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRoute('/activities');
    await user.selectOptions(await screen.findByLabelText('Student'), 'user-1');
    await user.selectOptions(screen.getByLabelText('Team'), 'team-1');
    await user.clear(screen.getByLabelText('Activity type'));
    await user.type(screen.getByLabelText('Activity type'), 'run');
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '45');
    await user.click(screen.getByRole('button', { name: /record activity/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/activities', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', teamId: 'team-1', type: 'run', minutes: 45 }),
    })));
    expect(await screen.findByRole('status')).toHaveTextContent(/recorded successfully/i);
  });
});