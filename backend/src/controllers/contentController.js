import Transcript from '../models/Transcript.js';
import KeywordGroup from '../models/KeywordGroup.js';
import Keyword from '../models/Keyword.js';
import Summary from '../models/Summary.js';
import Lecture from '../models/Lecture.js';

// ==================== TRANSCRIPT CONTROLLERS ====================

export const createTranscript = async (req, res) => {
  try {
    const { lectureId, subjectId, text, studyDate } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!lectureId || !subjectId || !studyDate) {
      return res.status(400).json({
        error: 'lectureId, subjectId, and studyDate are required',
      });
    }

    // Verify lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const transcript = new Transcript({
      userId,
      lectureId,
      subjectId,
      text: text || '',
      studyDate: new Date(studyDate),
    });

    const savedTranscript = await transcript.save();
    res.status(201).json(savedTranscript);
  } catch (error) {
    console.error('Error creating transcript:', error);
    res.status(500).json({ error: 'Failed to create transcript', details: error.message });
  }
};

export const getTranscripts = async (req, res) => {
  try {
    const userId = req.userId;
    const { lectureId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let query = { userId };
    if (lectureId) {
      query.lectureId = lectureId;
    }

    const transcripts = await Transcript.find(query)
      .populate('lectureId')
      .populate('subjectId')
      .sort({ createdAt: -1 });

    res.json(transcripts);
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Failed to fetch transcripts', details: error.message });
  }
};

export const getTranscriptById = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const transcript = await Transcript.findOne({ _id: transcriptId, userId })
      .populate('lectureId')
      .populate('subjectId');

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript', details: error.message });
  }
};

export const updateTranscriptText = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (text === undefined) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const transcript = await Transcript.findOneAndUpdate(
      { _id: transcriptId, userId },
      { text },
      { new: true }
    ).populate('lectureId').populate('subjectId');

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    console.error('Error updating transcript:', error);
    res.status(500).json({ error: 'Failed to update transcript', details: error.message });
  }
};

export const deleteTranscript = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const transcript = await Transcript.findOneAndDelete({ _id: transcriptId, userId });
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Cascade delete: Remove associated KeywordGroup, Summary
    await KeywordGroup.deleteMany({ transcriptId });
    await Summary.deleteMany({ transcriptId });

    res.json({ message: 'Transcript and related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(500).json({ error: 'Failed to delete transcript', details: error.message });
  }
};

// ==================== KEYWORD GROUP & KEYWORD CONTROLLERS ====================

export const createKeywordGroup = async (req, res) => {
  try {
    const { transcriptId, lectureId, studyDate, keywords } = req.body;

    if (!transcriptId || !lectureId || !studyDate) {
      return res.status(400).json({
        error: 'transcriptId, lectureId, and studyDate are required',
      });
    }

    // Verify transcript exists
    const transcript = await Transcript.findById(transcriptId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Create keywords first if provided
    let keywordIds = [];
    if (keywords && Array.isArray(keywords)) {
      for (const kw of keywords) {
        if (kw.keywordText && kw.definition) {
          const keyword = await Keyword.create({
            keywordText: kw.keywordText.trim(),
            definition: kw.definition.trim(),
          });
          keywordIds.push(keyword._id);
        }
      }
    }

    const keywordGroup = new KeywordGroup({
      transcriptId,
      lectureId,
      studyDate: new Date(studyDate),
      keywords: keywordIds,
    });

    const savedGroup = await keywordGroup.save();
    await savedGroup.populate('keywords');

    res.status(201).json(savedGroup);
  } catch (error) {
    console.error('Error creating keyword group:', error);
    res.status(500).json({
      error: 'Failed to create keyword group',
      details: error.message,
    });
  }
};

export const getKeywordGroupsByTranscript = async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const keywordGroups = await KeywordGroup.find({ transcriptId })
      .populate('keywords')
      .sort({ createdAt: -1 });

    res.json(keywordGroups);
  } catch (error) {
    console.error('Error fetching keyword groups:', error);
    res.status(500).json({
      error: 'Failed to fetch keyword groups',
      details: error.message,
    });
  }
};

