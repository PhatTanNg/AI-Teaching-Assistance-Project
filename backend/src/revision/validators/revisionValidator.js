import mongoose from 'mongoose';

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];
const ALLOWED_COUNTS = [5, 10, 20];

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const baseGenerateValidation = (payload, { enforceCountPreset = false } = {}) => {
  const errors = [];
  const { student_id, transcript_ids, count, difficulty } = payload || {};

  if (!student_id || !isValidObjectId(student_id)) {
    errors.push('student_id must be a valid id');
  }

  if (!Array.isArray(transcript_ids) || transcript_ids.length === 0) {
    errors.push('transcript_ids must be a non-empty array');
  } else if (transcript_ids.some((id) => !isValidObjectId(id))) {
    errors.push('all transcript_ids must be valid ids');
  }

  if (!Number.isInteger(count) || count <= 0) {
    errors.push('count must be a positive integer');
  }

  if (enforceCountPreset && !ALLOWED_COUNTS.includes(count)) {
    errors.push('count must be one of 5, 10, 20');
  }

  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    errors.push('difficulty must be easy, medium, or hard');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateFlashcardGenerateInput = (payload) =>
  baseGenerateValidation(payload, { enforceCountPreset: false });

export const validateMcqGenerateInput = (payload) =>
  baseGenerateValidation(payload, { enforceCountPreset: true });

export const validateFlashcardRateInput = (payload) => {
  const errors = [];
  const { flashcard_id, student_id, rating } = payload || {};

  if (!flashcard_id || !isValidObjectId(flashcard_id)) {
    errors.push('flashcard_id must be a valid id');
  }

  if (!student_id || !isValidObjectId(student_id)) {
    errors.push('student_id must be a valid id');
  }

  if (![1, 2, 3, 4].includes(rating)) {
    errors.push('rating must be one of 1, 2, 3, 4');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateMcqSubmitInput = (payload) => {
  const errors = [];
  const { student_id, answers } = payload || {};

  if (!student_id || !isValidObjectId(student_id)) {
    errors.push('student_id must be a valid id');
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    errors.push('answers must be a non-empty array');
  } else {
    for (const answer of answers) {
      if (!answer.question_id || !isValidObjectId(answer.question_id)) {
        errors.push('each answer.question_id must be a valid id');
        break;
      }
      if (!['A', 'B', 'C', 'D'].includes(answer.selected)) {
        errors.push('each answer.selected must be one of A, B, C, D');
        break;
      }
      if (answer.time_taken_ms !== undefined && (!Number.isInteger(answer.time_taken_ms) || answer.time_taken_ms < 0)) {
        errors.push('answer.time_taken_ms must be a non-negative integer when provided');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateIdParam = (id) => {
  if (!id || !isValidObjectId(id)) {
    return { valid: false, errors: ['invalid id parameter'] };
  }

  return { valid: true, errors: [] };
};
