import mongoose from 'mongoose';

const keywordSchema = new mongoose.Schema(
  {
    keywordText: {
      type: String,
      required: true,
      trim: true,
    },
    definition: {
      type: String,
      required: true,
      trim: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudySession',
      index: true,
    },
  },
  { timestamps: true }
);

const Keyword = mongoose.model('Keyword', keywordSchema);

export default Keyword;
