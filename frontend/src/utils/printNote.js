/**
 * Opens a print-to-PDF window for a transcript note.
 * Uses native browser print dialog — no extra dependencies.
 * KaTeX is loaded via CDN so formulas render correctly in the print window.
 */
export function printNote(transcript) {
  const { subject, rawTranscript, summary, transcribedAt } = transcript;
  const dateStr = transcribedAt
    ? new Date(transcribedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  // Encode summary markdown for safe injection into the window
  const encodedSummary = JSON.stringify(summary || '');
  const encodedRaw = JSON.stringify(rawTranscript || '');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${subject || 'Note'} — AITA</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 13pt;
      line-height: 1.7;
      color: #1a1a2e;
      background: #fff;
      padding: 2.5cm 2.5cm 3cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #6EE7F7;
      padding-bottom: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #0f0f23;
      letter-spacing: -0.02em;
      margin-bottom: 0.25rem;
    }
    .header .meta {
      font-size: 10pt;
      color: #555;
    }
    .badge {
      display: inline-block;
      background: #e8f9fb;
      color: #0e8ca8;
      border: 1px solid #b3e8f2;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 9pt;
      font-weight: 600;
      margin-right: 0.5rem;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f0f23;
      margin: 1.5rem 0 0.6rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid #e5e7eb;
    }
    h3 { font-size: 11.5pt; font-weight: 700; margin: 0.75rem 0 0.3rem; }
    p { margin-bottom: 0.5rem; }
    ul, ol { padding-left: 1.4rem; margin-bottom: 0.5rem; }
    li { margin-bottom: 0.25rem; }
    strong { font-weight: 700; color: #0f0f23; }
    code {
      font-family: 'Courier New', monospace;
      font-size: 10.5pt;
      background: #f3f4f6;
      padding: 1px 5px;
      border-radius: 3px;
    }
    pre code { display: block; padding: 0.75rem; white-space: pre-wrap; }
    .raw-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-size: 10.5pt;
      color: #374151;
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      line-height: 1.6;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="margin-bottom:0.4rem">
      <span class="badge">AITA</span>
      <span class="badge">📅 ${dateStr}</span>
    </div>
    <h1 id="note-title">${subject || 'Note'}</h1>
  </div>

  <div id="summary-content"></div>

  <h2>📝 Nội dung bài giảng / Lecture Transcript</h2>
  <div class="raw-section" id="raw-content"></div>

  <script>
    const summary = ${encodedSummary};
    const raw = ${encodedRaw};

    // Render summary markdown
    if (summary) {
      document.getElementById('summary-content').innerHTML = marked.parse(summary);
    }

    // Set raw transcript
    document.getElementById('raw-content').textContent = raw;

    // Render KaTeX math
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });

    // Auto-print after resources load, then close tab
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
        window.close();
      }, 400);
    });
  <\/script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return; // popup blocked
  printWindow.document.write(html);
  printWindow.document.close();
}
