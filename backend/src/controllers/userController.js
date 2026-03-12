import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const authMe = async (req, res) => {
  return res.status(200).json({ message: 'Authenticated user', user: req.user });
};

export const updateMe = async (req, res) => {
  try {
    const { displayName, dateOfBirth } = req.body;
    if (!displayName?.trim()) {
      return res.status(400).json({ message: 'Display name is required' });
    }
    const patch = { displayName: displayName.trim() };
    if (dateOfBirth !== undefined) {
      patch.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
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