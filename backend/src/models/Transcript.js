import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    studyDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const Transcript = mongoose.model('Transcript', transcriptSchema);

export default Transcript;
