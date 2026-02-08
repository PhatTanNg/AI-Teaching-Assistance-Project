const defaultBaseUrl = 'http://localhost:5001';
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;

export const apiClient = async (endpoint, { method = 'GET', data, token } = {}) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message ?? 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

// ==================== SUBJECT ENDPOINTS ====================

export const createSubject = (token, { name, description }) =>
  apiClient('/api/subjects', {
    method: 'POST',
    token,
    data: { name, description },
  });

export const getSubjects = (token) =>
  apiClient('/api/subjects', { method: 'GET', token });

export const getSubjectById = (token, subjectId) =>
  apiClient(`/api/subjects/${subjectId}`, { method: 'GET', token });

export const updateSubject = (token, subjectId, { name, description }) =>
  apiClient(`/api/subjects/${subjectId}`, {
    method: 'PUT',
    token,
    data: { name, description },
  });

export const deleteSubject = (token, subjectId) =>
  apiClient(`/api/subjects/${subjectId}`, { method: 'DELETE', token });

// ==================== LECTURE ENDPOINTS ====================

export const createLecture = (token, subjectId, { name, description }) =>
  apiClient(`/api/subjects/${subjectId}/lectures`, {
    method: 'POST',
    token,
    data: { subjectId, name, description },
  });

export const getLecturesBySubject = (token, subjectId) =>
  apiClient(`/api/subjects/${subjectId}/lectures`, { method: 'GET', token });

export const updateLecture = (token, lectureId, { name, description }) =>
  apiClient(`/api/subjects/lectures/${lectureId}`, {
    method: 'PUT',
    token,
    data: { name, description },
  });

export const deleteLecture = (token, lectureId) =>
  apiClient(`/api/subjects/lectures/${lectureId}`, { method: 'DELETE', token });

// ==================== TRANSCRIPT ENDPOINTS ====================

export const createTranscript = (token, { lectureId, subjectId, text, studyDate }) =>
  apiClient('/api/content/transcripts', {
    method: 'POST',
    token,
    data: { lectureId, subjectId, text, studyDate },
  });

export const getTranscripts = (token, lectureId) =>
  apiClient(`/api/content/transcripts${lectureId ? `?lectureId=${lectureId}` : ''}`, {
    method: 'GET',
    token,
  });

export const getTranscriptById = (token, transcriptId) =>
  apiClient(`/api/content/transcripts/${transcriptId}`, { method: 'GET', token });

export const updateTranscriptText = (token, transcriptId, { text }) =>
  apiClient(`/api/content/transcripts/${transcriptId}`, {
    method: 'PUT',
    token,
    data: { text },
  });

export const deleteTranscript = (token, transcriptId) =>
  apiClient(`/api/content/transcripts/${transcriptId}`, { method: 'DELETE', token });

// ==================== KEYWORD GROUP ENDPOINTS ====================

export const createKeywordGroup = (token, { transcriptId, lectureId, studyDate, keywords }) =>
  apiClient('/api/content/keyword-groups', {
    method: 'POST',
    token,
    data: { transcriptId, lectureId, studyDate, keywords },
  });

export const getKeywordGroupsByTranscript = (token, transcriptId) =>
  apiClient(`/api/content/transcripts/${transcriptId}/keyword-groups`, {
    method: 'GET',
    token,
  });

export const addKeywordToGroup = (token, keywordGroupId, { keywordText, definition }) =>
  apiClient(`/api/content/keyword-groups/${keywordGroupId}/keywords`, {
    method: 'POST',
    token,
    data: { keywordText, definition },
  });

export const updateKeywordDefinition = (token, keywordId, { definition }) =>
  apiClient(`/api/content/keywords/${keywordId}`, {
    method: 'PUT',
    token,
    data: { definition },
  });

export const removeKeywordFromGroup = (token, keywordGroupId, keywordId) =>
  apiClient(`/api/content/keyword-groups/${keywordGroupId}/keywords/${keywordId}`, {
    method: 'DELETE',
    token,
  });

// ==================== SUMMARY ENDPOINTS ====================

export const createSummary = (token, { transcriptId, lectureId, subjectId, text, keywordGroupId }) =>
  apiClient('/api/content/summaries', {
    method: 'POST',
    token,
    data: { transcriptId, lectureId, subjectId, text, keywordGroupId },
  });

export const getSummariesBySubject = (token, subjectId) =>
  apiClient(`/api/content/subjects/${subjectId}/summaries`, { method: 'GET', token });

export const getSummaryByTranscript = (token, transcriptId) =>
  apiClient(`/api/content/transcripts/${transcriptId}/summary`, { method: 'GET', token });

export const updateSummaryText = (token, summaryId, { text }) =>
  apiClient(`/api/content/summaries/${summaryId}`, {
    method: 'PUT',
    token,
    data: { text },
  });

export const deleteSummary = (token, summaryId) =>
  apiClient(`/api/content/summaries/${summaryId}`, { method: 'DELETE', token });

