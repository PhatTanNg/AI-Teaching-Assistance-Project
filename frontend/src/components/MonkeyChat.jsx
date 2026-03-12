import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { streamChat } from '../api/client.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001';

export default function MonkeyChat({ context = null }) {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);

  // Greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = context
        ? t('chat.contextLoaded')
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

  // Reset messages when context changes (new lecture opened)
  useEffect(() => {
    if (context) {
      setMessages([{ role: 'assistant', content: t('chat.contextLoaded') }]);
    }
  }, [context]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsStreaming(true);

    // Placeholder for streaming response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
      const res = await streamChat(token, apiMessages, context ?? {});

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
  }, [input, isStreaming, messages, token, context]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* ── FAB button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label={isOpen ? 'Close chat' : 'Open Kiki AI chat'}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height, 0px) + 20px)',
          right: '20px',
          zIndex: 200,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 20px rgba(110,231,247,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
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
            bottom: 'calc(var(--bottom-nav-height, 0px) + 84px)',
            right: '16px',
            width: 'min(360px, calc(100vw - 32px))',
            height: 'min(480px, calc(100vh - 140px))',
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
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {t('chat.title')}
            </span>
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
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content || (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {t('chat.thinking')}
                    </span>
                  )}
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
