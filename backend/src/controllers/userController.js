import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Transcript from '../models/Transcript.js';
import StudySession from '../models/StudySession.js';
import Keyword from '../models/Keyword.js';
import KeywordGroup from '../models/KeywordGroup.js';
import Summary from '../models/Summary.js';
import Subject from '../models/Subject.js';
import Lecture from '../models/Lecture.js';

export const authMe = async (req, res) => {
  return res.status(200).json({ message: 'Authenticated user', user: req.user });
};

export const updateMe = async (req, res) => {
  try {
    const { displayName, dateOfBirth, avatarUrl } = req.body;
    if (!displayName?.trim()) {
      return res.status(400).json({ message: 'Display name is required' });
    }
    const patch = { displayName: displayName.trim() };
    if (dateOfBirth !== undefined) {
      patch.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }
    if (avatarUrl !== undefined) {
      patch.avatarUrl = avatarUrl || null;
    }
    const updated = await User.findByIdAndUpdate(
      req.userId,
      patch,
      { new: true, select: '-password' },
    );
    return res.status(200).json({ user: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.userId);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.userId, { password: hashed });
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update password' });
  }
};

export const deleteMe = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Find all user's transcripts (to cascade delete related data)
    const transcripts = await Transcript.find({ userId }).select('_id').lean();
    const transcriptIds = transcripts.map(t => t._id);

    // 2. Find all user's study sessions
    const studySessions = await StudySession.find({ userId }).select('_id').lean();
    const sessionIds = studySessions.map(s => s._id);

    // 3. Delete keywords belonging to user's study sessions
    if (sessionIds.length > 0) {
      await Keyword.deleteMany({ sessionId: { $in: sessionIds } });
      await KeywordGroup.deleteMany({ sessionId: { $in: sessionIds } });
    }

    // 4. Delete summaries linked to user's transcripts
    if (transcriptIds.length > 0) {
      await Summary.deleteMany({ transcriptId: { $in: transcriptIds } });
    }

    // 5. Delete study sessions
    await StudySession.deleteMany({ userId });

    // 6. Delete transcripts
    await Transcript.deleteMany({ userId });

    // 7. Find and delete subjects + their lectures
    const subjects = await Subject.find({ userId }).select('_id').lean();
    const subjectIds = subjects.map(s => s._id);
    if (subjectIds.length > 0) {
      await Lecture.deleteMany({ subjectId: { $in: subjectIds } });
    }
    await Subject.deleteMany({ userId });

    // 8. Delete all sessions (refresh tokens)
    await Session.deleteMany({ userId });

    // 9. Delete the user
    await User.findByIdAndDelete(userId);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error deleting account:', err);
    return res.status(500).json({ message: 'Failed to delete account' });
  }
};
