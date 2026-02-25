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
        className="rounded-2xl p-1 transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(157, 78, 221, 0.05) 100%)',
          border: '1px solid rgba(42, 42, 85, 0.4)',
          backdropFilter: 'blur(16px)',
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
            className="flex-1 bg-transparent text-white text-sm placeholder-surface-500
                       px-3 py-2.5 resize-none focus:outline-none
                       min-h-[40px] max-h-[120px] leading-relaxed"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={onSend}
            disabled={isLoading || !query.trim()}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: (!isLoading && query.trim())
                ? 'linear-gradient(135deg, #00D4FF 0%, #9D4EDD 100%)'
                : 'rgba(42, 42, 85, 0.5)',
            }}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              >
                <Zap size={16} className="text-white/80" />
              </motion.div>
            ) : (
              <Send size={16} className="text-white" />
            )}
          </motion.button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 px-1">
        <div className="flex items-center gap-1.5">
          {modelStatus ? (
            <>
              <CheckCircle size={12} className="text-neon-cyan" />
              <span className="text-[11px] font-medium text-surface-400">{modelStatus} ready</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-red-400/70" />
              <span className="text-[11px] text-red-400/70">Backend not connected</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-surface-500 hidden sm:block">
          Shift+Enter for new line
        </span>
      </div>
    </motion.div>
  )
}
