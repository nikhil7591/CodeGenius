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
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.82em',
          padding: '0.15em 0.45em',
          borderRadius: '5px',
          background: 'rgba(198, 255, 0, 0.1)',
          color: '#C6FF00',
          border: '1px solid rgba(198, 255, 0, 0.3)',
          fontWeight: 'bold',
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
        background: '#08080F',
        borderRadius: '5px 5px 0 0',
        border: '2px solid #08080F',
        borderBottom: 'none',
        fontFamily: "'Space Mono', monospace",
      }}>
        <span style={{ fontSize: '11px', color: '#C6FF00', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: copied ? '#C6FF00' : '#FF9F0A',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 'bold',
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
        background: '#0A0A12',
        borderRadius: '0 0 5px 5px',
        border: '2px solid #08080F',
        overflowX: 'auto',
        fontSize: '13px',
        lineHeight: '1.65',
        fontFamily: "'Space Mono', monospace",
      }}>
        <code style={{ color: '#F5F0E8', background: 'none' }} {...props}>
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
    <h1 style={{ fontSize: '1.2em', fontWeight: 700, margin: '14px 0 8px', color: '#C6FF00', borderBottom: '2px solid #C6FF00', paddingBottom: '6px', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: '1.1em', fontWeight: 700, margin: '12px 0 6px', color: '#FF9F0A', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: '1em', fontWeight: 600, margin: '10px 0 5px', color: '#A0F0FF', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ margin: '6px 0', lineHeight: '1.75', color: '#F5F0E8' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '6px 0 6px 4px', paddingLeft: '18px', listStyleType: 'none' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '6px 0 6px 4px', paddingLeft: '20px', color: '#F5F0E8' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: '4px 0', color: '#F5F0E8', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#C6FF00', marginTop: '2px', flexShrink: 0, fontSize: '12px', fontWeight: 'bold' }}>▸</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: '#FFFFFF', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: '#FF9F0A', fontStyle: 'italic', fontFamily: "'Space Mono', monospace" }}>{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '3px solid #FF9F0A',
      margin: '8px 0',
      padding: '6px 12px',
      background: 'rgba(255, 159, 10, 0.08)',
      borderRadius: '0 8px 8px 0',
      color: '#F5F0E8',
      fontFamily: "'Space Mono', monospace",
    }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: '13px', color: '#F5F0E8',
        fontFamily: "'Space Mono', monospace",
      }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '7px 12px', textAlign: 'left',
      background: 'rgba(198, 255, 0, 0.1)',
      borderBottom: '2px solid #C6FF00',
      color: '#C6FF00', fontWeight: 700, fontSize: '12px',
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '7px 12px',
      borderBottom: '1px solid rgba(198, 255, 0, 0.2)',
    }}>
      {children}
    </td>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '2px solid #C6FF00', margin: '10px 0' }} />
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: '#A0F0FF', textDecoration: 'underline', textDecorationColor: 'rgba(160, 240, 255, 0.4)', fontWeight: 'bold' }}>
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
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 font-bold ${isUser
        ? 'bg-lime text-ink'
        : 'bg-panel text-lime border-2 border-ink'
        }`}>
        {isUser ? (
          <User size={14} />
        ) : (
          <Bot size={14} />
        )}
      </div>

      <div className={`max-w-[85%] md:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`text-[11px] font-mono font-bold mb-1.5 px-1 ${isUser ? 'text-right text-cream/50' : 'text-cream/50'}`}>
          {isUser ? 'YOU' : message.model || 'CodeGenius'}
        </div>

        <div
          className={`rounded-lg px-4 py-3 font-mono ${isUser
            ? 'rounded-tr-none text-ink font-bold'
            : 'rounded-tl-none text-cream'
            }`}
          style={isUser ? {
            background: '#C6FF00',
            border: '2.5px solid #08080F',
            boxShadow: '4px 4px 0px #08080F',
            position: 'relative',
          } : {
            background: '#14142A',
            border: '2.5px solid #FF9F0A',
            boxShadow: '4px 4px 0px #08080F',
            position: 'relative',
          }}
        >
          {/* Speech bubble tail */}
          <div
            style={{
              position: 'absolute',
              bottom: '-12px',
              [isUser ? 'right' : 'left']: '12px',
              width: '0',
              height: '0',
              borderLeft: isUser ? '8px solid transparent' : '0',
              borderRight: isUser ? '0' : '8px solid transparent',
              borderTop: isUser ? '12px solid #C6FF00' : '12px solid #14142A',
              borderBottom: '0',
              filter: isUser ? 'drop-shadow(3px 3px 0px #08080F)' : 'drop-shadow(3px 3px 0px #08080F)',
            }}
          />

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
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 159, 10, 0.3)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-amber-glow" />
                <span className="text-[11px] font-bold text-amber-glow font-display">
                  {message.sources.length} SOURCE{message.sources.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((source, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 + 0.2, duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-cream/70 rounded-lg transition-all duration-200 font-mono"
                    style={{
                      background: 'rgba(8, 8, 15, 0.4)',
                      border: '1px solid rgba(198, 255, 0, 0.2)',
                      padding: '4px 8px',
                    }}
                  >
                    <FileCode size={11} className="text-cream/50" />
                    <span className="font-bold">{source.filename}</span>
                    {source.relevance != null && (
                      <span className="text-lime/60 text-[10px]">
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
            <div className="w-1 h-1 rounded-full bg-amber-glow/60" />
            <span className="text-[10px] text-cream/50 font-mono">{message.model_name}</span>
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
      <div className="shrink-0 w-8 h-8 rounded-lg bg-panel text-lime border-2 border-ink flex items-center justify-center font-bold">
        <Bot size={14} />
      </div>
      <div>
        <div className="text-[11px] font-mono font-bold mb-1.5 px-1 text-cream/50">CodeGenius</div>
        <div className="rounded-lg rounded-tl-none px-5 py-3.5 inline-flex gap-1.5" style={{
          background: '#14142A',
          border: '2.5px solid #FF9F0A',
          boxShadow: '4px 4px 0px #08080F',
        }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12, ease: 'easeInOut' }}
              className="w-2 h-2 bg-lime rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
