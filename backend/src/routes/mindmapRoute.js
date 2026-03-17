import { Router } from 'express';
import {
  generate,
  list,
  getOne,
  rename,
  remove,
  regenerate,
  overwrite,
} from '../controllers/mindmapController.js';

const router = Router();

router.post('/generate', generate);
router.get('/', list);
router.get('/:id', getOne);
router.put('/:id/overwrite', overwrite);
router.put('/:id', rename);
router.delete('/:id', remove);
router.post('/:id/regenerate', regenerate);

export default router;
