import { Schema, model } from 'mongoose';

const workoutSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 1 },
  focus: { type: String, required: true, trim: true, minlength: 1 },
  minutes: { type: Number, required: true, min: 1 },
  difficulty: { type: String, required: true, trim: true, minlength: 1 },
});

export const Workout = model('Workout', workoutSchema);
