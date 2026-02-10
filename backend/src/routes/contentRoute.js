import express from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import {
  createTranscript,
  getTranscripts,
  getTranscriptById,
  updateTranscriptText,
  deleteTranscript,
  createKeywordGroup,
  getKeywordGroupsByTranscript,
  addKeywordToGroup,
  updateKeywordDefinition,
  removeKeywordFromGroup,
  createSummary,
  getSummariesBySubject,
  getSummaryByTranscript,
  updateSummaryText,
  deleteSummary,
  createKeywords,
  getKeywordsBySession,
} from '../controllers/contentController.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// ==================== TRANSCRIPT ROUTES ====================

// Create transcript
router.post('/transcripts', createTranscript);

// Get transcripts (optionally filtered by lectureId)
router.get('/transcripts', getTranscripts);

// Get transcript by ID
router.get('/transcripts/:transcriptId', getTranscriptById);

// Update transcript text
router.put('/transcripts/:transcriptId', updateTranscriptText);

// Delete transcript
router.delete('/transcripts/:transcriptId', deleteTranscript);

// ==================== KEYWORD GROUP ROUTES ====================

// Create keyword group
router.post('/keyword-groups', createKeywordGroup);

// Get keyword groups by transcript
router.get('/transcripts/:transcriptId/keyword-groups', getKeywordGroupsByTranscript);

// Add keyword to group
router.post('/keyword-groups/:keywordGroupId/keywords', addKeywordToGroup);

// Update keyword definition
router.put('/keywords/:keywordId', updateKeywordDefinition);

// Remove keyword from group
router.delete('/keyword-groups/:keywordGroupId/keywords/:keywordId', removeKeywordFromGroup);

// ==================== SUMMARY ROUTES ====================

// Create summary
router.post('/summaries', createSummary);

// Get summaries by subject
router.get('/subjects/:subjectId/summaries', getSummariesBySubject);

// Get summary by transcript
router.get('/transcripts/:transcriptId/summary', getSummaryByTranscript);

// Update summary text
router.put('/summaries/:summaryId', updateSummaryText);

// Delete summary
router.delete('/summaries/:summaryId', deleteSummary);

// ------------------- KEYWORD LIST (by session) -------------------
router.post('/keywords', createKeywords);
router.get('/keywords', getKeywordsBySession);

export default router;
