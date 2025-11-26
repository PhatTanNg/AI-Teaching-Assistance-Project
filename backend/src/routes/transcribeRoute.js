import express from 'express';
import multer from 'multer';
import { transcribe } from '../controllers/transcribeController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', upload.single('audio'), transcribe);

export default router;
