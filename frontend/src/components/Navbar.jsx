import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Database, Clock, Cpu, Layers, RotateCcw, Code2, Sparkles, GitBranch } from 'lucide-react'

export const Navbar = ({ repoName, repoInfo, modelStatus, onReset, onWorkflow }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40 border-b border-dark-border/30"
        style={{
          background: 'linear-gradient(180deg, rgba(8, 8, 15, 0.95) 0%, rgba(8, 8, 15, 0.85) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #06FDD8 100%)',
                  backgroundSize: '200% 200%',
                }}
              >
                <Code2 size={20} className="text-white relative z-10" strokeWidth={2.5} />
                <motion.div
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, #00D4FF, #9D4EDD, #06FDD8)',
                    backgroundSize: '200% 200%',
                  }}
                />
              </motion.div>
              <div>
                <h1 className="text-lg md:text-xl font-display font-bold text-white leading-none">
                  Code<span className="gradient-text-static">Genius</span>
                </h1>
                <p className="text-[10px] md:text-[11px] text-surface-400 font-medium tracking-wide">
                  AI Codebase Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-secondary/60 border border-dark-border/30">
                <div className={`status-dot ${modelStatus ? 'status-dot-active' : 'status-dot-inactive'}`} />
                <span className="text-xs font-medium text-surface-300">
                  {modelStatus ? `${modelStatus}` : 'Offline'}
                </span>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg text-surface-300 hover:text-white hover:bg-dark-tertiary/50 transition-all duration-200"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed left-0 top-0 z-40 w-72 h-full p-5 pt-20 overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, rgba(17, 17, 34, 0.98) 0%, rgba(8, 8, 15, 0.98) 100%)',
                backdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(42, 42, 85, 0.3)',
              }}
            >
              <SidebarContent repoName={repoName} repoInfo={repoInfo} modelStatus={modelStatus} onReset={onReset} onWorkflow={onWorkflow} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="hidden md:block fixed left-0 top-[4.5rem] w-64 h-[calc(100vh-4.5rem)] p-5 overflow-y-auto scrollbar-thin border-r border-dark-border/20 z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(8, 8, 15, 0.6) 0%, rgba(8, 8, 15, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <SidebarContent repoName={repoName} repoInfo={repoInfo} modelStatus={modelStatus} onReset={onReset} onWorkflow={onWorkflow} />
      </div>
    </>
  )
}

const SidebarContent = ({ repoName, repoInfo, modelStatus, onReset, onWorkflow }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="space-y-5"
    >
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-neon-blue" />
          <span className="section-label">Model Status</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`status-dot ${modelStatus ? 'status-dot-active' : 'status-dot-inactive'}`} />
          <span className="text-sm font-medium text-white">
            {modelStatus ? `${modelStatus} Active` : 'No Model Connected'}
          </span>
        </div>
        {!modelStatus && (
          <p className="text-[11px] text-surface-400 mt-2 leading-relaxed">
            Configure Groq API key or start Ollama to enable AI analysis.
          </p>
        )}
      </div>

      {repoName && repoInfo ? (
        <>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-neon-purple" />
              <span className="section-label">Repository</span>
            </div>
            <p className="text-sm font-semibold text-white break-all leading-snug mb-4">{repoName}</p>

            {repoInfo.info && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-surface-400" />
                    <span className="text-xs text-surface-300">Files Indexed</span>
                  </div>
                  <span className="text-xs font-semibold text-neon-blue tabular-nums">{repoInfo.info.file_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-surface-400" />
                    <span className="text-xs text-surface-300">Code Chunks</span>
                  </div>
                  <span className="text-xs font-semibold text-neon-purple tabular-nums">{repoInfo.info.chunk_count}</span>
                </div>
              </div>
            )}
          </div>

          {/* Workflow button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onWorkflow}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold
                       transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(6,253,216,0.1), rgba(157,78,221,0.1))',
              border: '1.5px solid rgba(6,253,216,0.3)',
              color: '#06FDD8',
              boxShadow: '0 0 12px rgba(6,253,216,0.1)',
            }}
          >
            <GitBranch size={13} />
            View Workflow
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold
                       text-red-400/80 bg-red-500/5 border border-red-500/15
                       hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400
                       transition-all duration-300"
          >
            <RotateCcw size={13} />
            Load Different Repo
          </motion.button>
        </>
      ) : (
        <div className="glass-card p-5 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Clock size={28} className="mx-auto text-surface-500 mb-3" />
          </motion.div>
          <p className="text-sm font-medium text-surface-300">No repository loaded</p>
          <p className="text-xs text-surface-500 mt-1.5 leading-relaxed">Upload a ZIP file to get started</p>
        </div>
      )}

      <div className="pt-3 border-t border-dark-border/20">
        <p className="text-[10px] text-surface-500 text-center leading-relaxed">
          CodeGenius v1.0 • RAG + LLM
        </p>
      </div>
    </motion.div>
  )
}
