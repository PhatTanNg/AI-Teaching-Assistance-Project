import express from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createLecture,
  getLecturesBySubject,
  updateLecture,
  deleteLecture,
} from '../controllers/subjectLectureController.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// ==================== SUBJECT ROUTES ====================

// Create subject
router.post('/', createSubject);

// Get all subjects for authenticated user
router.get('/', getSubjects);

// Get subject by ID
router.get('/:subjectId', getSubjectById);

// Update subject
router.put('/:subjectId', updateSubject);

// Delete subject
router.delete('/:subjectId', deleteSubject);

// ==================== LECTURE ROUTES ====================

// Create lecture
router.post('/:subjectId/lectures', createLecture);

// Get lectures by subject
router.get('/:subjectId/lectures', getLecturesBySubject);

// Update lecture
router.put('/lectures/:lectureId', updateLecture);

// Delete lecture
router.delete('/lectures/:lectureId', deleteLecture);

export default router;
