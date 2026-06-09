import { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { Send, Bot, User, RefreshCw, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'How am I doing with my spending this month?',
  'What can I do to save more money?',
  'Explain the difference between a Cash ISA and Stocks & Shares ISA',
  'Am I spending too much on dining out?',
  'How can I build an emergency fund?',
  'What does my savings rate mean?',
];

function formatText(text: string) {
  // Basic markdown-ish formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• /gm, '• ')
    .replace(/\n/g, '<br/>');
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm FinSmart AI, your personal finance assistant 👋\n\nI can see your real financial data and help you with budgeting, saving, UK financial products, and anything money-related. What would you like to talk about?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send history (exclude the first greeting)
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/chat', { message: text, history });
      const assistantMsg: Message = { role: 'assistant', content: res.data.reply, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get response. Please try again.');
      setMessages(prev => prev.filter(m => m !== userMsg));
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! I'm here to help with any finance questions. What's on your mind?",
      timestamp: new Date(),
    }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>FinSmart AI</h1>
            <p style={{ margin: 0, fontSize: 13 }}>Powered by Gemini · Knows your financial data</p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={clearChat} title="Clear chat">
          <RefreshCw size={14} /> Clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'assistant' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'assistant'
                ? <Bot size={18} color="white" />
                : <User size={18} color="#64748b" />}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? 'var(--primary)' : 'white',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              padding: '0.875rem 1.1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              <div dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: '0.35rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '0.875rem 1.1rem', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (shown when only greeting visible) */}
      {messages.length === 1 && (
        <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>SUGGESTED QUESTIONS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="btn btn-secondary btn-sm" style={{ fontSize: 12, borderRadius: 999 }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ flexShrink: 0, marginBottom: '0.5rem' }}>{error}</div>}

      {/* Input */}
      <div style={{ flexShrink: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your finances..."
          style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 14, lineHeight: 1.5, background: 'transparent', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto' }}
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{ width: 38, height: 38, borderRadius: 10, background: input.trim() && !loading ? 'var(--primary)' : 'var(--border)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
        >
          <Send size={16} color={input.trim() && !loading ? 'white' : '#94a3b8'} />
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem', flexShrink: 0 }}>Press Enter to send · Shift+Enter for new line</p>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
