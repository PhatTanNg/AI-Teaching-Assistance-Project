import mongoose from 'mongoose';

const emailVerificationTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const EmailVerificationToken = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

export default EmailVerificationToken;
