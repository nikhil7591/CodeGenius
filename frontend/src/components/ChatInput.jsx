import React, { useRef, useEffect } from 'react'
import { Send, Zap, CheckCircle, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'

export const ChatInput = ({ query, setQuery, onSend, isLoading, modelStatus }) => {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [query])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div
        className="rounded-lg p-1 transition-all duration-300"
        style={{
          background: '#14142A',
          border: '2.5px solid #C6FF00',
          boxShadow: '4px 4px 0px #08080F',
        }}
      >
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your codebase..."
            rows={1}
            className="flex-1 bg-transparent text-cream placeholder-cream/40 text-sm px-3 py-2.5 resize-none focus:outline-none"
            style={{
              fontFamily: "'Space Mono', monospace",
              minHeight: '40px',
              maxHeight: '120px',
              lineHeight: '1.5',
            }}
          />
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={onSend}
            disabled={isLoading || !query.trim()}
            className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            style={{
              background: (!isLoading && query.trim()) ? '#C6FF00' : '#4A4A6A',
              border: '2px solid #08080F',
              color: (!isLoading && query.trim()) ? '#08080F' : '#F5F0E8',
              boxShadow: (!isLoading && query.trim()) ? '3px 3px 0px #08080F' : '2px 2px 0px #08080F',
            }}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              >
                <Zap size={16} />
              </motion.div>
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 px-1">
        <div className="flex items-center gap-1.5">
          {modelStatus ? (
            <>
              <CheckCircle size={12} className="text-lime" />
              <span className="text-[11px] font-mono font-bold text-cream/60">{modelStatus.toUpperCase()} READY</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-hot-pink" />
              <span className="text-[11px] text-hot-pink font-mono font-bold">BACKEND NOT CONNECTED</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-cream/50 hidden sm:block font-mono">
          SHIFT+ENTER FOR NEW LINE
        </span>
      </div>
    </motion.div>
  )
}
