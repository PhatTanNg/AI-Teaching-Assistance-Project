/**
 * Single source of truth for ALL Mongoose models used by the revision feature.
 *
 * IMPORTANT: Every service file must import models from HERE, not define its
 * own inline schemas. Mongoose only registers a model name once — whichever
 * file calls mongoose.model() first "wins", and subsequent calls with the
 * same name silently reuse the existing model (ignoring the new schema).
 * Defining models in a single file eliminates that race condition.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/* ===== RevisionSet ===== */
const revisionSetSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, trim: true },
    setType: { type: String, enum: ['flashcard', 'mcq'], required: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    totalCards: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'revision_sets' },
);

/* ===== RevisionSetTranscript ===== */
const revisionSetTranscriptSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    transcriptId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: false, collection: 'revision_set_transcripts' },
);
revisionSetTranscriptSchema.index({ setId: 1, transcriptId: 1 }, { unique: true });

/* ===== Flashcard ===== */
const flashcardSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    front: { type: String, required: true, trim: true },
    back: { type: String, required: true, trim: true },
    sourceRef: { type: String, default: '' },
    srsBox: { type: Number, default: 1, min: 1, max: 5 },
    nextReview: { type: Date, default: Date.now, index: true },
    easeFactor: { type: Number, default: 2.5 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'flashcards' },
);

/* ===== McqQuestion ===== */
const mcqQuestionSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    question: { type: String, required: true, trim: true },
    optionA: { type: String, required: true, trim: true },
    optionB: { type: String, required: true, trim: true },
    optionC: { type: String, required: true, trim: true },
    optionD: { type: String, required: true, trim: true },
    correct: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation: { type: String, required: true, trim: true },
    sourceRef: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'mcq_questions' },
);

/* ===== McqAttempt ===== */
const mcqAttemptSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, required: true, index: true },
    selected: { type: String, enum: ['A', 'B', 'C', 'D'] },
    isCorrect: { type: Boolean },
    timeTakenMs: { type: Number, default: 0 },
    attemptedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, collection: 'mcq_attempts' },
);

/* ===== StudentProgress ===== */
const studentProgressSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
    totalFlashcards: { type: Number, default: 0 },
    totalMcqsDone: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    currentStreakDays: { type: Number, default: 0 },
    xpPoints: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
  },
  { timestamps: true, collection: 'student_progress' },
);
studentProgressSchema.index({ updatedAt: -1 });

/* ===== Register models (each name exactly once) ===== */
export const RevisionSet =
  mongoose.models.RevisionSet || mongoose.model('RevisionSet', revisionSetSchema);

export const RevisionSetTranscript =
  mongoose.models.RevisionSetTranscript || mongoose.model('RevisionSetTranscript', revisionSetTranscriptSchema);

export const Flashcard =
  mongoose.models.Flashcard || mongoose.model('Flashcard', flashcardSchema);

export const McqQuestion =
  mongoose.models.RevisionMcqQuestion || mongoose.model('RevisionMcqQuestion', mcqQuestionSchema);

export const McqAttempt =
  mongoose.models.RevisionMcqAttempt || mongoose.model('RevisionMcqAttempt', mcqAttemptSchema);

export const StudentProgress =
  mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema);
