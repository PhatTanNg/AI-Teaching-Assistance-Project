# AITA — NotebookLM-like Feature Expansion

## Context

AITA hiện chỉ nhận audio/video làm đầu vào (Whisper). Output layer (MCQ, flashcard, mindmap, summary) đã hoàn chỉnh. Mục tiêu là mở rộng **input layer** để hỗ trợ PDF, ảnh (OCR), và URL — song song với luồng audio hiện tại — và bổ sung khái niệm **Notebook** để tổng hợp nhiều nguồn thành một note thống nhất trước khi generate study materials.

**Approach:** Notebook-first expansion (không rewrite). Giữ nguyên mọi thứ hiện tại, thêm `Document` model + `Notebook` model + 2 route files mới.

---

## New MongoDB Models

### `backend/src/models/Document.js`
```
userId        ObjectId (ref User)      required, indexed
lectureId     ObjectId (ref Lecture)   optional
title         String                   required, maxlength 120
type          enum: 'pdf'|'image'|'url'  required
status        enum: 'pending'|'processing'|'ready'|'error'  default 'pending'
cloudinaryUrl String                   populated after upload (null for url type)
sourceUrl     String                   for url type
extractedText String                   result of extraction, default ''
pageCount     Number                   PDFs only, default null
fileSize      Number                   bytes, default null
errorMessage  String                   only when status='error'
timestamps: true
```

### `backend/src/models/Notebook.js`
```
userId           ObjectId (ref User)   required, indexed
title            String                required, maxlength 120
description      String                default ''
documentIds      [ObjectId]            ref Document
transcriptIds    [ObjectId]            ref Transcript
synthesizedNote  Object (subdoc):
  .text          String
  .model         String
  .generatedAt   Date
timestamps: true
```

---

## New Backend Files (8 files)

| File | Purpose |
|------|---------|
| `backend/src/models/Document.js` | Document schema |
| `backend/src/models/Notebook.js` | Notebook schema |
| `backend/src/services/documentService.js` | Cloudinary upload + 3 extractors (pdf-parse, GPT Vision, cheerio) |
| `backend/src/services/notebookService.js` | gatherNotebookTexts, synthesizeNotebook — follow mindmapService.js pattern |
| `backend/src/controllers/documentController.js` | upload, fromUrl, list, getOne, pollStatus, patch, delete — follow mindmapController.js pattern |
| `backend/src/controllers/notebookController.js` | create, list, getOne, update, remove, addSources, removeSources, synthesize, generateFlashcards, generateMcq, generateMindmap |
| `backend/src/routes/documentRoute.js` | multer instance (10MB memoryStorage) + document CRUD routes |
| `backend/src/routes/notebookRoute.js` | notebook CRUD + synthesis + generation routes |

---

## Modified Backend Files (4 files)

| File | Change |
|------|--------|
| `backend/src/server.js` | Register `app.use('/api/documents', protectedRoute, documentRoute)` and `app.use('/api/notebooks', protectedRoute, notebookRoute)` |
| `backend/src/revision/models/revisionModels.js` | Add `sourceType: { type: String, enum: ['transcript','notebook'], default: 'transcript' }` + `notebookId: { type: ObjectId, default: null }` to RevisionSet schema (additive, backward-compatible) |
| `backend/src/models/MindMap.js` | Add `notebookId: { type: ObjectId, ref: 'Notebook', default: null }` (optional, additive) |
| `backend/package.json` | Add `cloudinary`, `pdf-parse`, `cheerio` |

### New npm packages needed:
```bash
npm install cloudinary pdf-parse cheerio
```

