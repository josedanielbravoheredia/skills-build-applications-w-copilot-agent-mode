import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

type Input = Record<string, unknown>;

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function asInput(value: unknown): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw httpError(400, 'Request body must be an object');
  }
  return value as Input;
}

function validObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isObjectIdOrHexString(value);
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, `${field} is required`);
  }
  return value.trim();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(value: unknown) {
  const input = asInput(value);
  const userId = input.userId;
  const teamId = input.teamId;
  const type = requiredText(input.type, 'type');
  const minutes = input.minutes;
  if (!validObjectId(userId) || !validObjectId(teamId)) {
    throw httpError(400, 'userId and teamId must be valid IDs');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw httpError(400, 'minutes must be a positive number');
  }
  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw httpError(404, 'User or team not found');
  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: Math.round(minutes),
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(value: unknown) {
  const input = asInput(value);
  const name = requiredText(input.name, 'name');
  const mascot = requiredText(input.mascot, 'mascot');
  const members = input.members ?? [];
  if (!Array.isArray(members) || members.some((member) => !validObjectId(member))) {
    throw httpError(400, 'members must be an array of valid user IDs');
  }
  const memberIds = [...new Set(members as string[])];
  const users = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
  if (users.length !== memberIds.length) throw httpError(404, 'One or more users were not found');

  const team = await Team.create({ name, mascot, members: memberIds });
  if (memberIds.length) {
    await Team.updateMany({ _id: { $ne: team._id }, members: { $in: memberIds } }, { $pull: { members: { $in: memberIds } } });
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function listUsers() {
  return User.find().sort({ name: 1 }).lean();
}

export async function createUser(value: unknown) {
  const input = asInput(value);
  const name = requiredText(input.name, 'name');
  const email = requiredText(input.email, 'email').toLowerCase();
  const role = input.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'email must be valid');
  if (role !== 'student' && role !== 'teacher') throw httpError(400, 'role must be student or teacher');
  const fitnessGoal = typeof input.fitnessGoal === 'string' && input.fitnessGoal.trim() ? input.fitnessGoal.trim() : 'general';
  const teamValue = input.teamId ?? input.team;
  let teamId: string | undefined;
  if (teamValue !== undefined && teamValue !== null && teamValue !== '') {
    if (!validObjectId(teamValue)) throw httpError(400, 'team must be a valid ID');
    if (!await Team.exists({ _id: teamValue })) throw httpError(404, 'Team not found');
    teamId = teamValue;
  }
  if (await User.exists({ email })) throw httpError(409, 'A user with this email already exists');
  const user = await User.create({ name, email, role, fitnessGoal, ...(teamId ? { team: teamId } : {}) });
  if (teamId) await Team.updateOne({ _id: teamId }, { $addToSet: { members: user._id } });
  return user;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = decodeURIComponent(userEmail).trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw httpError(404, 'User not found');
  const [recentActivity, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean(),
    Workout.find().sort({ title: 1 }).lean(),
  ]);
  if (!workouts.length) return [];

  const goal = user.fitnessGoal?.trim().toLowerCase();
  const recentType = recentActivity[0]?.type.toLowerCase();
  const activityFocus: Record<string, string> = { run: 'endurance', cycle: 'endurance', walk: 'endurance' };
  const recentFocus = recentType ? activityFocus[recentType] ?? recentType : undefined;
  const preferredFocus = goal && workouts.some((workout) => workout.focus.toLowerCase() === goal)
    ? goal
    : recentFocus && workouts.some((workout) => workout.focus.toLowerCase() === recentFocus)
      ? recentFocus
      : undefined;
  const ordered = [...workouts].sort((left, right) => {
    if (!preferredFocus) return 0;
    return Number(right.focus.toLowerCase() === preferredFocus) - Number(left.focus.toLowerCase() === preferredFocus);
  });
  return ordered.map((workout, index) => ({
    ...workout,
    reason: workout.focus.toLowerCase() === goal
      ? `This workout supports your ${user.fitnessGoal} goal.`
      : workout.focus.toLowerCase() === recentFocus
        ? `This workout complements your recent ${recentType} activity.`
        : index === 0
          ? 'This workout is a balanced option for your fitness routine.'
          : `This workout focuses on ${workout.focus}.`,
  }));
}
