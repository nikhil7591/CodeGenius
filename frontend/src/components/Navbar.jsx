import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Database, Clock, Cpu, Layers, RotateCcw, Code2, GitBranch } from 'lucide-react'

export const Navbar = ({ repoName, repoInfo, modelStatus, onReset, onWorkflow }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40"
        style={{
          background: '#0A0A12',
          borderBottom: '3px solid #C6FF00',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: '#C6FF00',
                  border: '2px solid #08080F',
                  boxShadow: '3px 3px 0px #08080F',
                }}
              >
                <Code2 size={20} className="text-black" strokeWidth={2.5} />
              </motion.div>
              <div>
                <h1 className="text-lg md:text-xl font-display font-bold text-cream leading-none">
                  Code<span className="gradient-text">Genius</span>
                </h1>
                <p className="text-[10px] md:text-[11px] text-cream/60 font-mono tracking-widest">
                  AI CODEBASE ASSISTANT
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg" style={{
                background: '#14142A',
                border: '2px solid #08080F',
                boxShadow: '2px 2px 0px #08080F',
              }}>
                <div className={`status-dot ${modelStatus ? 'status-dot-active' : 'status-dot-inactive'}`} />
                <span className="text-xs font-mono font-bold text-cream">
                  {modelStatus ? `${modelStatus.toUpperCase()}` : 'OFFLINE'}
                </span>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg transition-all duration-200"
                style={{
                  background: '#14142A',
                  border: '2px solid #08080F',
                  color: '#C6FF00',
                  boxShadow: '2px 2px 0px #08080F',
                }}
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
              className="md:hidden fixed left-0 top-0 z-40 w-72 h-full p-5 pt-20 overflow-y-auto scrollbar-thin"
              style={{
                background: '#0F0F1E',
                borderRight: '2.5px solid #08080F',
              }}
            >
              <SidebarContent repoName={repoName} repoInfo={repoInfo} modelStatus={modelStatus} onReset={onReset} onWorkflow={onWorkflow} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="hidden md:block fixed left-0 top-[4.5rem] w-64 h-[calc(100vh-4.5rem)] p-5 overflow-y-auto scrollbar-thin z-20"
        style={{
          background: '#0F0F1E',
          borderRight: '2.5px solid #08080F',
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
      <div className="cartoon-card p-4" style={{ background: '#14142A' }}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-lime" />
          <span className="section-label">MODEL STATUS</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`status-dot ${modelStatus ? 'status-dot-active' : 'status-dot-inactive'}`} />
          <span className="text-sm font-bold text-cream font-mono">
            {modelStatus ? `${modelStatus.toUpperCase()} ACTIVE` : 'NO MODEL CONNECTED'}
          </span>
        </div>
        {!modelStatus && (
          <p className="text-[11px] text-cream/50 mt-2 leading-relaxed font-mono">
            Configure Groq API key or start Ollama to enable AI analysis.
          </p>
        )}
      </div>

      {repoName && repoInfo ? (
        <>
          <div className="cartoon-card p-4" style={{ background: '#14142A' }}>
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-amber-glow" />
              <span className="section-label">REPOSITORY</span>
            </div>
            <p className="text-sm font-bold text-cream break-all leading-snug mb-4 font-mono">{repoName}</p>

            {repoInfo.info && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-cream/60" />
                  <span className="text-xs text-cream/70 font-mono">Files Indexed</span>
                </div>
                <span className="text-xs font-bold text-lime tabular-nums font-mono">{repoInfo.info.file_count}</span>
              </div>
            )}
          </div>

          {/* Workflow button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onWorkflow}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 font-display tracking-widest"
            style={{
              background: '#C6FF00',
              border: '2px solid #08080F',
              color: '#08080F',
              boxShadow: '3px 3px 0px #08080F',
            }}
          >
            <GitBranch size={13} />
            VIEW WORKFLOW
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 font-display tracking-widest"
            style={{
              background: '#FF2E7E',
              border: '2px solid #08080F',
              color: '#F5F0E8',
              boxShadow: '3px 3px 0px #08080F',
            }}
          >
            <RotateCcw size={13} />
            LOAD DIFFERENT REPO
          </motion.button>
        </>
      ) : (
        <div className="cartoon-card p-5 text-center" style={{ background: '#14142A' }}>
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Clock size={28} className="mx-auto text-cream/40 mb-3" />
          </motion.div>
          <p className="text-sm font-bold text-cream font-mono">NO REPOSITORY LOADED</p>
          <p className="text-xs text-cream/50 mt-1.5 leading-relaxed font-mono">Upload a ZIP file to get started</p>
        </div>
      )}

      <div className="pt-3" style={{ borderTop: '2px solid #08080F' }}>
        <p className="text-[10px] text-cream/40 text-center leading-relaxed font-mono">
          CodeGenius v1.0 • RAG + LLM
        </p>
      </div>
    </motion.div>
  )
}
