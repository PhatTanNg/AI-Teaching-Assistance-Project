import { getMcqsBySet, generateMcqSet, submitMcqAnswers } from '../services/mcqService.js';
import { updateProgressForMcqAttempts } from '../services/progressService.js';
import {
  validateIdParam,
  validateMcqGenerateInput,
  validateMcqSubmitInput,
} from '../validators/revisionValidator.js';

export const generateMcqs = async (req, res) => {
  try {
    const validation = validateMcqGenerateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const payload = await generateMcqSet({
      studentId: req.body.student_id,
      transcriptIds: req.body.transcript_ids,
      count: req.body.count,
      difficulty: req.body.difficulty,
    });

    return res.status(201).json(payload);
  } catch (error) {
    console.error('[REVISION][MCQ][GENERATE]', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || 'Failed to generate MCQs' });
  }
};

export const listMcqsBySet = async (req, res) => {
  try {
    const validation = validateIdParam(req.params.setId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const questions = await getMcqsBySet({ setId: req.params.setId });
    if (!questions) {
      return res.status(404).json({ message: 'MCQ set not found' });
    }

    return res.status(200).json({ questions });
  } catch (error) {
    console.error('[REVISION][MCQ][LIST]', error);
    return res.status(500).json({ message: 'Failed to get MCQs' });
  }
};

export const submitMcqs = async (req, res) => {
  try {
    const validation = validateMcqSubmitInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const result = await submitMcqAnswers({
      studentId: req.body.student_id,
      answers: req.body.answers,
    });

    await updateProgressForMcqAttempts({
      studentId: req.body.student_id,
      attempts: result.submitted.map((item) => ({ isCorrect: item.is_correct })),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[REVISION][MCQ][SUBMIT]', error);
    return res.status(500).json({ message: 'Failed to submit MCQ answers' });
  }
};
