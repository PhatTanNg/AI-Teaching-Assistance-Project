import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Brain, TrendingUp, ListChecks, Map, FlaskConical, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../context/LanguageContext';

// ── Stopwords to filter out of word-frequency chart ──────────────────────────
const STOPWORDS = new Set([
  // Vietnamese
  'và','của','là','có','trong','được','cho','này','với','các','một','những','không',
  'tôi','bạn','họ','chúng','ta','nó','đó','thì','mà','hay','hoặc','nhưng','vì',
  'khi','nếu','sau','trước','từ','đến','về','tại','bởi','theo','như','lại','đã',
  'sẽ','đang','rất','còn','cũng','đây','đó','đi','ra','vào','lên','xuống',
  // English
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'this','that','these','those','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','can','could','should',
  'may','might','shall','it','its','we','i','you','he','she','they','them',
  'our','your','his','her','their','so','if','as','from','not','also','then',
  'than','more','some','all','any','each','which','what','when','where','how',
]);

// ── Parse Key Concepts from summary markdown ─────────────────────────────────
function parseKeyConcepts(summary) {
  if (!summary) return [];
  // Match the Key Concepts section (vi or en heading)
  const sectionMatch = summary.match(
    /##\s*(?:Khái niệm chính|Key Concepts)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i
  );
  if (!sectionMatch) return [];
  const lines = sectionMatch[1].split('\n');
  const concepts = [];
  for (const line of lines) {
    // Match: - **term**: definition
    const m = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*[:：]\s*(.+)/);
    if (m) concepts.push({ term: m[1].trim(), definition: m[2].trim() });
  }
  return concepts;
}

// ── Parse Formulas section from summary markdown ─────────────────────────────
function parseFormulas(summary) {
  if (!summary) return null;
  const sectionMatch = summary.match(
    /##\s*(?:Công thức|Formulas)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i
  );
  if (!sectionMatch) return null;
  const content = sectionMatch[1].trim();
  return content.length > 0 ? content : null;
}

// ── Parse Review Questions from summary markdown ─────────────────────────────
function parseReviewQuestions(summary) {
  if (!summary) return [];
  const sectionMatch = summary.match(
    /##\s*(?:Câu hỏi ôn tập|Review Questions)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i
  );
  if (!sectionMatch) return [];
  return sectionMatch[1]
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

// ── Parse Summary bullets from summary markdown ───────────────────────────────
function parseSummaryBullets(summary) {
  if (!summary) return [];
  const sectionMatch = summary.match(
    /##\s*(?:Tóm tắt|Summary)[^\n]*\n([\s\S]*?)(?=\n##|\n#|$)/i
  );
  if (!sectionMatch) return [];
  return sectionMatch[1]
    .split('\n')
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

// ── Word frequency from rawTranscript ────────────────────────────────────────
function getWordFrequency(text, limit = 10) {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

// ── Accent color palette cycling ─────────────────────────────────────────────
const CARD_COLORS = [
  { bg: 'rgba(110,231,247,0.08)', border: 'rgba(110,231,247,0.25)', dot: '#6EE7F7' },
  { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', dot: '#A78BFA' },
  { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  dot: '#34D399' },
  { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  dot: '#FBBF24' },
  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', dot: '#F87171' },
];

const BAR_COLORS = ['#6EE7F7','#A78BFA','#34D399','#FBBF24','#F87171','#6EE7F7','#A78BFA','#34D399','#FBBF24','#F87171'];

// ── Custom tooltip for chart ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--card-border)',
      borderRadius: '0.5rem',
      padding: '0.4rem 0.75rem',
      fontSize: '0.8rem',
      color: 'var(--text-primary)',
    }}>
      <span style={{ fontWeight: 600 }}>{payload[0].payload.word}</span>
      {' — '}
      <span style={{ color: 'var(--accent-primary)' }}>{payload[0].value}×</span>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const TranscriptVisualizer = ({ summary, rawTranscript, transcriptId }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const concepts   = useMemo(() => parseKeyConcepts(summary), [summary]);
  const formulas   = useMemo(() => parseFormulas(summary), [summary]);
  const bullets    = useMemo(() => parseSummaryBullets(summary), [summary]);
  const questions  = useMemo(() => parseReviewQuestions(summary), [summary]);
  const wordFreq   = useMemo(() => getWordFrequency(rawTranscript), [rawTranscript]);

  const hasData = concepts.length > 0 || wordFreq.length > 0 || bullets.length > 0 || formulas || questions.length > 0;

  if (!summary && !rawTranscript) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        {t('transcripts.visualizeNoData')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Mind Map shortcut ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(110,231,247,0.05)',
        border: '1px solid rgba(110,231,247,0.15)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Map size={16} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('transcripts.visualizeMindMapHint')}
          </span>
        </div>
        <Button
          size="sm"
          className="btn btn--sm"
          onClick={() => navigate('/mindmap')}
        >
          {t('transcripts.visualizeMindMapBtn')}
        </Button>
      </div>

      {/* ── Key Concepts ── */}
      {concepts.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Brain size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {t('transcripts.visualizeConcepts')}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.6rem',
          }}>
            {concepts.map((c, i) => {
              const col = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <div key={i} style={{
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: col.dot, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.term}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {c.definition}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Formulas ── */}
      {formulas && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FlaskConical size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {t('transcripts.visualizeFormulas')}
            </span>
          </div>
          <div style={{
            background: 'rgba(167,139,250,0.05)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            lineHeight: 1.8,
          }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {formulas}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* ── Word Frequency Chart ── */}
      {wordFreq.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {t('transcripts.visualizeFrequency')}
            </span>
          </div>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--card-border)',
            borderRadius: '0.75rem',
            padding: '1rem',
          }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={wordFreq}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="word"
                  width={90}
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {wordFreq.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Summary Highlights ── */}
      {bullets.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ListChecks size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {t('transcripts.visualizeSummary')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {bullets.map((b, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--card-border)',
                borderRadius: '0.65rem',
                padding: '0.6rem 0.75rem',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: '0.05rem',
                  background: 'rgba(110,231,247,0.12)',
                  border: '1px solid rgba(110,231,247,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-primary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {b}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Review Questions ── */}
      {questions.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <HelpCircle size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {t('transcripts.visualizeQuestions')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {questions.map((q, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                background: 'rgba(167,139,250,0.05)',
                border: '1px solid rgba(167,139,250,0.15)',
                borderRadius: '0.65rem',
                padding: '0.65rem 0.75rem',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '0.05rem',
                  background: 'rgba(167,139,250,0.12)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-purple)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  Q{i + 1}
                </span>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasData && (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('transcripts.visualizeNoData')}
        </div>
      )}
    </div>
  );
};

export default TranscriptVisualizer;
