import mongoose from 'mongoose';

const notesSchema = new mongoose.Schema(
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
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudySession',
      index: true,
    },
    text: {
      type: String,
      required: true,
      default: '',
    },
  },
  { timestamps: true }
);

const Notes = mongoose.model('Notes', notesSchema);

export default Notes;
