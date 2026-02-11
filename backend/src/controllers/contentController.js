import Transcript from '../models/Transcript.js';
import KeywordGroup from '../models/KeywordGroup.js';
import Keyword from '../models/Keyword.js';
import Summary from '../models/Summary.js';
import Lecture from '../models/Lecture.js';
import StudySession from '../models/StudySession.js';
import { generateSummary } from '../services/summaryService.js';

// ==================== TRANSCRIPT CONTROLLERS ====================

/**
 * Create a new transcript with automatic summarization
 * Workflow:
 * 1. Save the transcript with rawTranscript text
 * 2. Automatically send transcript to OpenAI for summarization
 * 3. Store the generated summary in the transcript record
 * 4. Return the transcript with summary (or without if summarization fails)
 * 
 * Error handling: If summarization fails, the transcript is still saved successfully.
 * The summary field remains empty and can be manually edited or generated later.
 */
export const createTranscript = async (req, res) => {
  try {
    const { subject, rawTranscript } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'subject is required' });
    }

    if (!rawTranscript || !rawTranscript.trim()) {
      return res.status(400).json({ error: 'rawTranscript is required' });
    }

    // Create and save the transcript
    const transcript = new Transcript({
      userId,
      subject: subject.trim(),
      rawTranscript: rawTranscript.trim(),
      summary: '',
      transcribedAt: new Date(),
    });

    const savedTranscript = await transcript.save();

    // Create a study session to group transcript, summary and keywords
    const session = await StudySession.create({
      userId,
      transcriptId: savedTranscript._id,
      meta: { subject: subject.trim() },
    });

    // link session to transcript
    await Transcript.findByIdAndUpdate(savedTranscript._id, { sessionId: session._id });

    // Background tasks: generate summary, create Summary doc, extract keywords and create groups
    (async () => {
      try {
        // Summarize
        const summaryText = await generateSummary(rawTranscript.trim()).catch((e) => {
          console.warn('[SUMMARY] generation failed:', e?.message || e);
          return '';
        });

        if (summaryText) {
          try {
            // Update transcript summary
            await Transcript.findByIdAndUpdate(savedTranscript._id, { summary: summaryText });

            // Create Summary document (lectureId/subjectId may be unknown at this time)
            const summaryDoc = await Summary.create({
              transcriptId: savedTranscript._id,
              text: summaryText,
              sessionId: session._id,
            });

            // Link summary into session
            session.summaryId = summaryDoc._id;
            await session.save();

            console.log(`[SUMMARY] Created Summary ${summaryDoc._id} for transcript ${savedTranscript._id}`);
          } catch (e) {
            console.error('[SUMMARY] Failed to save Summary document:', e?.message || e);
          }
        }

        // Basic keyword extraction (simple frequency-based stub)
        try {
          const extractKeywords = (text, max = 12) => {
            if (!text) return [];
            const stopwords = new Set(['the','and','is','in','to','of','a','for','on','with','that','this','as','are','it','by','an']);
            const words = text
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 2 && !stopwords.has(w));
            const freq = {};
            for (const w of words) freq[w] = (freq[w] || 0) + 1;
            return Object.entries(freq)
              .sort((a,b) => b[1]-a[1])
              .slice(0, max)
              .map(([keyword]) => ({ keywordText: keyword, definition: '' }));
          };

          const keywords = extractKeywords(summaryText || rawTranscript.trim(), 10);

          const createdKeywordIds = [];
          for (const kw of keywords) {
            const k = await Keyword.create({ keywordText: kw.keywordText, definition: kw.definition || '', sessionId: session._id });
            createdKeywordIds.push(k._id);
          }

          // Create a keyword group for this transcript if keywords exist
          if (createdKeywordIds.length > 0) {
            // Only include lectureId if available in session meta
            const groupData = {
              transcriptId: savedTranscript._id,
              sessionId: session._id,
              studyDate: new Date(),
              keywords: createdKeywordIds,
            };
            if (session?.meta && session.meta.lectureId) groupData.lectureId = session.meta.lectureId;

            const group = await KeywordGroup.create(groupData);

            session.keywordIds = createdKeywordIds;
            session.keywordGroupIds = [group._id];
            await session.save();

            console.log(`[KEYWORDS] Created ${createdKeywordIds.length} keywords and group ${group._id} for transcript ${savedTranscript._id}`);
          } else {
            console.log(`[KEYWORDS] No keywords extracted for transcript ${savedTranscript._id}`);
          }
        } catch (kwErr) {
          console.error('[KEYWORDS] Keyword extraction/storage failed:', kwErr?.message || kwErr);
        }
      } catch (bgErr) {
        console.error('[BACKGROUND] Error in background tasks for transcript:', bgErr?.message || bgErr);
      }
    })();

    // Return the saved transcript immediately (background tasks run asynchronously)
    res.status(201).json({ ...savedTranscript.toObject(), sessionId: session._id });
  } catch (error) {
    console.error('Error creating transcript:', error);
    res.status(500).json({ error: 'Failed to create transcript', details: error.message });
  }
};

export const getTranscripts = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all transcripts for the user, sorted by most recent first
    const transcripts = await Transcript.find({ userId })
      .sort({ transcribedAt: -1 });

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

    const transcript = await Transcript.findOne({ _id: transcriptId, userId });

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript', details: error.message });
  }
};

/**
 * Update transcript fields (rawTranscript and/or summary)
 * Used when a user manually edits a transcript or its summary
 */
