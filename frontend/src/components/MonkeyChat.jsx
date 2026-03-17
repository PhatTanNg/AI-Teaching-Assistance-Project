import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useChatContext } from '../context/ChatContext.jsx';
import { streamChat, getTranscripts } from '../api/client.js';

/* ── Lightweight markdown renderer ── */
function inlineMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1em 0.3em', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.8em' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      <Tag key={key++} style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
        {listItems.map((li, j) => <li key={j}>{inlineMarkdown(li)}</li>)}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    const ulItem  = line.match(/^[-*]\s+(.*)/);
    const olItem  = line.match(/^\d+\.\s+(.*)/);

    if (heading) {
      flushList();
      elements.push(<p key={key++} style={{ fontWeight: 700, margin: '0.3rem 0 0.1rem' }}>{inlineMarkdown(heading[1])}</p>);
    } else if (ulItem) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(ulItem[1]);
    } else if (olItem) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(olItem[1]);
    } else if (line.trim() === '') {
      flushList();
      if (elements.length) elements.push(<div key={key++} style={{ height: '0.35rem' }} />);
    } else {
      flushList();
      elements.push(<p key={key++} style={{ margin: '0.1rem 0' }}>{inlineMarkdown(line)}</p>);
    }
  }
  flushList();
  return elements;
}

export default function MonkeyChat() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { lectureContext } = useChatContext();

  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [isStreaming, setIsStreaming]  = useState(false);
  const [lectures, setLectures]       = useState(null); // null = not fetched yet

  const messagesEndRef    = useRef(null);
  const inputRef          = useRef(null);
  const abortRef          = useRef(null);
  const lecturesFetchRef  = useRef(null); // stores in-flight fetch promise
  const lecturesRef       = useRef(null); // always-current mirror of lectures state

  // Keep ref in sync with state
  useEffect(() => { lecturesRef.current = lectures; }, [lectures]);

  // Fetch all transcripts on first open (library mode)
  const toggleOpen = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && token && lecturesRef.current === null && !lecturesFetchRef.current) {
      lecturesFetchRef.current = getTranscripts(token)
        .then(data => {
          const result = Array.isArray(data) ? data : [];
          setLectures(result);
          return result;
        })
        .catch(err => {
          console.warn('[MonkeyChat] getTranscripts failed:', err?.message);
          setLectures([]);
          return [];
        });
    }
  }, [isOpen, token]);

  // Build compact lecture library string (reads from ref — always fresh)
  const buildLibraryContext = useCallback(() => {
    const lecs = lecturesRef.current;
    if (!lecs?.length) return null;
    const library = lecs
      .slice()
      .sort((a, b) => new Date(b.transcribedAt) - new Date(a.transcribedAt))
      .map((tr, i) => {
        const date = new Date(tr.transcribedAt).toLocaleDateString('vi-VN');
        return `[${i + 1}] "${tr.subject}" — ${date}\n${tr.summary ? `Tóm tắt: ${tr.summary.slice(0, 400)}` : '(chưa có tóm tắt)'}`;
      })
      .join('\n\n');
    return { allLectures: library };
  }, []);

  // Priority: single-lecture from ChatContext > library > null
  const buildChatContext = useCallback(() => {
    if (lectureContext) return lectureContext;
    return buildLibraryContext();
  }, [lectureContext, buildLibraryContext]);

  // Greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = lectureContext?.topic
        ? `Đã tải bài: **${lectureContext.topic}** 📖 Hỏi mình bất cứ điều gì về bài này nhé!`
        : lectures?.length
          ? `Hey! Mình là Kiki 🐒 Mình có ${lectures.length} bài giảng của bạn. Hỏi mình về bất kỳ bài nào nhé!`
          : t('chat.greeting');
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Reset messages when a specific lecture is opened/closed
  useEffect(() => {
    if (!isOpen) return;
    if (lectureContext) {
      setMessages([{ role: 'assistant', content: `Đã tải bài: **${lectureContext.topic || 'bài giảng'}** 📖 Hỏi mình bất cứ điều gì về bài này nhé!` }]);
    } else if (messages.length > 0 && messages[0]?.content?.startsWith('Đã tải bài:')) {
      const greeting = lectures?.length
        ? `Hey! Mình là Kiki 🐒 Mình có ${lectures.length} bài giảng của bạn. Hỏi mình về bất kỳ bài nào nhé!`
        : t('chat.greeting');
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [lectureContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsStreaming(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      // If transcripts are still loading, wait for them before building context
      if (lecturesRef.current === null && lecturesFetchRef.current) {
        await lecturesFetchRef.current;
      }

      const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
      const chatCtx = buildChatContext();
      const res = await streamChat(token, apiMessages, chatCtx ?? {});

      if (!res.ok) throw new Error('Stream request failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          if (data.startsWith('[ERROR]')) {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' };
              return updated;
            });
            continue;
          }
          try {
            const { text: chunk } = JSON.parse(data);
            if (chunk) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: (updated[updated.length - 1].content ?? '') + chunk,
                };
                return updated;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Could not connect. Please try again.' };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, token, buildChatContext]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* ── FAB button ── */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={isOpen ? 'Close chat' : 'Open Kiki AI chat'}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height, 0px) + 16px)',
          right: '16px',
          zIndex: 200,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: lectureContext ? 'var(--accent-purple)' : 'var(--accent-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: lectureContext
            ? '0 4px 20px rgba(167,139,250,0.4)'
            : '0 4px 20px rgba(110,231,247,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isOpen ? <ChevronDown size={22} color="#0f1117" /> : '🐒'}
      </button>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Kiki AI chat"
          style={{
            position: 'fixed',
            bottom: 'calc(var(--bottom-nav-height, 0px) + 80px)',
            right: '8px',
            left: 'auto',
            width: 'min(360px, calc(100vw - 16px))',
            /* On mobile, cap height so the panel top stays ≥64px from screen top */
            height: 'min(520px, calc(100dvh - var(--bottom-nav-height, 0px) - 140px))',
            minHeight: '280px',
            zIndex: 199,
            borderRadius: '1rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                {t('chat.title')}
              </span>
              {lectureContext?.topic && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(167,139,250,0.15)',
                  color: 'var(--accent-purple)',
                  fontWeight: 500,
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  📖 {lectureContext.topic}
                </span>
              )}
            </div>
            <button type="button" onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', display: 'flex' }}
              aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: m.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  background: m.role === 'user'
                    ? 'var(--accent-primary)'
                    : 'var(--bg-elevated)',
                  color: m.role === 'user' ? '#0f1117' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  whiteSpace: m.role === 'user' ? 'pre-wrap' : 'normal',
                  wordBreak: 'break-word',
                }}>
                  {m.content
                    ? m.role === 'assistant'
                      ? <div style={{ lineHeight: 1.5 }}>{renderMarkdown(m.content)}</div>
                      : m.content
                    : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {t('chat.thinking')}
                      </span>
                    )
                  }
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.625rem',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              disabled={isStreaming}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--card-border)',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.625rem',
                fontSize: '0.85rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                outline: 'none',
                lineHeight: 1.4,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              style={{
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: '0.5rem',
                width: '36px',
                flexShrink: 0,
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isStreaming ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.15s',
              }}
              aria-label={t('chat.send')}
            >
              <Send size={15} color="#0f1117" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
