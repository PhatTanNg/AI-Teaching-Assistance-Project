import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatarUrl: { type: String },
    avatarID: { type: String },
    phone: { type: String, sparse: true },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

export default User;
