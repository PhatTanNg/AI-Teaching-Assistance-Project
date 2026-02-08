import mongoose from 'mongoose';

const keywordGroupSchema = new mongoose.Schema(
  {
    transcriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transcript',
      required: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
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
