import mongoose from 'mongoose';

const { Schema } = mongoose;

const transcriptSnapshotSchema = new Schema(
  {
    transcriptId: { type: Schema.Types.ObjectId, ref: 'Transcript', required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const mindMapSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 80 },
    transcriptIds: [{ type: Schema.Types.ObjectId, ref: 'Transcript' }],
    // mapData is excluded from list queries via .select('-mapData')
    mapData: { type: Schema.Types.Mixed },
    // Snapshot of each source transcript's updatedAt at generation time — used for stale detection
    transcriptSnapshots: [transcriptSnapshotSchema],
    // SHA-1 of sorted transcriptIds — enables cache/duplicate detection
    hash: { type: String, index: true },
  },
  { timestamps: true }
);

const MindMap = mongoose.model('MindMap', mindMapSchema);
export default MindMap;