export const addKeywordToGroup = async (req, res) => {
  try {
    const { keywordGroupId } = req.params;
    const { keywordText, definition } = req.body;

    if (!keywordText || !definition) {
      return res.status(400).json({
        error: 'keywordText and definition are required',
      });
    }

    // Create keyword
    const keyword = await Keyword.create({
      keywordText: keywordText.trim(),
      definition: definition.trim(),
    });

    // Add to keyword group
    const keywordGroup = await KeywordGroup.findByIdAndUpdate(
      keywordGroupId,
      { $push: { keywords: keyword._id } },
      { new: true }
    ).populate('keywords');

    if (!keywordGroup) {
      return res.status(404).json({ error: 'Keyword group not found' });
    }

    res.status(201).json(keywordGroup);
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Failed to add keyword', details: error.message });
  }
};

export const updateKeywordDefinition = async (req, res) => {
  try {
    const { keywordId } = req.params;
    const { definition } = req.body;

    if (!definition) {
      return res.status(400).json({ error: 'Definition is required' });
    }

    const keyword = await Keyword.findByIdAndUpdate(
      keywordId,
      { definition: definition.trim() },
      { new: true }
    );

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    res.json(keyword);
  } catch (error) {
    console.error('Error updating keyword definition:', error);
    res.status(500).json({
      error: 'Failed to update keyword definition',
      details: error.message,
    });
  }
};

export const removeKeywordFromGroup = async (req, res) => {
  try {
    const { keywordGroupId, keywordId } = req.params;

    const keywordGroup = await KeywordGroup.findByIdAndUpdate(
      keywordGroupId,
      { $pull: { keywords: keywordId } },
      { new: true }
    ).populate('keywords');

    if (!keywordGroup) {
      return res.status(404).json({ error: 'Keyword group not found' });
    }

    // Delete keyword if it exists
    await Keyword.findByIdAndDelete(keywordId);

    res.json(keywordGroup);
  } catch (error) {
    console.error('Error removing keyword:', error);
    res.status(500).json({
      error: 'Failed to remove keyword',
      details: error.message,
    });
  }
};

// ==================== SUMMARY CONTROLLERS ====================

export const createSummary = async (req, res) => {
  try {
    const { transcriptId, lectureId, subjectId, text, keywordGroupId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!transcriptId || !lectureId || !subjectId) {
      return res.status(400).json({
        error: 'transcriptId, lectureId, and subjectId are required',
      });
    }

    // Check if summary already exists for this transcript
    const existingSummary = await Summary.findOne({ transcriptId });
    if (existingSummary) {
      return res.status(400).json({
        error: 'A summary already exists for this transcript',
      });
    }

    const summary = new Summary({
      transcriptId,
      lectureId,
      subjectId,
      text: text || '',
      keywordGroupId: keywordGroupId || null,
    });

    const savedSummary = await summary.save();
    await savedSummary.populate('transcriptId lectureId subjectId keywordGroupId');

    res.status(201).json(savedSummary);
  } catch (error) {
    console.error('Error creating summary:', error);
    res.status(500).json({ error: 'Failed to create summary', details: error.message });
  }
};

export const getSummariesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const summaries = await Summary.find({ subjectId })
      .populate('transcriptId')
      .populate('lectureId')
      .populate('subjectId')
      .populate({
        path: 'keywordGroupId',
        populate: { path: 'keywords' },
      })
      .sort({ createdAt: -1 });

    res.json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Failed to fetch summaries', details: error.message });
  }
};

export const getSummaryByTranscript = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const summary = await Summary.findOne({ transcriptId })
      .populate('transcriptId')
      .populate('lectureId')
      .populate('subjectId')
      .populate({
        path: 'keywordGroupId',
        populate: { path: 'keywords' },
      });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
};

export const updateSummaryText = async (req, res) => {
  try {
    const { summaryId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (text === undefined) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const summary = await Summary.findByIdAndUpdate(
      summaryId,
      { text },
      { new: true }
    ).populate('transcriptId lectureId subjectId').populate({
      path: 'keywordGroupId',
      populate: { path: 'keywords' },
    });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error updating summary:', error);
    res.status(500).json({ error: 'Failed to update summary', details: error.message });
  }
};

export const deleteSummary = async (req, res) => {
  try {
    const { summaryId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const summary = await Summary.findByIdAndDelete(summaryId);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ error: 'Failed to delete summary', details: error.message });
  }
};
