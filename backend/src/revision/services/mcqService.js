import mongoose from 'mongoose';
import Transcript from '../../models/Transcript.js';
import { buildMcqUserPrompt, mcqSystemPrompt } from '../prompts/mcqPrompt.js';

const { Schema } = mongoose;

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

const revisionSetTranscriptSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    transcriptId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: false, collection: 'revision_set_transcripts' },
);

revisionSetTranscriptSchema.index({ setId: 1, transcriptId: 1 }, { unique: true });

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

const RevisionSet = mongoose.models.RevisionSet || mongoose.model('RevisionSet', revisionSetSchema);
const RevisionSetTranscript =
  mongoose.models.RevisionSetTranscript || mongoose.model('RevisionSetTranscript', revisionSetTranscriptSchema);
const McqQuestion =
  mongoose.models.RevisionMcqQuestion || mongoose.model('RevisionMcqQuestion', mcqQuestionSchema);
const McqAttempt =
  mongoose.models.RevisionMcqAttempt || mongoose.model('RevisionMcqAttempt', mcqAttemptSchema);

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);

const hasKeywordOverlap = (content, transcriptText) => {
  const transcriptTokens = new Set(tokenize(transcriptText));
  const contentTokens = tokenize(content);
  return contentTokens.some((token) => transcriptTokens.has(token));
};

const validateMcqShape = (item) => {
  if (!item || typeof item !== 'object') return false;
  if (!item.question || !item.options || !item.explanation || !item.source_ref) return false;
  const options = item.options;
  if (!options.A || !options.B || !options.C || !options.D) return false;
  if (!['A', 'B', 'C', 'D'].includes(item.correct)) return false;
  return true;
};

const parseJsonContent = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const callOpenAiForMcqs = async ({ transcriptText, count, difficulty }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: mcqSystemPrompt },
        { role: 'user', content: buildMcqUserPrompt({ count, difficulty, transcriptText }) },
      ],
    }),
  });

  const payload = await response.json();
  console.log('[REVISION][MCQ][AI_RAW_RESPONSE]', JSON.stringify(payload));

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI request failed');
  }

  const content = payload?.choices?.[0]?.message?.content;
  return parseJsonContent(content);
};

const collectTranscriptText = async ({ studentId, transcriptIds }) => {
  const transcripts = await Transcript.find({
    _id: { $in: transcriptIds },
    userId: studentId,
  }).lean();

  if (transcripts.length === 0) {
    throw new Error('No matching transcripts found for student');
  }

  return transcripts
    .map((t, index) => `Transcript ${index + 1}: ${t.rawTranscript || ''}`)
    .join('\n\n');
};

const extractValidMcqs = ({ aiData, transcriptText }) => {
  const generated = Array.isArray(aiData?.questions) ? aiData.questions : [];

  return generated
    .filter((item) => validateMcqShape(item))
    .filter((item) =>
      hasKeywordOverlap(
        `${item.question} ${item.options.A} ${item.options.B} ${item.options.C} ${item.options.D} ${item.explanation} ${item.source_ref}`,
        transcriptText,
      ),
    );
};

export const generateMcqSet = async ({
  studentId,
  transcriptIds,
  count,
  difficulty,
}) => {
  const transcriptText = await collectTranscriptText({ studentId, transcriptIds });

  const firstPass = await callOpenAiForMcqs({ transcriptText, count, difficulty });
  let valid = extractValidMcqs({ aiData: firstPass, transcriptText });

  if (valid.length < count) {
    const retryData = await callOpenAiForMcqs({
      transcriptText,
      count: count - valid.length,
      difficulty,
    });
    const retryValid = extractValidMcqs({ aiData: retryData, transcriptText });
    valid = [...valid, ...retryValid];
  }

  if (valid.length === 0) {
    const error = new Error('Invalid MCQ schema from AI response');
    error.statusCode = 422;
    throw error;
  }

  const trimmed = valid.slice(0, count);
  if (trimmed.length < count) {
    const error = new Error('Unable to generate enough transcript-grounded MCQs');
    error.statusCode = 422;
    throw error;
  }

  const setDoc = await RevisionSet.create({
    studentId,
    title: `MCQs ${new Date().toISOString()}`,
    setType: 'mcq',
    difficulty,
    totalCards: trimmed.length,
  });

  await RevisionSetTranscript.insertMany(
    transcriptIds.map((transcriptId) => ({ setId: setDoc._id, transcriptId })),
    { ordered: false },
  ).catch(() => {});

  const created = await McqQuestion.insertMany(
    trimmed.map((item) => ({
      setId: setDoc._id,
      question: item.question,
      optionA: item.options.A,
      optionB: item.options.B,
      optionC: item.options.C,
      optionD: item.options.D,
      correct: item.correct,
      explanation: item.explanation,
      sourceRef: item.source_ref,
      difficulty,
    })),
  );

  return {
    set_id: String(setDoc._id),
    questions: created.map((question) => ({
      id: String(question._id),
      question: question.question,
      options: {
        A: question.optionA,
        B: question.optionB,
        C: question.optionC,
        D: question.optionD,
      },
      correct: question.correct,
      explanation: question.explanation,
      source_ref: question.sourceRef,
    })),
  };
};

export const getMcqsBySet = async ({ setId }) => {
  const setDoc = await RevisionSet.findById(setId).lean();
  if (!setDoc || setDoc.setType !== 'mcq') return null;

  const questions = await McqQuestion.find({ setId }).sort({ createdAt: 1 }).lean();

  return questions.map((question) => ({
    id: String(question._id),
    set_id: String(question.setId),
    question: question.question,
    options: {
      A: question.optionA,
      B: question.optionB,
      C: question.optionC,
      D: question.optionD,
    },
    correct: question.correct,
    explanation: question.explanation,
    source_ref: question.sourceRef,
    difficulty: question.difficulty,
    created_at: question.createdAt,
  }));
};

export const submitMcqAnswers = async ({ studentId, answers }) => {
  const questionIds = answers.map((a) => a.question_id);
  const questions = await McqQuestion.find({ _id: { $in: questionIds } }).lean();
  const questionMap = new Map(questions.map((q) => [String(q._id), q]));

  const attempts = answers
    .map((answer) => {
      const question = questionMap.get(String(answer.question_id));
      if (!question) return null;
      const isCorrect = question.correct === answer.selected;
      return {
        studentId,
        questionId: answer.question_id,
        selected: answer.selected,
        isCorrect,
        timeTakenMs: answer.time_taken_ms || 0,
      };
    })
    .filter(Boolean);

  if (attempts.length === 0) {
    return {
      submitted: [],
      score: { correct: 0, total: 0 },
    };
  }

  const createdAttempts = await McqAttempt.insertMany(attempts);

  const submitted = createdAttempts.map((attempt) => {
    const question = questionMap.get(String(attempt.questionId));
    return {
      question_id: String(attempt.questionId),
      selected: attempt.selected,
      is_correct: attempt.isCorrect,
      correct: question.correct,
      explanation: question.explanation,
      source_ref: question.sourceRef,
    };
  });

  return {
    submitted,
    score: {
      correct: submitted.filter((item) => item.is_correct).length,
      total: submitted.length,
    },
  };
};
