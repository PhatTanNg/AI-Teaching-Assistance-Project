import mongoose from 'mongoose';
import Transcript from '../../models/Transcript.js';
import { buildFlashcardUserPrompt, flashcardSystemPrompt } from '../prompts/flashcardPrompt.js';

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

const RevisionSet = mongoose.models.RevisionSet || mongoose.model('RevisionSet', revisionSetSchema);
const RevisionSetTranscript =
  mongoose.models.RevisionSetTranscript || mongoose.model('RevisionSetTranscript', revisionSetTranscriptSchema);
const Flashcard = mongoose.models.Flashcard || mongoose.model('Flashcard', flashcardSchema);

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

const validateFlashcardShape = (item) => {
  if (!item || typeof item !== 'object') return false;
  if (!item.front || !item.back || !item.source_ref) return false;
  return true;
};

const parseJsonContent = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const callOpenAiForFlashcards = async ({ transcriptText, count, difficulty }) => {
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
        { role: 'system', content: flashcardSystemPrompt },
        {
          role: 'user',
          content: buildFlashcardUserPrompt({ count, difficulty, transcriptText }),
        },
      ],
    }),
  });

  const payload = await response.json();
  console.log('[REVISION][FLASHCARD][AI_RAW_RESPONSE]', JSON.stringify(payload));

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI request failed');
  }

  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonContent(content);
  return parsed;
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

const extractValidFlashcards = ({ aiData, transcriptText }) => {
  const generated = Array.isArray(aiData?.flashcards) ? aiData.flashcards : [];

  return generated
    .filter((item) => validateFlashcardShape(item))
    .filter((item) =>
      hasKeywordOverlap(`${item.front} ${item.back} ${item.source_ref}`, transcriptText),
    );
};

export const generateFlashcardSet = async ({
  studentId,
  transcriptIds,
  count,
  difficulty,
}) => {
  const transcriptText = await collectTranscriptText({ studentId, transcriptIds });

  const firstPass = await callOpenAiForFlashcards({ transcriptText, count, difficulty });
  let valid = extractValidFlashcards({ aiData: firstPass, transcriptText });

  if (valid.length < count) {
    const retryData = await callOpenAiForFlashcards({
      transcriptText,
      count: count - valid.length,
      difficulty,
    });
    const retryValid = extractValidFlashcards({ aiData: retryData, transcriptText });
    valid = [...valid, ...retryValid];
  }

  if (valid.length === 0) {
    const error = new Error('Invalid flashcard schema from AI response');
    error.statusCode = 422;
    throw error;
  }

  const trimmed = valid.slice(0, count);
  if (trimmed.length < count) {
    const error = new Error('Unable to generate enough transcript-grounded flashcards');
    error.statusCode = 422;
    throw error;
  }

  const setDoc = await RevisionSet.create({
    studentId,
    title: `Flashcards ${new Date().toISOString()}`,
    setType: 'flashcard',
    difficulty,
    totalCards: trimmed.length,
  });

  await RevisionSetTranscript.insertMany(
    transcriptIds.map((transcriptId) => ({ setId: setDoc._id, transcriptId })),
    { ordered: false },
  ).catch(() => {});

  const created = await Flashcard.insertMany(
    trimmed.map((card) => ({
      setId: setDoc._id,
      front: card.front,
      back: card.back,
      sourceRef: card.source_ref,
    })),
  );

  return {
    set_id: String(setDoc._id),
    flashcards: created.map((card) => ({
      id: String(card._id),
      front: card.front,
      back: card.back,
      source_ref: card.sourceRef,
      srs_box: card.srsBox,
      next_review: card.nextReview,
    })),
  };
};

export const getFlashcardsBySet = async ({ setId }) => {
  const setDoc = await RevisionSet.findById(setId).lean();
  if (!setDoc || setDoc.setType !== 'flashcard') return null;

  const flashcards = await Flashcard.find({ setId }).sort({ createdAt: 1 }).lean();

  return flashcards.map((card) => ({
    id: String(card._id),
    set_id: String(card.setId),
    front: card.front,
    back: card.back,
    source_ref: card.sourceRef,
    srs_box: card.srsBox,
    next_review: card.nextReview,
    ease_factor: card.easeFactor,
    created_at: card.createdAt,
  }));
};

export const getFlashcardById = async (flashcardId) => Flashcard.findById(flashcardId);

export const saveFlashcardUpdate = async (flashcardDoc) => flashcardDoc.save();
