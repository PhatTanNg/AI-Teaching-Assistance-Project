import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKE_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const duplicateUser = await User.findOne({ $or: [{ username }, { email }] });
    if (duplicateUser) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    return res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error('Error during signup:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const signIn = async (req, res) => {
  try {
    console.log('Sign-in request received:', req.body);
    //input fields
    const { usernameOrEmail, password } = req.body;
    //validate input
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    //take hashed password from db
    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    //compare passwords, if match, make access token with jwt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    //refesh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    //save refresh token in db
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKE_TTL),
    });

    //give refresh token in http only cookie
    // Set cookie security options depending on environment
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_TOKE_TTL,
    });
    //give access token in response body
    return res.status(200).json({ message: 'Signin successful', accessToken });
  } catch (err) {
    console.error('Error during signin:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
