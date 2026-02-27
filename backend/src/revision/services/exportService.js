import mongoose from 'mongoose';

const { Schema } = mongoose;

const revisionSetSchema = new Schema(
  {
    setType: { type: String, enum: ['flashcard', 'mcq'], required: true, index: true },
    title: { type: String },
  },
  { timestamps: true, collection: 'revision_sets' },
);

const flashcardSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    sourceRef: { type: String, default: '' },
  },
  { timestamps: true, collection: 'flashcards' },
);

const mcqQuestionSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, required: true, index: true },
    question: { type: String, required: true },
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true },
    correct: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation: { type: String, required: true },
    sourceRef: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'mcq_questions' },
);

const RevisionSet = mongoose.models.RevisionSet || mongoose.model('RevisionSet', revisionSetSchema);
const Flashcard = mongoose.models.Flashcard || mongoose.model('Flashcard', flashcardSchema);
const McqQuestion =
  mongoose.models.RevisionMcqQuestion || mongoose.model('RevisionMcqQuestion', mcqQuestionSchema);

const escapeCsv = (text) => `"${String(text || '').replace(/"/g, '""')}"`;

export const generateAnkiCsv = async ({ setId }) => {
  const setDoc = await RevisionSet.findById(setId).lean();
  if (!setDoc || setDoc.setType !== 'flashcard') return null;

  const cards = await Flashcard.find({ setId }).lean();
  const tag = (setDoc.title || 'revision').replace(/\s+/g, '_').toLowerCase();

  const lines = ['Front,Back,Tags'];
  for (const card of cards) {
    lines.push(`${escapeCsv(card.front)},${escapeCsv(card.back)},${escapeCsv(tag)}`);
  }

  return {
    filename: `anki-${setId}.csv`,
    contentType: 'text/csv',
    body: lines.join('\n'),
  };
};

export const generateSetPdf = async ({ setId }) => {
  const setDoc = await RevisionSet.findById(setId).lean();
  if (!setDoc) return null;

  let PDFDocument;
  try {
    const module = await import('pdfkit');
    PDFDocument = module.default || module;
  } catch {
    const error = new Error('pdfkit dependency is not installed');
    error.statusCode = 500;
    throw error;
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  const completion = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).text(`Revision Export: ${setDoc.title || setDoc._id}`, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Type: ${setDoc.setType}`);
  doc.moveDown();

  if (setDoc.setType === 'flashcard') {
    const cards = await Flashcard.find({ setId }).lean();
    cards.forEach((card, index) => {
      doc.fontSize(12).text(`${index + 1}. Front: ${card.front}`);
      doc.text(`Back: ${card.back}`);
      doc.text(`Source: ${card.sourceRef || '-'}`);
      doc.moveDown();
    });
  } else {
    const questions = await McqQuestion.find({ setId }).lean();
    questions.forEach((question, index) => {
      doc.fontSize(12).text(`${index + 1}. ${question.question}`);
      doc.text(`A) ${question.optionA}`);
      doc.text(`B) ${question.optionB}`);
      doc.text(`C) ${question.optionC}`);
      doc.text(`D) ${question.optionD}`);
      doc.text(`Correct: ${question.correct}`);
      doc.text(`Explanation: ${question.explanation}`);
      doc.text(`Source: ${question.sourceRef || '-'}`);
      doc.moveDown();
    });
  }

  doc.end();
  const buffer = await completion;

  return {
    filename: `revision-${setId}.pdf`,
    contentType: 'application/pdf',
    body: buffer,
  };
};
