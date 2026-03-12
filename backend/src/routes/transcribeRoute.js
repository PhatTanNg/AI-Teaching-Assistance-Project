import express from 'express';
import multer from 'multer';
import { transcribe, transcribeWithWhisper, correctTranscriptHandler } from '../controllers/transcribeController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/', upload.single('audio'), transcribe);
router.post('/upload', upload.single('audio'), transcribeWithWhisper);
router.post('/correct', correctTranscriptHandler);

export default router;
