import {
  getProgressDashboard,
  getSetById,
  getWeakTopics,
  listRevisionSets,
} from '../services/progressService.js';
import { validateIdParam } from '../validators/revisionValidator.js';

export const listSets = async (req, res) => {
  try {
    const studentId = req.query.student_id;
    const validation = validateIdParam(studentId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const sets = await listRevisionSets({ studentId });
    return res.status(200).json({ sets });
  } catch (error) {
    console.error('[REVISION][SETS][LIST]', error);
    return res.status(500).json({ message: 'Failed to list revision sets' });
  }
};

export const getSetMetadata = async (req, res) => {
  try {
    const validation = validateIdParam(req.params.setId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const setDoc = await getSetById({ setId: req.params.setId });
    if (!setDoc) {
      return res.status(404).json({ message: 'Revision set not found' });
    }

    return res.status(200).json(setDoc);
  } catch (error) {
    console.error('[REVISION][SETS][DETAIL]', error);
    return res.status(500).json({ message: 'Failed to get set metadata' });
  }
};

export const getProgress = async (req, res) => {
  try {
    const validation = validateIdParam(req.params.studentId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const dashboard = await getProgressDashboard({ studentId: req.params.studentId });
    return res.status(200).json(dashboard);
  } catch (error) {
    console.error('[REVISION][PROGRESS]', error);
    return res.status(500).json({ message: 'Failed to fetch progress' });
  }
};

export const getWeakTopicsForStudent = async (req, res) => {
  try {
    const validation = validateIdParam(req.params.studentId);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const weakTopics = await getWeakTopics({ studentId: req.params.studentId });
    return res.status(200).json({ weak_topics: weakTopics });
  } catch (error) {
    console.error('[REVISION][WEAK_TOPICS]', error);
    return res.status(500).json({ message: 'Failed to fetch weak topics' });
  }
};
