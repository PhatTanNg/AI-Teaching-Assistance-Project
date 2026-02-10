import mongoose from 'mongoose';

const keywordGroupSchema = new mongoose.Schema(
  {
    transcriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transcript',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudySession',
      index: true,
    },
      // lectureId is optional: background tasks may not have a lecture context
      lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
      },
    studyDate: {
      type: Date,
      required: true,
    },
    keywords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Keyword',
      },
    ],
  },
  { timestamps: true }
);

const KeywordGroup = mongoose.model('KeywordGroup', keywordGroupSchema);

export default KeywordGroup;