export const updateTranscriptText = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const { rawTranscript, summary } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // At least one field must be provided for update
    if (rawTranscript === undefined && summary === undefined) {
      return res.status(400).json({ error: 'At least one field (rawTranscript or summary) must be provided' });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (rawTranscript !== undefined) {
      updateData.rawTranscript = rawTranscript.trim();
    }
    if (summary !== undefined) {
      updateData.summary = summary.trim();
    }

    const transcript = await Transcript.findOneAndUpdate(
      { _id: transcriptId, userId },
      updateData,
      { new: true }
    );

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

    // Cascade delete: Remove associated KeywordGroup
    await KeywordGroup.deleteMany({ transcriptId });

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

// ------------------ NEW: Keyword list by session ------------------
export const createKeywords = async (req, res) => {
  try {
    const { sessionId, keywords } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!sessionId || !Array.isArray(keywords)) return res.status(400).json({ error: 'sessionId and keywords array required' });

    // Try to gather context (summary or raw transcript) to help OpenAI produce better definitions
    let contextText = '';
    try {
      const session = await StudySession.findById(sessionId);
      if (session?.transcriptId) {
        const transcript = await Transcript.findById(session.transcriptId);
        if (transcript) {
          contextText = transcript.summary || transcript.rawTranscript || '';
        }
      }
    } catch (ctxErr) {
      console.warn('[KEYWORDS] Failed to load session/transcript context for definitions:', ctxErr?.message || ctxErr);
    }

    // Prepare list of keyword texts (unique, trimmed)
    const keywordTexts = Array.from(new Set(keywords
      .map(k => (typeof k === 'string' ? k : k.keywordText || k.word || k.text))
      .filter(Boolean)
      .map(s => s.toString().trim())
    ));

    // Helper: call OpenAI to generate definitions for a set of keywords using provided context
    const generateDefinitions = async (words, context) => {
      if (!words || words.length === 0) return {};
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return {};

      const systemMsg = {
        role: 'system',
        content: 'You are a concise assistant that produces one-sentence definitions for technical or educational keywords. Return only valid JSON in the form [{"keyword":"...","definition":"..."}, ...] with no extra commentary.'
      };

      const userMsg = {
        role: 'user',
        content: `Provide a short (one-sentence) definition for each of the following keywords: ${JSON.stringify(words)}.\n\nContext: ${context ? context.substring(0, 4000) : 'none'}.\n\nReturn output as valid JSON array only.`
      };

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [systemMsg, userMsg],
            temperature: 0.2,
            max_tokens: 500,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.warn('[KEYWORDS] OpenAI definition request failed:', resp.status, errText);
          return {};
        }

        const data = await resp.json().catch(() => ({}));
        const content = data?.choices?.[0]?.message?.content;
        if (!content) return {};

        // Try to extract JSON from the model output (strip surrounding text if any)
        let jsonText = content.trim();
        // Find first '[' and last ']' to extract JSON array
        const first = jsonText.indexOf('[');
        const last = jsonText.lastIndexOf(']');
        if (first !== -1 && last !== -1 && last > first) {
          jsonText = jsonText.slice(first, last + 1);
        }

        const parsed = JSON.parse(jsonText);
        const map = {};
        for (const item of parsed) {
          if (item && item.keyword) {
            map[item.keyword.toString().trim().toLowerCase()] = (item.definition || '').toString().trim();
          } else if (item && item.keywordText) {
            map[item.keywordText.toString().trim().toLowerCase()] = (item.definition || '').toString().trim();
          }
        }
        return map;
      } catch (e) {
        console.warn('[KEYWORDS] Error parsing OpenAI response for definitions:', e?.message || e);
        return {};
      }
    };

    // Generate definitions only for keywords that lack one
    let generatedMap = {};
    try {
      // Determine which words actually need a generated definition
      const needGen = [];
      for (const t of keywordTexts) {
        const provided = keywords.find(k => ((typeof k === 'string' ? k : k.keywordText) || '').toString().trim().toLowerCase() === t.toLowerCase());
        if (!provided) continue;
        const def = typeof provided === 'string' ? '' : (provided.definition || provided.explanation || '');
        if (!def || def.trim().length === 0) {
          needGen.push(t);
        }
      }

      if (needGen.length > 0) {
        generatedMap = await generateDefinitions(needGen, contextText);
      }
    } catch (genErr) {
      console.warn('[KEYWORDS] Definition generation failed:', genErr?.message || genErr);
      generatedMap = {};
    }

    const created = [];
    for (const kw of keywords) {
      const text = (typeof kw === 'string' ? kw : kw.keywordText || kw.word || kw.text || '').toString().trim();
      if (!text) continue;
      const providedDef = typeof kw === 'string' ? '' : (kw.definition || kw.explanation || '');
      const def = providedDef && providedDef.toString().trim().length > 0
        ? providedDef.toString().trim()
        : (generatedMap[text.toLowerCase()] || '');

      const k = await Keyword.create({ keywordText: text, definition: def, sessionId });
      created.push(k);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating keywords:', err);
    res.status(500).json({ error: 'Failed to create keywords', details: err.message });
  }
};

export const getKeywordsBySession = async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId query param required' });

    const keywords = await Keyword.find({ sessionId }).sort({ createdAt: -1 });
    res.json(keywords);
  } catch (err) {
    console.error('Error fetching keywords by session:', err);
    res.status(500).json({ error: 'Failed to fetch keywords', details: err.message });
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
