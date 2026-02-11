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
      // definition is optional; default to empty string so keywords can be created
      // even when a definition wasn't provided by the client
      default: '',
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
