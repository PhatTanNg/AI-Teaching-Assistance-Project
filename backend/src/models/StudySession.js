import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transcriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transcript', required: true },
    summaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Summary' },
    keywordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],
    keywordGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KeywordGroup' }],
    meta: { type: Object },
  },
  { timestamps: true }
);

const StudySession = mongoose.model('StudySession', studySessionSchema);
export default StudySession;
