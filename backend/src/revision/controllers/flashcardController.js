import {
  generateFlashcardSet,
  getFlashcardById,
  getFlashcardsBySet,
  saveFlashcardUpdate,
} from '../services/flashcardService.js';
import { updateProgressForFlashcardReview } from '../services/progressService.js';
import { computeSrsUpdate } from '../services/srsService.js';
import {
  validateFlashcardGenerateInput,
  validateFlashcardRateInput,
  validateIdParam,
} from '../validators/revisionValidator.js';

export const generateFlashcards = async (req, res) => {
  try {
    const validation = validateFlashcardGenerateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const payload = await generateFlashcardSet({
      studentId: req.body.student_id,
      transcriptIds: req.body.transcript_ids,
      count: req.body.count,
      difficulty: req.body.difficulty,
    });

    return res.status(201).json(payload);
  } catch (error) {
    console.error('[REVISION][FLASHCARD][GENERATE]', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || 'Failed to generate flashcards' });
  }
};

export const listFlashcardsBySet = async (req, res) => {
  try {
    const validation = validateIdParam(req.params.setId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const cards = await getFlashcardsBySet({ setId: req.params.setId });
    if (!cards) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    return res.status(200).json({ flashcards: cards });
  } catch (error) {
    console.error('[REVISION][FLASHCARD][LIST]', error);
    return res.status(500).json({ message: 'Failed to get flashcards' });
  }
};

export const rateFlashcard = async (req, res) => {
  try {
    const validation = validateFlashcardRateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const flashcard = await getFlashcardById(req.body.flashcard_id);
    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    const srs = computeSrsUpdate({
      currentBox: flashcard.srsBox,
      rating: req.body.rating,
    });

    flashcard.srsBox = srs.srsBox;
    flashcard.nextReview = srs.nextReview;
    await saveFlashcardUpdate(flashcard);

    await updateProgressForFlashcardReview({ studentId: req.body.student_id });

    return res.status(200).json({
      next_review: srs.nextReview,
      srs_box: srs.srsBox,
    });
  } catch (error) {
    console.error('[REVISION][FLASHCARD][RATE]', error);
    return res.status(500).json({ message: 'Failed to rate flashcard' });
  }
};
