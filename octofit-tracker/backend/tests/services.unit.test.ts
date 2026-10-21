import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Activity, Team, User, Workout } from '../src/models/index.js';
import { createActivity, createTeam, createUser, getLeaderboard, suggestWorkouts } from '../src/services/octofitService.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

describe('OctoFit service behavior', () => {
  it('normalizes and validates student and teacher profiles', async () => {
    const student = await createUser({ name: ' Mona ', email: 'MONA@example.com', role: 'student' });
    const teacher = await createUser({ name: 'Coach ', email: 'coach@example.com', role: 'teacher' });

    expect(student).toMatchObject({ name: 'Mona', email: 'mona@example.com', role: 'student', fitnessGoal: 'general' });
    expect(teacher).toMatchObject({ name: 'Coach', role: 'teacher' });
    await expect(createUser({ name: 'Invalid', email: 'invalid@example.com', role: 'admin' })).rejects.toMatchObject({ status: 400 });
    await expect(createUser({ name: 'Duplicate', email: 'mona@example.com', role: 'student' })).rejects.toMatchObject({ status: 409 });
  });

  it('records validated activities with points and timestamps', async () => {
    const user = await createUser({ name: 'Mona', email: 'mona@example.com', role: 'student' });
    const team = await createTeam({ name: 'Octocats', mascot: 'Mona', members: [user._id.toString()] });
    const activity = await createActivity({ userId: user._id.toString(), teamId: team._id.toString(), type: 'run', minutes: 30 });

    expect(activity).toMatchObject({ user: user._id, team: team._id, type: 'run', minutes: 30, points: 30 });
    expect(activity.occurredAt).toBeInstanceOf(Date);
    await expect(createActivity({ userId: 'invalid', teamId: team._id.toString(), type: 'run', minutes: 30 })).rejects.toMatchObject({ status: 400 });
    await expect(createActivity({ userId: user._id.toString(), teamId: team._id.toString(), type: 'run', minutes: 0 })).rejects.toMatchObject({ status: 400 });
  });

  it('assigns each selected member to the newly created team', async () => {
    const user = await createUser({ name: 'Mona', email: 'mona@example.com', role: 'student' });
    const firstTeam = await createTeam({ name: 'First', mascot: 'A', members: [user._id.toString()] });
    const secondTeam = await createTeam({ name: 'Second', mascot: 'B', members: [user._id.toString()] });

    expect((await Team.findById(firstTeam._id).lean())?.members).toHaveLength(0);
    expect((await Team.findById(secondTeam._id).lean())?.members.map(String)).toContain(user._id.toString());
    expect((await User.findById(user._id).lean())?.team?.toString()).toBe(secondTeam._id.toString());
  });

  it('ranks teams by total activity points with one-based positions', async () => {
    const firstUser = await createUser({ name: 'Mona', email: 'mona@example.com', role: 'student' });
    const secondUser = await createUser({ name: 'Hubot', email: 'hubot@example.com', role: 'student' });
    const firstTeam = await createTeam({ name: 'Octocats', mascot: 'Mona', members: [firstUser._id.toString()] });
    const secondTeam = await createTeam({ name: 'Robocats', mascot: 'Hubot', members: [secondUser._id.toString()] });
    await Promise.all([
      createActivity({ userId: firstUser._id.toString(), teamId: firstTeam._id.toString(), type: 'run', minutes: 25 }),
      createActivity({ userId: secondUser._id.toString(), teamId: secondTeam._id.toString(), type: 'cycle', minutes: 35 }),
    ]);

    await expect(getLeaderboard()).resolves.toEqual([
      { teamName: 'Robocats', totalPoints: 35, rank: 1 },
      { teamName: 'Octocats', totalPoints: 25, rank: 2 },
    ]);
  });

  it('prioritizes workouts that support a profile goal and rejects unknown profiles', async () => {
    const user = await createUser({ name: 'Mona', email: 'mona@example.com', role: 'student', fitnessGoal: 'endurance' });
    await Workout.create([
      { title: 'Strength Circuit', focus: 'strength', minutes: 25, difficulty: 'moderate' },
      { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' },
    ]);

    const suggestions = await suggestWorkouts(user.email);
    expect(suggestions[0]).toMatchObject({ title: 'Intervals', focus: 'endurance' });
    expect(suggestions[0]?.reason).toMatch(/goal/i);
    await expect(suggestWorkouts('unknown@example.com')).rejects.toMatchObject({ status: 404 });
  });
});