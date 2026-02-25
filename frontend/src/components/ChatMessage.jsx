import React, { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, FileCode, Bot, User, Copy, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------
const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')
  const lang = /language-(\w+)/.exec(className || '')?.[1] || ''

  if (inline) {
    return (
      <code
        style={{
          fontFamily: 'monospace',
          fontSize: '0.82em',
          padding: '0.15em 0.45em',
          borderRadius: '5px',
          background: 'rgba(0, 212, 255, 0.1)',
          color: '#00D4FF',
          border: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      >
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative', margin: '10px 0' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '10px 10px 0 0',
        border: '1px solid rgba(42, 42, 85, 0.5)',
        borderBottom: 'none',
      }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: copied ? '#06FDD8' : '#6b7280',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code body */}
      <pre style={{
        margin: 0,
        padding: '14px 16px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '0 0 10px 10px',
        border: '1px solid rgba(42, 42, 85, 0.5)',
        overflowX: 'auto',
        fontSize: '13px',
        lineHeight: '1.65',
        fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
      }}>
        <code style={{ color: '#e2e8f0', background: 'none' }} {...props}>
          {code}
        </code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Markdown components map — styled to match the dark theme
// ---------------------------------------------------------------------------
const markdownComponents = {
  code: CodeBlock,
  h1: ({ children }) => (
    <h1 style={{ fontSize: '1.2em', fontWeight: 700, margin: '14px 0 8px', color: '#00D4FF', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '6px' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '1.1em', fontWeight: 700, margin: '12px 0 6px', color: '#9D4EDD' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '1em', fontWeight: 600, margin: '10px 0 5px', color: '#06FDD8' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ margin: '6px 0', lineHeight: '1.75', color: '#cbd5e1' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '6px 0 6px 4px', paddingLeft: '18px', listStyleType: 'none' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '6px 0 6px 4px', paddingLeft: '20px', color: '#cbd5e1' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: '4px 0', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#00D4FF', marginTop: '2px', flexShrink: 0, fontSize: '10px' }}>▸</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: '#ffffff', fontWeight: 700 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: '#c4b5fd', fontStyle: 'italic' }}>{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '3px solid #9D4EDD',
      margin: '8px 0',
      padding: '6px 12px',
      background: 'rgba(157, 78, 221, 0.07)',
      borderRadius: '0 8px 8px 0',
      color: '#a3acbc',
    }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: '13px', color: '#cbd5e1',
      }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '7px 12px', textAlign: 'left',
      background: 'rgba(0, 212, 255, 0.1)',
      borderBottom: '1px solid rgba(0,212,255,0.25)',
      color: '#00D4FF', fontWeight: 600, fontSize: '12px',
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '7px 12px',
      borderBottom: '1px solid rgba(42, 42, 85, 0.4)',
    }}>
      {children}
    </td>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid rgba(42,42,85,0.5)', margin: '10px 0' }} />
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: '#06FDD8', textDecoration: 'underline', textDecorationColor: 'rgba(6,253,216,0.4)' }}>
      {children}
    </a>
  ),
}

// ---------------------------------------------------------------------------
// Main ChatMessage component
// ---------------------------------------------------------------------------
export const ChatMessage = ({ message, isUser }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-5`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${isUser
        ? 'bg-gradient-to-br from-neon-blue to-accent-indigo'
        : 'bg-dark-elevated border border-dark-border/40'
        }`}>
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-neon-blue" />
        )}
      </div>

      <div className={`max-w-[85%] md:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`text-[11px] font-medium mb-1.5 px-1 ${isUser ? 'text-right text-surface-400' : 'text-surface-400'}`}>
          {isUser ? 'You' : message.model || 'CodeGenius'}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 ${isUser
            ? 'rounded-tr-md text-white'
            : 'rounded-tl-md glass-card'
            }`}
          style={isUser ? {
            background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 50%, #9D4EDD 100%)',
            backgroundSize: '200% 200%',
          } : undefined}
        >
          {isUser ? (
            /* User messages — plain text */
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.text}
            </p>
          ) : (
            /* Bot messages — full markdown */
            <div className="markdown-body text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-border/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-neon-purple" />
                <span className="text-[11px] font-semibold text-neon-purple">
                  {message.sources.length} Source{message.sources.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((source, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 + 0.2, duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-surface-300
                               bg-dark-bg/50 px-2.5 py-1 rounded-lg border border-dark-border/30
                               hover:border-neon-blue/30 hover:text-neon-blue transition-all duration-200"
                  >
                    <FileCode size={11} className="text-surface-500" />
                    <span className="font-medium">{source.filename}</span>
                    {source.relevance != null && (
                      <span className="text-neon-blue/60 font-mono text-[10px]">
                        {(source.relevance * 100).toFixed(0)}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isUser && message.model_name && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <div className="w-1 h-1 rounded-full bg-neon-purple/60" />
            <span className="text-[10px] text-surface-500 font-mono">{message.model_name}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 mb-5"
    >
      <div className="shrink-0 w-8 h-8 rounded-xl bg-dark-elevated border border-dark-border/40 flex items-center justify-center">
        <Bot size={14} className="text-neon-blue" />
      </div>
      <div>
        <div className="text-[11px] font-medium mb-1.5 px-1 text-surface-400">CodeGenius</div>
        <div className="glass-card rounded-2xl rounded-tl-md px-5 py-3.5 inline-flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 bg-neon-blue rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
