import Subject from '../models/Subject.js';
import Lecture from '../models/Lecture.js';
import Transcript from '../models/Transcript.js';
import KeywordGroup from '../models/KeywordGroup.js';
import Keyword from '../models/Keyword.js';
import Summary from '../models/Summary.js';

// ==================== SUBJECT CONTROLLERS ====================

export const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    const subject = new Subject({
      userId,
      name: name.trim(),
      description: description?.trim() || '',
    });

    const savedSubject = await subject.save();
    res.status(201).json(savedSubject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject', details: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subjects = await Subject.find({ userId }).sort({ createdAt: -1 });
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects', details: error.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject', details: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subject = await Subject.findOneAndUpdate(
      { _id: subjectId, userId },
      {
        name: name?.trim(),
        description: description?.trim(),
      },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject', details: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subject = await Subject.findOneAndDelete({ _id: subjectId, userId });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message });
  }
};

// ==================== LECTURE CONTROLLERS ====================

export const createLecture = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, description } = req.body;

    if (!subjectId || !name || name.trim() === '') {
      return res.status(400).json({ error: 'Subject ID and lecture name are required' });
    }

    // Verify subject exists and belongs to user
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const lecture = new Lecture({
      subjectId,
      name: name.trim(),
      description: description?.trim() || '',
    });

    const savedLecture = await lecture.save();
    res.status(201).json(savedLecture);
  } catch (error) {
    console.error('Error creating lecture:', error);
    res.status(500).json({ error: 'Failed to create lecture', details: error.message });
  }
};

export const getLecturesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const lectures = await Lecture.find({ subjectId }).sort({ createdAt: -1 });
    res.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ error: 'Failed to fetch lectures', details: error.message });
  }
};

export const updateLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { name, description } = req.body;

    const lecture = await Lecture.findByIdAndUpdate(
      lectureId,
      {
        name: name?.trim(),
        description: description?.trim(),
      },
      { new: true }
    );

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    res.json(lecture);
  } catch (error) {
    console.error('Error updating lecture:', error);
    res.status(500).json({ error: 'Failed to update lecture', details: error.message });
  }
};

export const deleteLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findByIdAndDelete(lectureId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    res.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(500).json({ error: 'Failed to delete lecture', details: error.message });
  }
};
