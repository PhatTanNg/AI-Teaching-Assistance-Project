import MindMap from '../models/MindMap.js';
import Transcript from '../models/Transcript.js';
import { generateMindMap, computeHash } from '../services/mindmapService.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute isStale and deletedTranscriptCount for a mind map document
 * by comparing stored snapshots against current transcript updatedAt values.
 */
async function computeStaleInfo(mindMap) {
  const ids = mindMap.transcriptIds.map(String);
  const currentTranscripts = await Transcript.find({ _id: { $in: ids } }).select(
    '_id updatedAt'
  );
  const currentMap = Object.fromEntries(
    currentTranscripts.map((t) => [String(t._id), t.updatedAt])
  );

  let isStale = false;
  let deletedTranscriptCount = 0;

  for (const snap of mindMap.transcriptSnapshots || []) {
    const id = String(snap.transcriptId);
    const currentUpdatedAt = currentMap[id];
    if (!currentUpdatedAt) {
      deletedTranscriptCount++;
      isStale = true;
    } else if (currentUpdatedAt > snap.updatedAt) {
      isStale = true;
    }
  }

  return { isStale, deletedTranscriptCount };
}

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * POST /api/mindmaps/generate
 * Body: { transcriptIds: string[] }
 */
export async function generate(req, res) {
  try {
    const userId = req.userId;
    const { transcriptIds } = req.body;

    // Validate
    if (!Array.isArray(transcriptIds) || transcriptIds.length === 0) {
      return res.status(400).json({ message: 'transcriptIds must be a non-empty array' });
    }
    if (transcriptIds.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 transcripts per mind map' });
    }

    // Verify ownership
    const transcripts = await Transcript.find({
      _id: { $in: transcriptIds },
      userId,
    });
    if (transcripts.length !== transcriptIds.length) {
      return res.status(403).json({ message: 'One or more transcripts not found or not yours' });
    }

    // Cache check: same set of transcripts?
    const hash = computeHash(transcriptIds);
    const existing = await MindMap.findOne({ userId, hash }).select('-mapData');
    if (existing) {
      return res.status(200).json({ existing: true, mindMap: existing });
    }

    // Generate
    const texts = transcripts.map((t) => t.rawTranscript);
    const mapData = await generateMindMap(texts);

    // Build transcript snapshots for stale detection
    const transcriptSnapshots = transcripts.map((t) => ({
      transcriptId: t._id,
      updatedAt: t.updatedAt,
    }));

    // Save
    const newMap = await MindMap.create({
      userId,
      title: mapData.title || 'Mind Map',
      transcriptIds: transcripts.map((t) => t._id),
      mapData,
      transcriptSnapshots,
      hash,
    });

    return res.status(201).json({ existing: false, mindMap: newMap });
  } catch (err) {
    console.error('[MindMap] generate error:', err);
    if (err.message?.includes('too short')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to generate mind map', details: err.message });
  }
}

/**
 * GET /api/mindmaps
 * Returns metadata list — mapData excluded.
 */
export async function list(req, res) {
  try {
    const userId = req.userId;
    const maps = await MindMap.find({ userId }).select('-mapData').sort({ updatedAt: -1 });

    // Compute stale info for each map (parallel)
    const enriched = await Promise.all(
      maps.map(async (m) => {
        const { isStale, deletedTranscriptCount } = await computeStaleInfo(m);
        return { ...m.toObject(), isStale, deletedTranscriptCount };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error('[MindMap] list error:', err);
    return res.status(500).json({ message: 'Failed to load mind maps' });
  }
}

/**
 * GET /api/mindmaps/:id
 * Returns full document including mapData.
 */
export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const mindMap = await MindMap.findOne({ _id: id, userId: req.userId });
    if (!mindMap) return res.status(404).json({ message: 'Mind map not found' });
    return res.json(mindMap);
  } catch (err) {
    console.error('[MindMap] getOne error:', err);
    return res.status(500).json({ message: 'Failed to load mind map' });
  }
}

/**
 * PUT /api/mindmaps/:id
 * Body: { title: string }
 */
export async function rename(req, res) {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const mindMap = await MindMap.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { title: title.trim().slice(0, 80) },
      { new: true, select: '-mapData' }
    );
    if (!mindMap) return res.status(404).json({ message: 'Mind map not found' });
    return res.json(mindMap);
  } catch (err) {
    console.error('[MindMap] rename error:', err);
    return res.status(500).json({ message: 'Failed to rename mind map' });
  }
}

/**
 * DELETE /api/mindmaps/:id
 */
export async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await MindMap.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Mind map not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[MindMap] remove error:', err);
    return res.status(500).json({ message: 'Failed to delete mind map' });
  }
}

/**
 * POST /api/mindmaps/:id/regenerate
 * Regenerates mapData using the stored transcriptIds (overwrites).
 */
export async function regenerate(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const mindMap = await MindMap.findOne({ _id: id, userId });
    if (!mindMap) return res.status(404).json({ message: 'Mind map not found' });

    const transcripts = await Transcript.find({
      _id: { $in: mindMap.transcriptIds },
      userId,
    });
    if (transcripts.length === 0) {
      return res.status(400).json({ message: 'No source transcripts found' });
    }

    const texts = transcripts.map((t) => t.rawTranscript);
    const mapData = await generateMindMap(texts);

    const transcriptSnapshots = transcripts.map((t) => ({
      transcriptId: t._id,
      updatedAt: t.updatedAt,
    }));

    mindMap.mapData = mapData;
    mindMap.title = mapData.title || mindMap.title;
    mindMap.transcriptSnapshots = transcriptSnapshots;
    mindMap.hash = computeHash(transcripts.map((t) => String(t._id)));
    await mindMap.save();

    return res.json(mindMap);
  } catch (err) {
    console.error('[MindMap] regenerate error:', err);
    if (err.message?.includes('too short')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to regenerate mind map', details: err.message });
  }
}

/**
 * PUT /api/mindmaps/:id/overwrite
 * Generate from a NEW set of transcriptIds and overwrite this map's data.
 * Body: { transcriptIds: string[] }
 */
export async function overwrite(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { transcriptIds } = req.body;

    if (!Array.isArray(transcriptIds) || transcriptIds.length === 0) {
      return res.status(400).json({ message: 'transcriptIds must be a non-empty array' });
    }
    if (transcriptIds.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 transcripts per mind map' });
    }

    const mindMap = await MindMap.findOne({ _id: id, userId });
    if (!mindMap) return res.status(404).json({ message: 'Mind map not found' });

    const transcripts = await Transcript.find({ _id: { $in: transcriptIds }, userId });
    if (transcripts.length !== transcriptIds.length) {
      return res.status(403).json({ message: 'One or more transcripts not found or not yours' });
    }

    const texts = transcripts.map((t) => t.rawTranscript);
    const mapData = await generateMindMap(texts);

    const transcriptSnapshots = transcripts.map((t) => ({
      transcriptId: t._id,
      updatedAt: t.updatedAt,
    }));

    mindMap.mapData = mapData;
    mindMap.title = mapData.title || mindMap.title;
    mindMap.transcriptIds = transcripts.map((t) => t._id);
    mindMap.transcriptSnapshots = transcriptSnapshots;
    mindMap.hash = computeHash(transcripts.map((t) => String(t._id)));
    await mindMap.save();

    return res.json(mindMap);
  } catch (err) {
    console.error('[MindMap] overwrite error:', err);
    if (err.message?.includes('too short')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Failed to overwrite mind map', details: err.message });
  }
}
