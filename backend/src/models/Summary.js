import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema(
  {
    transcriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transcript',
      required: true,
      unique: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    text: {
      type: String,
      required: true,
      default: '',
    },
    keywordGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KeywordGroup',
    },
  },
  { timestamps: true }
);

const Summary = mongoose.model('Summary', summarySchema);

export default Summary;
