import express from 'express';
import { chatStreamHandler } from '../controllers/chatController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/stream', protectedRoute, chatStreamHandler);

export default router;
