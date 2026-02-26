import express from 'express';
import { protectedRoute } from '../../middlewares/authMiddleware.js';
import {
  generateFlashcards,
  listFlashcardsBySet,
  rateFlashcard,
} from '../controllers/flashcardController.js';
import { generateMcqs, listMcqsBySet, submitMcqs } from '../controllers/mcqController.js';
import {
  getProgress,
  getSetMetadata,
  getWeakTopicsForStudent,
  listSets,
} from '../controllers/progressController.js';
import { generateAnkiCsv, generateSetPdf } from '../services/exportService.js';
import { validateIdParam } from '../validators/revisionValidator.js';

const router = express.Router();

router.use(protectedRoute);

router.post('/flashcards/generate', generateFlashcards);
router.post('/mcq/generate', generateMcqs);

router.get('/sets', listSets);
router.get('/sets/:setId', getSetMetadata);
router.get('/flashcards/:setId', listFlashcardsBySet);
router.get('/mcq/:setId', listMcqsBySet);

router.post('/mcq/submit', submitMcqs);
router.post('/flashcard/rate', rateFlashcard);

router.get('/progress/:studentId', getProgress);
router.get('/weak-topics/:studentId', getWeakTopicsForStudent);

router.get('/export/pdf/:setId', async (req, res) => {
  try {
    const validation = validateIdParam(req.params.setId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const payload = await generateSetPdf({ setId: req.params.setId });
    if (!payload) {
      return res.status(404).json({ message: 'Revision set not found' });
    }

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.status(200).send(payload.body);
  } catch (error) {
    console.error('[REVISION][EXPORT][PDF]', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || 'Failed to export PDF' });
  }
});

router.get('/export/anki/:setId', async (req, res) => {
  try {
    const validation = validateIdParam(req.params.setId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const payload = await generateAnkiCsv({ setId: req.params.setId });
    if (!payload) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.status(200).send(payload.body);
  } catch (error) {
    console.error('[REVISION][EXPORT][ANKI]', error);
    return res.status(500).json({ message: 'Failed to export Anki CSV' });
  }
});

export default router;