### New env vars needed:
```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## New Backend API Endpoints

### Documents (`/api/documents`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Multer upload → Cloudinary → background extraction |
| POST | `/from-url` | Validate URL → background cheerio scrape |
| GET | `/` | List user's docs, filter `?lectureId=` |
| GET | `/:id` | Single doc (ownership check) |
| GET | `/:id/status` | Poll extraction status (frontend polls every 2s) |
| PATCH | `/:id` | Update title/lectureId |
| DELETE | `/:id` | Delete Cloudinary file + MongoDB doc + $pull from notebooks |

### Notebooks (`/api/notebooks`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create empty notebook |
| GET | `/` | List (exclude synthesizedNote.text for performance) |
| GET | `/:id` | Detail with populated documentIds + transcriptIds |
| PUT | `/:id` | Update title/description |
| DELETE | `/:id` | Delete notebook (not cascade to documents) |
| POST | `/:id/sources` | `$addToSet` documentIds + transcriptIds |
| DELETE | `/:id/sources` | `$pull` documentIds + transcriptIds |
| POST | `/:id/synthesize` | Gather all text → GPT → store synthesizedNote |
| POST | `/:id/flashcards` | Generate flashcards from combined notebook text |
| POST | `/:id/mcq` | Generate MCQ from combined notebook text |
| POST | `/:id/mindmap` | Generate mindmap, save with notebookId set |

---

## New Frontend Files (6 files)

| File | Purpose |
|------|---------|
| `frontend/src/pages/NotebooksPage.jsx` | Bento grid list + "Tạo Notebook" FAB + create dialog |
| `frontend/src/pages/NotebookDetailPage.jsx` | Split-panel: Sources (left 30%) + Notes+Actions (right 70%) |
| `frontend/src/components/NotebookCard.jsx` | Card: title, source count badge, note preview, date |
| `frontend/src/components/DocumentUploader.jsx` | Tabs: PDF/Image drag-drop + URL input; polls status after upload |
| `frontend/src/components/AddSourcesDialog.jsx` | shadcn Dialog: user's documents (checkbox) + transcripts (checkbox) |
| `frontend/src/components/LectureDocuments.jsx` | "Tài liệu" section in lecture detail, opens DocumentUploader |

---

## Modified Frontend Files (5 files)

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add routes: `/notebooks` + `/notebooks/:id` inside ProtectedRoute |
| `frontend/src/components/Sidebar.jsx` | Add `{ icon: BookOpen, label: t('nav.notebooks'), path: '/notebooks' }` to navItems |
| `frontend/src/api/client.js` | ~12 new exported functions (uploadDocument, documentFromUrl, getDocuments, getDocumentStatus, deleteDocument, createNotebook, getNotebooks, getNotebook, updateNotebook, deleteNotebook, addNotebookSources, removeNotebookSources, synthesizeNotebook, notebookFlashcards, notebookMcq, notebookMindmap) |
| `frontend/src/i18n/vi.js` + `en.js` | Add `nav.notebooks`, `notebook.*`, `documents.*` namespaces |
| `frontend/src/pages/RevisionModePage.jsx` | Add "Notebook" tab to source selector panel |

---

## Implementation Phases

### Phase 1 — Document Ingestion (~1 week)
Backend only: Document model, documentService (3 extractors + Cloudinary), documentController, documentRoute. Register in server.js. Add npm packages + env vars.

**Ships:** PDF/image/URL → text extraction pipeline. Testable via Postman.

### Phase 2 — Notebooks UI (~1 week)
Notebook model + notebookController (CRUD + source management) + notebookRoute. Frontend: NotebooksPage, NotebookDetailPage (sources panel working, notes panel placeholder), NotebookCard, AddSourcesDialog, Sidebar nav update, App routes, i18n keys.

**Ships:** Full notebook CRUD + source management. Users can organise materials.

### Phase 3 — AI Synthesis (~1 week)
notebookService.js (gatherNotebookTexts + synthesizeNotebook). Wire synthesize endpoint + button in NotebookDetailPage. Display synthesizedNote.text with react-markdown + GenerationLoader.

**Ships:** Core NotebookLM feature. "Tổng hợp ghi chú" button works end-to-end.

### Phase 4 — Notebook as Study Source (~1 week)
Generate flashcards/MCQ/mindmap from notebook (notebookController generation handlers). Update RevisionSet + MindMap schemas. Wire action buttons in NotebookDetailPage. Add Notebook tab in RevisionModePage. Add LectureDocuments component.

**Ships:** Notebooks fully replace transcripts as study source input.

---

## Key Patterns to Follow

- **documentService.js** → follow `mindmapService.js` structure (named exports, OpenAI call pattern)
- **documentController.js** → follow `mindmapController.js` (ownership check `{ _id, userId }`, try/catch, error shape)
- **documentRoute.js** multer → follow `transcribeRoute.js` (own multer instance, memoryStorage)
- **Background processing** → fire-and-forget async (same pattern as summary/keyword generation in createTranscript)
- **Status polling** → GET `/:id/status` polled every 2s by DocumentUploader (not WebSocket — consistent with existing arch)
- **Schema changes** → additive only, always with `default:` values (no migration needed)

---

## Verification

### Phase 1
1. `POST /api/documents/upload` with a PDF → returns doc with `status: 'processing'`
2. Poll `GET /api/documents/:id/status` → eventually returns `status: 'ready'` with `extractedText`
3. `POST /api/documents/from-url` with a Wikipedia URL → same flow
4. `DELETE /api/documents/:id` → file removed from Cloudinary + MongoDB doc gone

### Phase 2
1. Create notebook → appears in `/notebooks` list
2. Open notebook → add a document + a transcript → both appear in sources panel
3. Remove source → removed from list

### Phase 3
1. Notebook with 2+ ready sources → click "Tổng hợp" → synthesizedNote.text appears in right panel
2. Note is preserved on page refresh

### Phase 4
1. From NotebookDetailPage → "Tạo Flashcard" → navigates to revision with set pre-loaded from notebook text
2. RevisionSet record has `sourceType: 'notebook'` + `notebookId` set
3. MindMap generated from notebook → appears in /mindmap list
