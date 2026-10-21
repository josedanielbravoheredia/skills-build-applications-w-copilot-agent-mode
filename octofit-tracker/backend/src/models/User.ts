import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 1 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  role: { type: String, enum: ['student', 'teacher'], default: 'student', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  fitnessGoal: {
    type: String,
    required: true,
    trim: true,
    default(this: { name?: string } | null) { return this?.name ? 'general' : undefined; },
  },
});

export const User = model('User', userSchema);
