import mongoose from 'mongoose';

const { Schema } = mongoose;

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

const StudySession = mongoose.models.StudySession;

const StudentProgress =
  mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema);
const RevisionSet = mongoose.models.RevisionSet || mongoose.model('RevisionSet', revisionSetSchema);
const McqQuestion = mongoose.models.RevisionMcqQuestion || mongoose.model('RevisionMcqQuestion', mcqQuestionSchema);
const McqAttempt = mongoose.models.RevisionMcqAttempt || mongoose.model('RevisionMcqAttempt', mcqAttemptSchema);

const startOfUtcDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const dayDiff = (fromDate, toDate) => {
  const from = startOfUtcDay(fromDate).getTime();
  const to = startOfUtcDay(toDate).getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
};

const applyDailyStreakAndBonus = (progressDoc, now) => {
  let dailyBonus = 0;

  if (!progressDoc.lastActiveDate) {
    progressDoc.currentStreakDays = 1;
    dailyBonus = 50;
  } else {
    const diff = dayDiff(progressDoc.lastActiveDate, now);
    if (diff === 0) {
      dailyBonus = 0;
    } else if (diff === 1) {
      progressDoc.currentStreakDays += 1;
      dailyBonus = 50;
    } else {
      progressDoc.currentStreakDays = 1;
      dailyBonus = 50;
    }
  }

  if (dayDiff(progressDoc.lastActiveDate || now, now) >= 0) {
    progressDoc.lastActiveDate = startOfUtcDay(now);
  }

  return dailyBonus;
};

const ensureProgress = async (studentId) => {
  let progress = await StudentProgress.findOne({ studentId });
  if (!progress) {
    progress = await StudentProgress.create({
      studentId,
      totalFlashcards: 0,
      totalMcqsDone: 0,
      totalCorrect: 0,
      currentStreakDays: 0,
      xpPoints: 0,
    });
  }
  return progress;
};

export const updateProgressForFlashcardReview = async ({ studentId }) => {
  const now = new Date();
  const progress = await ensureProgress(studentId);

  const dailyBonus = applyDailyStreakAndBonus(progress, now);
  progress.totalFlashcards += 1;
  progress.xpPoints += 5 + dailyBonus;

  await progress.save();
  return progress;
};

export const updateProgressForMcqAttempts = async ({ studentId, attempts }) => {
  const now = new Date();
  const progress = await ensureProgress(studentId);

  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const dailyBonus = applyDailyStreakAndBonus(progress, now);

  progress.totalMcqsDone += attempts.length;
  progress.totalCorrect += correctCount;
  progress.xpPoints += correctCount * 10 + dailyBonus;

  await progress.save();
  return progress;
};

const buildBadges = ({ totalFlashcards, totalMcqsDone, currentStreakDays, accuracy }) => {
  const badges = [];

  if (totalFlashcards >= 1) badges.push('First Flashcard');
  if (currentStreakDays >= 10) badges.push('10-Day Streak');
  if (totalMcqsDone >= 100) badges.push('100 MCQs');
  if (totalMcqsDone > 0 && accuracy === 100) badges.push('Perfect Score');

  return badges;
};

export const getProgressDashboard = async ({ studentId }) => {
  const progress = await ensureProgress(studentId);
  const transcriptsStudied = StudySession
    ? await StudySession.countDocuments({ userId: studentId })
    : 0;

  const accuracy =
    progress.totalMcqsDone > 0
      ? Math.round((progress.totalCorrect / progress.totalMcqsDone) * 100)
      : 0;

  return {
    student_id: String(studentId),
    transcripts_studied: transcriptsStudied,
    total_flashcards: progress.totalFlashcards,
    total_mcqs_done: progress.totalMcqsDone,
    total_correct: progress.totalCorrect,
    accuracy,
    current_streak_days: progress.currentStreakDays,
    xp_points: progress.xpPoints,
    last_active_date: progress.lastActiveDate,
    badges: buildBadges({
      totalFlashcards: progress.totalFlashcards,
      totalMcqsDone: progress.totalMcqsDone,
      currentStreakDays: progress.currentStreakDays,
      accuracy,
    }),
  };
};

export const getWeakTopics = async ({ studentId }) => {
  const attempts = await McqAttempt.find({ studentId }).lean();
  if (attempts.length === 0) {
    return [];
  }

  const questionIds = attempts.map((a) => a.questionId);
  const questions = await McqQuestion.find({ _id: { $in: questionIds } }).lean();
  const questionMap = new Map(questions.map((q) => [String(q._id), q]));

  const grouped = new Map();

  for (const attempt of attempts) {
    const question = questionMap.get(String(attempt.questionId));
    const sourceRef = question?.sourceRef || 'General Topic';
    const topic = sourceRef.split(',')[0].trim() || 'General Topic';

    if (!grouped.has(topic)) {
      grouped.set(topic, { topic, total: 0, correct: 0 });
    }

    const row = grouped.get(topic);
    row.total += 1;
    if (attempt.isCorrect) row.correct += 1;
  }

  return Array.from(grouped.values())
    .map((row) => ({
      topic: row.topic,
      total: row.total,
      correct: row.correct,
      accuracy: Math.round((row.correct / row.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);
};

export const listRevisionSets = async ({ studentId }) => {
  const sets = await RevisionSet.find({ studentId }).sort({ createdAt: -1 }).lean();
  return sets.map((setDoc) => ({
    id: String(setDoc._id),
    title: setDoc.title,
    set_type: setDoc.setType,
    difficulty: setDoc.difficulty,
    total_cards: setDoc.totalCards,
    created_at: setDoc.createdAt,
    updated_at: setDoc.updatedAt,
  }));
};

export const getSetById = async ({ setId }) => {
  const setDoc = await RevisionSet.findById(setId).lean();
  if (!setDoc) return null;

  return {
    id: String(setDoc._id),
    student_id: String(setDoc.studentId),
    title: setDoc.title,
    set_type: setDoc.setType,
    difficulty: setDoc.difficulty,
    total_cards: setDoc.totalCards,
    created_at: setDoc.createdAt,
    updated_at: setDoc.updatedAt,
  };
};
